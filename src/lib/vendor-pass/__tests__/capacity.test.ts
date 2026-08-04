import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampTeamCapacity,
  DEFAULT_ACCESS_ZONES,
  deriveVendorPassStatus,
  remainingCapacity,
  resolveAdmitQuantity,
} from "../capacity";
import {
  hashVendorTeamToken,
  looksLikeVendorTeamToken,
  mintVendorTeamToken,
  verifyVendorTeamTokenSignature,
  VENDOR_TEAM_TOKEN_PREFIX,
} from "../token";
import { classifyGateInput } from "@/lib/admission/gate-scan";
import { vendorGateDecision } from "../gate-decision";

describe("vendor team capacity fixtures", () => {
  it("1. individual photographer pass defaults to capacity 1", () => {
    const state = { teamCapacity: 1, admittedCount: 0, status: "ACTIVE" };
    assert.deepEqual(resolveAdmitQuantity(state, "one"), { ok: true, quantity: 1 });
    assert.equal(remainingCapacity(state), 1);
  });

  it("2. musical band team pass capacity 8", () => {
    const state = { teamCapacity: 8, admittedCount: 0, status: "ACTIVE" };
    assert.equal(remainingCapacity(state), 8);
    assert.deepEqual(resolveAdmitQuantity(state, "full_team"), { ok: true, quantity: 8 });
  });

  it("3. catering team capacity 12", () => {
    assert.equal(remainingCapacity({ teamCapacity: 12, admittedCount: 0, status: "ACTIVE" }), 12);
  });

  it("4-5. shared QR partial admission keeps remaining active", () => {
    const state = { teamCapacity: 8, admittedCount: 3, status: "PARTIALLY_ADMITTED" };
    assert.deepEqual(resolveAdmitQuantity(state, "one"), { ok: true, quantity: 1 });
    assert.equal(deriveVendorPassStatus(4, 8), "PARTIALLY_ADMITTED");
    assert.equal(remainingCapacity({ ...state, admittedCount: 4 }), 4);
  });

  it("6. full-team admission takes remaining only", () => {
    const state = { teamCapacity: 8, admittedCount: 3, status: "PARTIALLY_ADMITTED" };
    assert.deepEqual(resolveAdmitQuantity(state, "full_team"), { ok: true, quantity: 5 });
  });

  it("7. quantity-based admission", () => {
    const state = { teamCapacity: 8, admittedCount: 2, status: "PARTIALLY_ADMITTED" };
    assert.deepEqual(resolveAdmitQuantity(state, "quantity", 4), { ok: true, quantity: 4 });
    assert.equal(resolveAdmitQuantity(state, "quantity", 9).ok, false);
  });

  it("8-9. capacity never exceeded (duplicate / concurrent simulation)", () => {
    const state = { teamCapacity: 8, admittedCount: 7, status: "PARTIALLY_ADMITTED" };
    assert.deepEqual(resolveAdmitQuantity(state, "one"), { ok: true, quantity: 1 });
    assert.equal(resolveAdmitQuantity({ ...state, admittedCount: 8 }, "one").ok, false);
    assert.equal(resolveAdmitQuantity(state, "quantity", 2).ok, false);
  });

  it("10-11. revoked and expired blocked", () => {
    assert.equal(
      resolveAdmitQuantity({ teamCapacity: 8, admittedCount: 0, status: "REVOKED" }, "one").ok,
      false
    );
    assert.equal(
      resolveAdmitQuantity({ teamCapacity: 8, admittedCount: 0, status: "EXPIRED" }, "one").ok,
      false
    );
  });

  it("13. capacity reached message", () => {
    const full = resolveAdmitQuantity(
      { teamCapacity: 8, admittedCount: 8, status: "ADMITTED" },
      "one"
    );
    assert.equal(full.ok, false);
    if (!full.ok) assert.match(full.error, /capacity/i);
  });

  it("capacity cannot drop below admitted", () => {
    assert.equal(clampTeamCapacity(2, 5), 5);
    assert.equal(clampTeamCapacity(10, 5), 10);
  });

  it("default access zones are Main Entrance + General Event Area", () => {
    assert.deepEqual([...DEFAULT_ACCESS_ZONES], ["Main Entrance", "General Event Area"]);
  });
});

describe("vendor team tokens", () => {
  it("mints verifiable cvt1 tokens distinct from guest prefix", () => {
    const { token, nonce } = mintVendorTeamToken();
    assert.ok(token.startsWith(`${VENDOR_TEAM_TOKEN_PREFIX}.`));
    assert.ok(looksLikeVendorTeamToken(token));
    assert.ok(verifyVendorTeamTokenSignature(token));
    assert.equal(hashVendorTeamToken(token).length, 64);
    assert.ok(nonce.length >= 20);
  });

  it("gate classifies cvt1 before guest codes", () => {
    const { token } = mintVendorTeamToken();
    const kind = classifyGateInput(token);
    assert.equal(kind.kind, "vendor_team_token");
  });
});

describe("vendor gate decision shaping", () => {
  it("shows vendor team capacity in preview", () => {
    const decision = vendorGateDecision({
      pass: {
        title: "GOLDEN RHYTHMS BAND",
        vendorName: "Golden Rhythms",
        admissionCode: "482916",
        teamCapacity: 8,
        admittedCount: 3,
        status: "PARTIALLY_ADMITTED",
        entryMode: "INDIVIDUAL_ENTRY",
        accessZones: ["Backstage", "Stage Area", "Main Entrance"],
      },
      ok: true,
      dryRun: true,
    });
    assert.equal(decision.requiresConfirmation, true);
    assert.equal(decision.allowance, 8);
    assert.equal(decision.remaining, 5);
  });

  it("maps wrong-event denials", () => {
    const decision = vendorGateDecision({
      pass: {
        title: "BAND",
        vendorName: "Band",
        admissionCode: "123456",
        teamCapacity: 8,
        admittedCount: 0,
        status: "ACTIVE",
      },
      ok: false,
      error: "This vendor pass belongs to a different event.",
    });
    assert.equal(decision.reason, "WRONG_EVENT");
    assert.equal(decision.tone, "red");
  });
});
