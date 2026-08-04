import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyAdmissionIdentity,
  matchesIssueFilter,
  normalizeAuditQuery,
  isValidAdmissionCodeValue,
} from "../classify";

describe("classifyAdmissionIdentity", () => {
  it("marks a full party identity as COMPLETE", () => {
    const result = classifyAdmissionIdentity({
      uniqueLink: "abc1234567890xyz",
      hasLivePass: true,
      admissionCode: "4821",
      passStatus: "ACTIVE",
    });
    assert.equal(result.status, "COMPLETE");
    assert.deepEqual(result.issues, []);
    assert.ok(result.badges.includes("Complete"));
  });

  it("does not invent missing-code for capacity — only when code absent", () => {
    const missing = classifyAdmissionIdentity({
      uniqueLink: "abc1234567890xyz",
      hasLivePass: true,
      admissionCode: null,
      passStatus: "ACTIVE",
    });
    assert.equal(missing.status, "MISSING_ADMISSION_CODE");
    assert.ok(missing.badges.includes("Missing Code"));
  });

  it("flags missing QR separately from missing code", () => {
    const qr = classifyAdmissionIdentity({
      uniqueLink: "abc1234567890xyz",
      hasLivePass: false,
      admissionCode: "1234",
      passStatus: null,
    });
    assert.equal(qr.status, "MISSING_QR");

    const both = classifyAdmissionIdentity({
      uniqueLink: "abc1234567890xyz",
      hasLivePass: false,
      admissionCode: null,
      passStatus: null,
    });
    assert.equal(both.status, "MISSING_MULTIPLE_FIELDS");
  });

  it("detects invalid and duplicate codes", () => {
    assert.equal(isValidAdmissionCodeValue("12"), false);
    assert.equal(isValidAdmissionCodeValue("123456"), true);

    const invalid = classifyAdmissionIdentity({
      uniqueLink: "abc1234567890xyz",
      hasLivePass: true,
      admissionCode: "12ab",
      passStatus: "ACTIVE",
    });
    assert.equal(invalid.status, "INVALID_CODE");

    const dup = classifyAdmissionIdentity({
      uniqueLink: "abc1234567890xyz",
      hasLivePass: true,
      admissionCode: "5555",
      passStatus: "ACTIVE",
      codeDuplicated: true,
    });
    assert.equal(dup.status, "DUPLICATE_CODE");
    assert.ok(dup.badges.includes("Possible Duplicate"));
  });

  it("classifies revoked passes as REVOKED when no live replacement", () => {
    const revoked = classifyAdmissionIdentity({
      uniqueLink: "abc1234567890xyz",
      hasLivePass: false,
      admissionCode: "9999",
      passStatus: "REVOKED",
    });
    assert.equal(revoked.status, "REVOKED");
  });
});

describe("matchesIssueFilter", () => {
  const complete = classifyAdmissionIdentity({
    uniqueLink: "link-token-here",
    hasLivePass: true,
    admissionCode: "1111",
    passStatus: "ACTIVE",
  });
  const missingQr = classifyAdmissionIdentity({
    uniqueLink: "link-token-here",
    hasLivePass: false,
    admissionCode: "1111",
    passStatus: null,
  });

  it("filters complete vs incomplete", () => {
    assert.equal(matchesIssueFilter(complete, "complete"), true);
    assert.equal(matchesIssueFilter(complete, "all_incomplete"), false);
    assert.equal(matchesIssueFilter(missingQr, "missing_qr"), true);
    assert.equal(matchesIssueFilter(missingQr, "all_incomplete"), true);
  });
});

describe("normalizeAuditQuery", () => {
  it("tolerates casing, spaces and phone punctuation", () => {
    const q = normalizeAuditQuery("  Akua &  Kelly  ");
    assert.equal(q.text, "akua & kelly");
    assert.ok(q.tokens.includes("akua"));

    const phone = normalizeAuditQuery("+233 24-123-4567");
    assert.equal(phone.digits, "233241234567");
  });
});
