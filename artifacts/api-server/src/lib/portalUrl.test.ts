import assert from "node:assert/strict";
import test from "node:test";
import { buildPortalBriefUrl } from "./portalUrl";

test("buildPortalBriefUrl uses the canonical production domain", () => {
  assert.equal(
    buildPortalBriefUrl("brief-123"),
    "https://app.ehs.no/?view=portal&brief=brief-123",
  );
});

test("buildPortalBriefUrl preserves the brief identifier as a query parameter", () => {
  assert.equal(
    buildPortalBriefUrl("brief/with spaces&symbols"),
    "https://app.ehs.no/?view=portal&brief=brief%2Fwith+spaces%26symbols",
  );
});