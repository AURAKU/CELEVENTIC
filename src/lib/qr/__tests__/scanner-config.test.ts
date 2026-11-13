import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildScannerConfig, scannerViewfinderIsReady } from "../scanner-config";
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

test("viewfinder is ready only after it has a real box", () => {
  assert.equal(scannerViewfinderIsReady(0, 0), false);
  assert.equal(scannerViewfinderIsReady(79, 240), false);
  assert.equal(scannerViewfinderIsReady(320, 320), true);
});

test("live camera stays on one stream when parent callbacks change", () => {
  const scanner = readFileSync(join(process.cwd(), "src/components/qr/qr-camera-scanner.tsx"), "utf8");
  assert.match(scanner, /onScanRef/);
  assert.match(scanner, /onErrorRef/);
  assert.match(scanner, /startGenRef/);
  assert.match(scanner, /pinScannerVideo/);
  assert.match(scanner, /sizeViewfinderHost/);
  assert.match(scanner, /playsinline/);
  assert.match(scanner, /aspect-square/);
  assert.match(scanner, /min-h-\[280px\]/);
  assert.doesNotMatch(scanner, /\[active, handleScan, onError, screenScanMode, viewfinderId\]/);
  assert.match(scanner, /\[active, handleScan, screenScanMode, viewfinderId\]/);
});
