import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coupleShareCrop } from "@/lib/social/social-hero-frame";

describe("coupleShareCrop", () => {
  it("keeps a standing portrait's window in the upper band, where the faces are", () => {
    const crop = coupleShareCrop(683, 1024);
    assert.ok(crop);
    assert.equal(crop.left, 0);
    assert.ok(crop.top < 1024 * 0.2, `top ${crop.top} starts too low for the faces`);
    assert.ok(crop.top + crop.height < 1024 * 0.62, "window reaches the torso instead of the faces");
    assert.ok(crop.width >= 600);
  });

  it("centers a landscape photograph instead of pinning it to the top", () => {
    const crop = coupleShareCrop(2400, 1000);
    assert.ok(crop);
    assert.ok(crop.top < 24);
    assert.ok(crop.left > 0);
  });
});
