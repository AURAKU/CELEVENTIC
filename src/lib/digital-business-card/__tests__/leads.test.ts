import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  CELECARD_LEAD_STATUSES,
  CELECARD_LEAD_STATUS_LABEL,
  CELECARD_LEAD_STATUS_PURPOSE,
  emptyLeadFilterCopy,
  isCeleCardLeadStatus,
  leadStatusBelongsInFilter,
  movedLeadStatusCopy,
  normalizeCeleCardLeadStatus,
  openLeadCount,
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

  it("uses Open as the working list and gives each stage a job", () => {
    assert.equal(leadStatusBelongsInFilter("NEW", "ALL"), true);
    assert.equal(leadStatusBelongsInFilter("ARCHIVED", "ALL"), false);
    assert.equal(leadStatusBelongsInFilter("CONTACTED", "CONTACTED"), true);
    assert.equal(leadStatusBelongsInFilter("CONTACTED", "NEW"), false);
    assert.equal(openLeadCount({ NEW: 2, CONTACTED: 1, QUALIFIED: 0, FOLLOW_UP: 1, WON: 1, ARCHIVED: 9 }), 5);
    assert.match(CELECARD_LEAD_STATUS_PURPOSE.FOLLOW_UP, /1 day reminder/);
    assert.match(movedLeadStatusCopy("ARCHIVED"), /Closed/);
    assert.match(emptyLeadFilterCopy("ALL", false), /No open connections/);
    assert.match(emptyLeadFilterCopy("FOLLOW_UP", false), /Follow up/);
    const inbox = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-connection-inbox.tsx"),
      "utf8"
    );
    const route = readFileSync(
      join(process.cwd(), "src/app/api/digital-business-cards/[id]/connections/route.ts"),
      "utf8"
    );
    assert.match(inbox, /movedLeadStatusCopy/);
    assert.match(inbox, /CELECARD_LEAD_STATUS_PURPOSE/);
    assert.match(route, /syncLeadStatusEffects/);
  });
});
