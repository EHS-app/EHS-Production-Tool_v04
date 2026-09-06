import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBriefEmailContent,
  dispatchBriefRequestEmails,
  type BriefEmailDependencies,
  type BriefEmailProfile,
} from "./briefEmail";

function dependencies(
  profiles: BriefEmailProfile[],
  deliveries: Array<{
    to: string;
    subject: string;
    textBody: string;
    htmlBody?: string;
  }> = [],
): BriefEmailDependencies {
  return {
    lookupProducerName: async () => "Test Producer",
    loadProfiles: async () => profiles,
    loadBriefSummary: async () => ({
      projectName: "Nobelkonserten",
      venue: "Oslo Spektrum",
      startDate: "2026-12-10",
      endDate: "2026-12-12",
      rolesByUserId: { "freelancer-secret-id": ["Lydtekniker"] },
    }),
    send: async (message) => {
      deliveries.push({
        to: message.to,
        subject: message.subject,
        textBody: message.textBody,
        htmlBody: message.htmlBody,
      });
      return { ok: true, id: `message-${deliveries.length}` };
    },
  };
}

const baseArgs = {
  briefId: "project-brief-123",
  ownerUserId: "producer-1",
};

describe("brief email dispatch", () => {
  it("consolidates multiple role assignments into one email per freelancer", async () => {
    const deliveries: Array<{ to: string; subject: string; textBody: string; htmlBody?: string }> = [];
    const result = await dispatchBriefRequestEmails(
      {
        ...baseArgs,
        newRecipientUserIds: ["freelancer-1", "freelancer-1"],
      },
      dependencies(
        [{ userId: "freelancer-1", email: "crew@example.com", fullName: "Crew Member" }],
        deliveries,
      ),
    );

    assert.equal(deliveries.length, 1);
    assert.deepEqual(result, {
      sent: 1,
      skipped: 0,
      outcomes: [{ freelancerUserId: "freelancer-1", sent: true }],
    });
  });

  it("skips missing and blank-email profiles with exact reporting", async () => {
    const deliveries: Array<{ to: string; subject: string; textBody: string; htmlBody?: string }> = [];
    const result = await dispatchBriefRequestEmails(
      {
        ...baseArgs,
        newRecipientUserIds: [
          "valid",
          "blank-email",
          "invalid-email",
          "missing-profile",
        ],
      },
      dependencies(
        [
          { userId: "valid", email: "valid@example.com", fullName: "Valid Crew" },
          { userId: "blank-email", email: "   ", fullName: "No Email" },
          { userId: "invalid-email", email: "not-an-email", fullName: "Bad Email" },
        ],
        deliveries,
      ),
    );

    assert.equal(deliveries.length, 1);
    assert.equal(result.sent, 1);
    assert.equal(result.skipped, 3);
    assert.deepEqual(
      result.outcomes.sort((a, b) =>
        a.freelancerUserId.localeCompare(b.freelancerUserId),
      ),
      [
        { freelancerUserId: "blank-email", sent: false },
        { freelancerUserId: "invalid-email", sent: false },
        { freelancerUserId: "missing-profile", sent: false },
        { freelancerUserId: "valid", sent: true },
      ],
    );
  });

  it("sends a Norwegian summary card and authenticated project brief link", async () => {
    const deliveries: Array<{ to: string; subject: string; textBody: string; htmlBody?: string }> = [];
    await dispatchBriefRequestEmails(
      { ...baseArgs, newRecipientUserIds: ["freelancer-secret-id"] },
      dependencies(
        [{ userId: "freelancer-secret-id", email: "crew@example.com", fullName: "Crew" }],
        deliveries,
      ),
    );

    const body = deliveries[0]?.textBody ?? "";
    const link = body
      .split("\n")
      .find((line) => line.startsWith("https://app.ehs.no/"));
    assert.ok(link);
    const url = new URL(link);
    assert.equal(url.searchParams.get("view"), "portal");
    assert.equal(url.searchParams.get("brief"), "project-brief-123");
    assert.equal(url.searchParams.has("freelancer"), false);
    assert.equal(url.toString().includes("freelancer-secret-id"), false);
    assert.equal(deliveries[0]?.subject, "Ny forespørsel: Nobelkonserten");
    assert.match(body, /^Hei Crew,/);
    assert.match(body, /Du har fått en ny forespørsel fra Test Producer\./);
    assert.match(body, /Prosjekt: Nobelkonserten/);
    assert.match(body, /Dato: 10\. desember 2026 – 12\. desember 2026/);
    assert.match(body, /Rolle: Lydtekniker/);
    assert.match(body, /Sted: Oslo Spektrum/);
    assert.match(
      body,
      /Hvis knappen over ikke fungerer, lim inn denne lenken i nettleseren:/,
    );
    const html = deliveries[0]?.htmlBody ?? "";
    assert.match(html, /Crew Management System/);
    assert.match(html, />Åpne brief i portal</);
    assert.match(html, /Nobelkonserten/);
    assert.match(html, /Lydtekniker/);
    assert.match(html, /Oslo Spektrum/);
    assert.equal(html.includes("freelancer-secret-id"), false);
  });

  it("falls back cleanly when summary fields are missing", () => {
    const content = buildBriefEmailContent({
      recipientName: "",
      producerName: "Prosjektleder",
      link: "https://app.ehs.no/?view=portal&brief=brief-1",
      projectName: null,
      venue: null,
      startDate: null,
      endDate: null,
      role: null,
    });

    assert.equal(content.subject, "Ny forespørsel: Ikke oppgitt");
    assert.match(content.textBody, /Hei der,/);
    assert.match(content.textBody, /Prosjekt: Ikke oppgitt/);
    assert.match(content.textBody, /Dato: Ikke oppgitt/);
    assert.match(content.textBody, /Rolle: Ikke oppgitt/);
    assert.match(content.textBody, /Sted: Ikke oppgitt/);
    assert.match(content.htmlBody, /Prosjekt/);
    assert.match(content.htmlBody, /https:\/\/app\.ehs\.no\/logo\.png/);
  });

  it("changes only the requested copy for Share Brief notifications", () => {
    const shared = buildBriefEmailContent({
      recipientName: "Kari",
      producerName: "Ola Nordmann",
      link: "https://app.ehs.no/?view=portal&brief=brief-1",
      projectName: "Nobelkonserten",
      venue: "Oslo Spektrum",
      startDate: "2026-12-10",
      endDate: "2026-12-12",
      role: "Lydtekniker",
      notificationType: "share_brief",
    });

    assert.equal(shared.subject, "Prosjektbrief: Nobelkonserten");
    assert.match(
      shared.textBody,
      /Ola Nordmann har delt en prosjektbrief med deg\./,
    );
    assert.match(shared.textBody, /Se prosjektbrief:/);
    assert.match(shared.htmlBody, />Se prosjektbrief</);
    assert.doesNotMatch(shared.htmlBody, />Åpne brief i portal</);
    assert.match(shared.htmlBody, /Prosjekt/);
    assert.match(shared.htmlBody, /Dato/);
    assert.match(shared.htmlBody, /Rolle/);
    assert.match(shared.htmlBody, /Sted/);
  });
});