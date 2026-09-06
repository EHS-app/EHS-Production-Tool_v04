import assert from "node:assert/strict";
import { test } from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { briefDispatchesTable } from "@workspace/db";

test("brief dispatch conflict target is backed by a unique index", () => {
  const table = getTableConfig(briefDispatchesTable);
  const dispatchIdentity = table.indexes.find(
    (index) => index.config.name === "brief_dispatches_brief_freelancer_unique",
  );

  assert.ok(dispatchIdentity, "dispatch identity index must exist");
  assert.equal(
    dispatchIdentity.config.unique,
    true,
    "ON CONFLICT (brief_id, freelancer_user_id) requires a unique index",
  );
});