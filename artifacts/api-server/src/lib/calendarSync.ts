import { lookup } from "node:dns/promises";
import https from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import net from "node:net";
import ical, { type VEvent } from "node-ical";

export type BusyRange = { sourceKey: string; startsAt: Date; endsAt: Date };

function ipv6Groups(address: string): number[] | null {
  let value = address.toLowerCase().split("%", 1)[0];
  if (net.isIP(value) !== 6) return null;
  if (value.includes(".")) {
    const split = value.lastIndexOf(":");
    const ipv4 = value.slice(split + 1);
    if (net.isIP(ipv4) !== 4) return null;
    const bytes = ipv4.split(".").map(Number);
    value = `${value.slice(0, split)}:${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const parseHalf = (half: string) =>
    half ? half.split(":").map((part) => parseInt(part, 16)) : [];
  const left = parseHalf(halves[0]);
  const right = parseHalf(halves[1] ?? "");
  const omitted = halves.length === 2 ? 8 - left.length - right.length : 0;
  const groups = [...left, ...Array(omitted).fill(0), ...right];
  return groups.length === 8 && groups.every((group) => group >= 0 && group <= 0xffff)
    ? groups
    : null;
}

function mappedIpv4(address: string): string | null {
  const groups = ipv6Groups(address);
  if (!groups) return null;
  const mapped =
    groups.slice(0, 5).every((group) => group === 0) &&
    groups[5] === 0xffff;
  const compatible = groups.slice(0, 6).every((group) => group === 0);
  const translated =
    groups.slice(0, 4).every((group) => group === 0) &&
    groups[4] === 0xffff &&
    groups[5] === 0;
  if (!mapped && !compatible && !translated) return null;
  const value = (groups[6] << 16) | groups[7];
  return [
    value >>> 24,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

function ipv6Value(groups: number[]): bigint {
  return groups.reduce((value, group) => (value << 16n) | BigInt(group), 0n);
}

function inIpv6Cidr(value: bigint, base: string, bits: number): boolean {
  const baseGroups = ipv6Groups(base);
  if (!baseGroups) return false;
  const shift = BigInt(128 - bits);
  return value >> shift === ipv6Value(baseGroups) >> shift;
}

/** True only for globally routable addresses. */
export function isPublicAddress(address: string): boolean {
  const mapped = mappedIpv4(address);
  if (mapped) return isPublicAddress(mapped);
  if (net.isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  const groups = ipv6Groups(address);
  if (!groups) return false;
  const value = ipv6Value(groups);
  return ![
    ["::", 128],
    ["::1", 128],
    ["64:ff9b::", 96],
    ["64:ff9b:1::", 48],
    ["100::", 64],
    ["2001::", 23],
    ["2001:db8::", 32],
    ["2002::", 16],
    ["3fff::", 20],
    ["fc00::", 7],
    ["fe80::", 10],
    ["fec0::", 10],
    ["ff00::", 8],
  ].some(([base, bits]) => inIpv6Cidr(value, String(base), Number(bits)));
}

async function pinnedTarget(
  raw: string,
): Promise<{ url: URL; address: string; family: 4 | 6 }> {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Calendar URL must be HTTPS without embedded credentials.");
  }
  const resolved = await lookup(url.hostname, { all: true, verbatim: true });
  const selected = resolved.find((entry) => isPublicAddress(entry.address));
  if (!selected || resolved.some((entry) => !isPublicAddress(entry.address))) {
    throw new Error("Calendar host has a non-public DNS address.");
  }
  return { url, address: selected.address, family: selected.family as 4 | 6 };
}

async function pinnedRequest(
  raw: string,
  headers: Record<string, string>,
): Promise<{
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}> {
  const target = await pinnedTarget(raw);
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        protocol: "https:",
        hostname: target.url.hostname,
        servername: target.url.hostname,
        port: target.url.port || 443,
        path: `${target.url.pathname}${target.url.search}`,
        method: "GET",
        headers,
        lookup: (_hostname, _options, callback) =>
          callback(null, target.address, target.family),
        timeout: 12_000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 2_000_000) {
            request.destroy(new Error("Calendar exceeds 2 MB."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    request.on("timeout", () =>
      request.destroy(new Error("Calendar request timed out.")),
    );
    request.on("error", reject);
    request.end();
  });
}

/** node-ical handles TZID/VTIMEZONE, EXDATE, RDATE and recurrence overrides. */
export function parseIcsBusy(
  text: string,
  horizonStart: Date,
  horizonEnd: Date,
): BusyRange[] {
  let calendar;
  try {
    calendar = ical.sync.parseICS(text);
  } catch {
    throw new Error(
      "Calendar data is malformed or has an unsupported timezone.",
    );
  }
  const ranges: BusyRange[] = [];
  for (const component of Object.values(calendar)) {
    if (!component || component.type !== "VEVENT") continue;
    const event = component as VEvent;
    if (event.status === "CANCELLED" || event.transparency === "TRANSPARENT")
      continue;
    const instances =
      event.rrule || event.recurrences || event.exdate || event.rdate
        ? ical.expandRecurringEvent(event, {
            from: horizonStart,
            to: horizonEnd,
            includeOverrides: true,
            excludeExdates: true,
            expandOngoing: true,
          })
        : event.start && event.end
          ? [{ start: event.start, end: event.end, event }]
          : [];
    for (const instance of instances.slice(0, 5000 - ranges.length)) {
      if (instance.event.status === "CANCELLED") continue;
      const startsAt = new Date(instance.start);
      const endsAt = new Date(instance.end);
      if (
        Number.isNaN(startsAt.getTime()) ||
        Number.isNaN(endsAt.getTime()) ||
        endsAt <= startsAt
      ) {
        throw new Error("Calendar event has an invalid or ambiguous time.");
      }
      if (startsAt < horizonEnd && endsAt > horizonStart) {
        ranges.push({
          sourceKey: `ics:${event.uid}:${startsAt.toISOString()}`,
          startsAt,
          endsAt,
        });
      }
    }
    if (ranges.length >= 5000)
      throw new Error("Calendar has too many occurrences.");
  }
  return ranges;
}

export async function fetchIcs(
  url: string,
  cursor: Record<string, unknown>,
): Promise<{
  ranges: BusyRange[];
  cursor: Record<string, string>;
  notModified: boolean;
}> {
  let target = url;
  const headers: Record<string, string> = {
    Accept: "text/calendar, text/plain;q=0.5",
  };
  if (typeof cursor.etag === "string") headers["If-None-Match"] = cursor.etag;
  if (typeof cursor.lastModified === "string")
    headers["If-Modified-Since"] = cursor.lastModified;
  for (let redirect = 0; redirect <= 3; redirect++) {
    const response = await pinnedRequest(target, headers);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.location;
      if (!location || redirect === 3)
        throw new Error("Too many calendar redirects.");
      target = new URL(location, target).toString();
      continue;
    }
    if (response.status === 304)
      return {
        ranges: [],
        cursor: cursor as Record<string, string>,
        notModified: true,
      };
    if (response.status < 200 || response.status >= 300)
      throw new Error(`Calendar fetch failed (${response.status}).`);
    const type = String(response.headers["content-type"] ?? "");
    if (!/text\/(calendar|plain)|application\/(ics|octet-stream)/i.test(type))
      throw new Error("Calendar response is not ICS.");
    const now = new Date();
    return {
      ranges: parseIcsBusy(
        response.body.toString("utf8"),
        now,
        new Date(now.getTime() + 180 * 86_400_000),
      ),
      cursor: {
        etag: String(response.headers.etag ?? ""),
        lastModified: String(response.headers["last-modified"] ?? ""),
      },
      notModified: false,
    };
  }
  throw new Error("Calendar redirect failed.");
}
