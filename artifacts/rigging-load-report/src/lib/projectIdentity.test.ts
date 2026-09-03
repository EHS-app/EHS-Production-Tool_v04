/** Run with:
 *
 *  node --experimental-strip-types --test \
 *    artifacts/rigging-load-report/src/lib/projectIdentity.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  projectIdentityPayload,
  resolveProjectName,
} from "./projectIdentity.ts";

test("project name, venue, and venue id map to distinct payload fields", () => {
  assert.deepEqual(
    projectIdentityPayload(
      "Summer Festival 2026",
      "Sentrum Scene",
      "venue-123",
    ),
    {
      name: "Summer Festival 2026",
      venue: "Sentrum Scene",
      venue_id: "venue-123",
    },
  );
});

test("legacy combined records remain readable as project names", () => {
  assert.equal(resolveProjectName(undefined, "Legacy Project"), "Legacy Project");
  assert.equal(
    resolveProjectName("Summer Festival 2026", "Sentrum Scene"),
    "Summer Festival 2026",
  );
});