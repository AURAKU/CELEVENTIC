import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CELECARD_LEAD_STATUSES,
  CELECARD_LEAD_STATUS_LABEL,
  isCeleCardLeadStatus,
  normalizeCeleCardLeadStatus,
  parseCeleCardLeadStatus,
} from "@/lib/digital-business-card/leads";

describe("CeleYou lead inbox statuses", () => {
  it("keeps the schema CRM states and never invents billing copy", () => {
    assert.deepEqual([...CELECARD_LEAD_STATUSES], [
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "FOLLOW_UP",
      "WON",
      "ARCHIVED",
    ]);
    assert.equal(/plan|pay|₵|billing/i.test(JSON.stringify(CELECARD_LEAD_STATUS_LABEL)), false);
    assert.equal(isCeleCardLeadStatus("WON"), true);
    assert.equal(isCeleCardLeadStatus("CLOSED"), false);
  });

  it("normalizes owner updates onto the stored CRM states", () => {
    assert.equal(normalizeCeleCardLeadStatus("follow-up"), "FOLLOW_UP");
    assert.equal(normalizeCeleCardLeadStatus("contacted"), "CONTACTED");
    assert.equal(normalizeCeleCardLeadStatus("nope"), "NEW");
    assert.equal(parseCeleCardLeadStatus("won"), "WON");
    assert.equal(parseCeleCardLeadStatus("closed"), null);
  });
});
