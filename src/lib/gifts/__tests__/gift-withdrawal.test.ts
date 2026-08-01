import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateWithdrawalPolicy,
  maskBankAccount,
  maskPhone,
  canRequesterSelfApprove,
  withdrawalEligibleAt,
} from "../gift-withdrawal";
import { isCampaignPlaceable } from "../gift-placement";
import { companionGiftHeadline, companionGiftOptionalNote, companionGiftTeaser } from "../gift-copy";

test("available withdrawal excludes pending settlement window", () => {
  const start = new Date("2026-08-01T12:00:00.000Z");
  const result = evaluateWithdrawalPolicy(
    {
      withdrawAfterEventOnly: true,
      settlementDelayHours: 24,
      minWithdrawalMinor: 1000,
      eventStartDate: start,
      eventStatus: "LIVE",
    },
    5000,
    20000,
    new Date("2026-08-01T13:00:00.000Z")
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /settlement period/i);
  }
});

test("insufficient available balance is refused", () => {
  const result = evaluateWithdrawalPolicy(
    {
      withdrawAfterEventOnly: false,
      settlementDelayHours: 0,
      minWithdrawalMinor: 1000,
    },
    5000,
    4000
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /Insufficient available balance/i);
});

test("valid withdrawal passes policy after settlement", () => {
  const start = new Date("2026-07-01T12:00:00.000Z");
  const result = evaluateWithdrawalPolicy(
    {
      withdrawAfterEventOnly: true,
      settlementDelayHours: 24,
      minWithdrawalMinor: 1000,
      maxWithdrawalMinor: 100000,
      eventStartDate: start,
      eventStatus: "COMPLETED",
    },
    5000,
    20000,
    new Date("2026-08-01T12:00:00.000Z")
  );
  assert.equal(result.ok, true);
});

test("cancelled events cannot withdraw", () => {
  const result = evaluateWithdrawalPolicy(
    {
      withdrawAfterEventOnly: false,
      settlementDelayHours: 0,
      minWithdrawalMinor: 1000,
      eventStatus: "CANCELLED",
    },
    5000,
    20000
  );
  assert.equal(result.ok, false);
});

test("phone and bank masking hide full destination", () => {
  assert.equal(maskPhone("233241234567"), "233****4567");
  assert.equal(maskBankAccount("1234567890"), "••••7890");
});

test("requester cannot self-approve", () => {
  assert.equal(canRequesterSelfApprove("user-a", "user-a"), true);
  assert.equal(canRequesterSelfApprove("user-a", "user-b"), false);
});

test("withdrawalEligibleAt adds settlement delay", () => {
  const at = withdrawalEligibleAt({
    withdrawAfterEventOnly: true,
    settlementDelayHours: 48,
    minWithdrawalMinor: 1000,
    eventStartDate: "2026-08-01T00:00:00.000Z",
  });
  assert.ok(at);
  assert.equal(at!.toISOString(), "2026-08-03T00:00:00.000Z");
});

test("companion placement respects showOnCompanion and opensAt", () => {
  assert.equal(
    isCampaignPlaceable(
      { status: "ACTIVE", showOnInvitation: true, showOnCompanion: false },
      "companion"
    ),
    false
  );
  assert.equal(
    isCampaignPlaceable(
      {
        status: "ACTIVE",
        showOnInvitation: true,
        showOnCompanion: true,
        opensAt: "2099-01-01T00:00:00.000Z",
      },
      "companion",
      new Date("2026-08-01T00:00:00.000Z")
    ),
    false
  );
  assert.equal(
    isCampaignPlaceable(
      { status: "ACTIVE", showOnInvitation: false, showOnCompanion: true },
      "companion"
    ),
    true
  );
});

test("companion gift copy stays optional and non-fundraising", () => {
  const teaser = companionGiftTeaser("WEDDING_GIFT");
  assert.match(teaser, /presence/i);
  assert.doesNotMatch(teaser, /donate|donation|goal|raised/i);
  assert.match(companionGiftHeadline("WEDDING_GIFT"), /gift/i);
  assert.match(companionGiftOptionalNote(), /optional/i);
});
