import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Calendar integrations require SESSION_SECRET.");
  return createHash("sha256").update(`calendar-v1:${secret}`).digest();
}
export function seal(value: string): string {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function open(value: string): string {
  const data = Buffer.from(value, "base64url"); const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}
export function tokenHash(token: string): string { return createHash("sha256").update(`calendar-token:${token}`).digest("hex"); }
export function sameHash(a: string, b: string): boolean { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); }