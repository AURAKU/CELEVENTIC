import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScannerConfig } from "../scanner-config";
import { QR_SCANNER_FPS, QR_SCANNER_FPS_SCREEN } from "../qr-constants";

test("scanner config keeps camera selection outside video constraints", () => {
  const config = buildScannerConfig(false);
  assert.equal("videoConstraints" in config, false);
  assert.equal(config.fps, QR_SCANNER_FPS);
  assert.equal(config.experimentalFeatures.useBarCodeDetectorIfSupported, true);
});

test("screen mode samples faster without exceeding mobile viewfinder bounds", () => {
  const config = buildScannerConfig(true);
  assert.equal(config.fps, QR_SCANNER_FPS_SCREEN);

  assert.deepEqual(config.qrbox(320, 240), { width: 220, height: 220 });
  assert.deepEqual(config.qrbox(90, 70), { width: 70, height: 70 });
});

test("printed mode uses a comfortably inset square scan region", () => {
  const config = buildScannerConfig(false);
  assert.deepEqual(config.qrbox(400, 300), { width: 245, height: 245 });
});
