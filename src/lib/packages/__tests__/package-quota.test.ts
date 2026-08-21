import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FREE_PLAN_GUEST_LIMIT,
  FREE_PLAN_INVITATION_LIMIT,
  PackageQuotaError,
} from "../package-quota";

describe("free plan package quota constants", () => {
  it("caps free service at 5 guests and 5 invitations", () => {
    assert.equal(FREE_PLAN_GUEST_LIMIT, 5);
    assert.equal(FREE_PLAN_INVITATION_LIMIT, 5);
  });

  it("marks quota errors as upgrade-oriented", () => {
    const err = new PackageQuotaError("limit reached");
    assert.equal(err.code, "PACKAGE_QUOTA");
    assert.equal(err.upgradeHint, true);
  });
});
