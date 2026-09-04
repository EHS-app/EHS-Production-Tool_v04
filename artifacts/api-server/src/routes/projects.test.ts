import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROJECT_STATUSES,
  PROJECT_TRANSITIONS,
  canTransitionProject,
  classifyProjectTransition,
  deriveLegacyProjectStatus,
  effectiveBriefProjectId,
  isActivationTransition,
  isDispatchClaimable,
  isProjectStatus,
  isTerminalProjectStatus,
  recipientsFromBriefData,
} from "../lib/projectLifecycle";

describe("project lifecycle", () => {
  it("defines exactly the canonical ordered transition matrix", () => {
    assert.deepEqual(PROJECT_STATUSES, [
      "draft",
      "planning",
      "active",
      "completed",
      "archived",
    ]);
    assert.deepEqual(PROJECT_TRANSITIONS, {
      draft: "planning",
      planning: "active",
      active: "completed",
      completed: "archived",
      archived: null,
    });
  });

  it("validates statuses and classifies retries, skips, and reversals", () => {
    assert.equal(isProjectStatus("active"), true);
    assert.equal(isProjectStatus("cancelled"), false);
    assert.equal(classifyProjectTransition("planning", "active"), "forward");
    assert.equal(classifyProjectTransition("active", "active"), "idempotent");
    assert.equal(classifyProjectTransition("draft", "active"), "skipped");
    assert.equal(classifyProjectTransition("completed", "planning"), "backward");
  });

  it("allows only owner and editor writers", () => {
    assert.equal(canTransitionProject("owner"), true);
    assert.equal(canTransitionProject("editor"), true);
    assert.equal(canTransitionProject("viewer"), false);
    assert.equal(canTransitionProject(null), false);
  });

  it("derives legacy rows while preferring a persisted canonical status", () => {
    assert.equal(deriveLegacyProjectStatus({}), "draft");
    assert.equal(deriveLegacyProjectStatus({ venue: "Oslo" }), "planning");
    assert.equal(
      deriveLegacyProjectStatus({ data: { activeBriefId: "brief-1" } }),
      "active",
    );
    assert.equal(
      deriveLegacyProjectStatus({
        status: "completed",
        data: { activeBriefId: "brief-1" },
      }),
      "completed",
    );
  });

  it("triggers automation only for planning to active", () => {
    assert.equal(isActivationTransition("planning", "active"), true);
    assert.equal(isActivationTransition("active", "completed"), false);
  });

  it("deduplicates dispatch recipients and rejects malformed recipient ids", () => {
    assert.deepEqual(
      recipientsFromBriefData({
        assignments: [
          { crewId: "crew-1", freelancerUserId: "user-1" },
          { crewId: "crew-2", freelancerUserId: "user-1" },
          { crewId: "crew-3", freelancerUserId: " user-2 " },
          { crewId: "crew-4" },
        ],
      }),
      [{ crewId: "crew-1", freelancerUserId: "user-1" }],
    );
  });

  it("claims delivery from outbox state, independently of assignment identity", () => {
    assert.equal(isDispatchClaimable("pending"), true);
    assert.equal(isDispatchClaimable("sent"), false);
    assert.equal(isDispatchClaimable("dispatching"), false);
    assert.equal(isDispatchClaimable("failed"), false);
    assert.equal(isDispatchClaimable("failed", true), true);
    assert.equal(isDispatchClaimable("dispatching", false), false);
    assert.equal(isDispatchClaimable("dispatching", true), false);
  });

  it("defers planning saves and prevents terminal project mutation", () => {
    assert.equal(isActivationTransition("draft", "planning"), false);
    assert.equal(isDispatchClaimable("pending"), true);
    assert.equal(isTerminalProjectStatus("completed"), true);
    assert.equal(isTerminalProjectStatus("archived"), true);
    assert.equal(isTerminalProjectStatus("active"), false);
    assert.equal(effectiveBriefProjectId("project-1", null), "project-1");
    assert.equal(effectiveBriefProjectId("project-1", "project-2"), "conflict");
    // The preserved id is what drives locked active-status dispatch when an
    // existing brief save omits project_id.
    assert.equal(
      effectiveBriefProjectId("active-project", undefined),
      "active-project",
    );
  });
});