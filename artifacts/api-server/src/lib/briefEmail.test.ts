import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dispatchBriefRequestEmails,
  type BriefEmailDependencies,
  type BriefEmailProfile,
} from "./briefEmail";

function dependencies(
  profiles: BriefEmailProfile[],
  deliveries: Array<{ to: string; textBody: string }> = [],
): BriefEmailDependencies {
  return {
    lookupProducerName: async () => "Test Producer",
    loadProfiles: async () => profiles,
    send: async (message) => {
      deliveries.push({ to: message.to, textBody: message.textBody });
      return { ok: true, id: `message-${deliveries.length}` };
    },
  };
}

const baseArgs = {
  briefId: "project-brief-123",
  ownerUserId: "producer-1",
  projectName: "Oslo Concert",
  venue: "Spektrum",
  client: "EHS",
  startDate: "2026-09-10",
  endDate: "2026-09-11",
  projectBrief: "Rigging starts at 08:00.",
};

describe("brief email dispatch", () => {
  it("consolidates multiple role assignments into one email per freelancer", async () => {
    const deliveries: Array<{ to: string; textBody: string }> = [];
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
    const deliveries: Array<{ to: string; textBody: string }> = [];
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

  it("puts the correct authenticated project brief link and details in the email", async () => {
    const deliveries: Array<{ to: string; textBody: string }> = [];
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
    assert.match(body, /Prosjekt: Oslo Concert/);
    assert.match(body, /Venue: Spektrum/);
    assert.match(body, /Dato: 2026-09-10 – 2026-09-11/);
    assert.match(body, /Prosjektbrief:\nRigging starts at 08:00\./);
  });
});