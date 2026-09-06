import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { briefDeliveryToast } from "./briefDeliveryToast";

describe("Share brief delivery toast", () => {
  it("reports the exact successful API delivery count", () => {
    assert.deepEqual(
      briefDeliveryToast({ sent: 3, skipped: 4, alreadySent: 8 }),
      {
        kind: "success",
        message: "Briefs emailed successfully to 3 crew members",
      },
    );
  });

  it("uses singular wording for one successful delivery", () => {
    assert.deepEqual(briefDeliveryToast({ sent: 1 }), {
      kind: "success",
      message: "Briefs emailed successfully to 1 crew member",
    });
  });

  it("reports missing email profiles when every delivery is skipped", () => {
    assert.deepEqual(briefDeliveryToast({ sent: 0, skipped: 2 }), {
      kind: "error",
      message: "No briefs were emailed. Check freelancer email profiles.",
    });
  });

  it("reports an active dispatch when nothing is sent or skipped", () => {
    assert.deepEqual(
      briefDeliveryToast({ sent: 0, skipped: 0, alreadySent: 2 }),
      {
        kind: "error",
        message: "Brief emails are already being sent.",
      },
    );
  });
});