import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

describe("CeleYou native BLE sources", () => {
  const ios = readFileSync(join(process.cwd(), "celeyou-mobile/ios/CeleYouProximity.swift"), "utf8");
  const android = readFileSync(join(process.cwd(), "celeyou-mobile/android/CeleYouProximity.kt"), "utf8");

  it("wires Core Bluetooth and Android BLE without inventing peers or phone to phone NFC", () => {
    assert.match(ios, /CBPeripheralManager/);
    assert.match(ios, /CBCentralManager/);
    assert.match(ios, /a1c3ce10-7e10-4c0e-9e10-ce1e70c0de01/);
    assert.match(ios, /CBAdvertisementDataServiceUUIDsKey/);
    assert.doesNotMatch(ios, /simulated peer|fake device|NameDrop|Core NFC peer/i);

    assert.match(android, /BluetoothLeAdvertiser/);
    assert.match(android, /BluetoothLeScanner|bluetoothLeScanner/);
    assert.match(android, /a1c3ce10-7e10-4c0e-9e10-ce1e70c0de01/);
    assert.match(android, /Android Beam is not used/);
    assert.match(ios, /a1c3ce12-7e10-4c0e-9e10-ce1e70c0de01/);
    assert.match(android, /a1c3ce12-7e10-4c0e-9e10-ce1e70c0de01/);
    assert.doesNotMatch(android, /simulated peer|fake device/i);

    const pkg = JSON.parse(readFileSync(join(process.cwd(), "celeyou-mobile/package.json"), "utf8"));
    assert.equal(pkg.celeyouProximity.phoneToPhoneReady, false);

    const v1 = readFileSync(
      join(process.cwd(), "src/app/api/v1/proximity/sessions/[id]/request/route.ts"),
      "utf8"
    );
    assert.match(v1, /proximityV1Action\("request"\)/);
    const dashboard = readFileSync(join(process.cwd(), "src/components/dashboard/role-dashboards.tsx"), "utf8");
    assert.match(dashboard, /Tap to Connect/);
    const service = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/proximity.service.ts"),
      "utf8"
    );
    assert.match(service, /purgeExpiredProximityRecords/);
    assert.match(service, /JOIN_COOLDOWN/);
  });
});
