import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CROP_EXPORT_MAX_EDGE, cropExportSize } from "@/lib/image/crop-utils";

describe("cropExportSize", () => {
  it("keeps native crop pixels when they fit the export cap", () => {
    assert.deepEqual(cropExportSize(2048, 2048), { width: 2048, height: 2048 });
    assert.deepEqual(cropExportSize(800, 1000), { width: 800, height: 1000 });
  });

  it("never upscales a small crop", () => {
    assert.deepEqual(cropExportSize(320, 320), { width: 320, height: 320 });
  });

  it("downsamples huge crops to the export cap without changing aspect", () => {
    const out = cropExportSize(6000, 4000);
    assert.equal(out.width, CROP_EXPORT_MAX_EDGE);
    assert.equal(out.height, Math.round((4000 / 6000) * CROP_EXPORT_MAX_EDGE));
  });
});
