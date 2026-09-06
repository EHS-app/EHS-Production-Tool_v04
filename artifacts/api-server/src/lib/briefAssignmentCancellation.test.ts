import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canCancelBriefAssignment,
  removeCancelledAssignmentFromBriefData,
} from "./briefAssignmentCancellation";

describe("pending brief assignment cancellation", () => {
  it("removes only the exact freelancer role slot", () => {
    const original = {
      project: { name: "Konsert" },
      recipientCrewId: "crew-a",
      assignments: [
        {
          crewId: "crew-a",
          freelancerUserId: "freelancer-1",
          role: "Lyd",
        },
        {
          crewId: "crew-b",
          freelancerUserId: "freelancer-1",
          role: "Lys",
        },
        {
          crewId: "crew-a",
          freelancerUserId: "freelancer-2",
          role: "Lyd",
        },
      ],
    };

    const result = removeCancelledAssignmentFromBriefData(
      original,
      "crew-a",
      "freelancer-1",
    );

    assert.equal(result.removed, true);
    assert.equal(result.data.recipientCrewId, null);
    assert.deepEqual(result.data.assignments, [
      {
        crewId: "crew-b",
        freelancerUserId: "freelancer-1",
        role: "Lys",
      },
      {
        crewId: "crew-a",
        freelancerUserId: "freelancer-2",
        role: "Lyd",
      },
    ]);
    assert.equal(original.assignments.length, 3);
  });

  it("permits only unanswered assignments without an accepted gig", () => {
    assert.equal(
      canCancelBriefAssignment({ decision: "pending", acceptedGigId: null }),
      true,
    );
    assert.equal(
      canCancelBriefAssignment({ decision: "accepted", acceptedGigId: "gig-1" }),
      false,
    );
    assert.equal(
      canCancelBriefAssignment({ decision: "declined", acceptedGigId: null }),
      false,
    );
  });
});