import Foundation
import CoreBluetooth

/// Phase C will implement CBPeripheralManager + CBCentralManager.
/// This stub must not return simulated peripherals.
@objc(CeleYouProximity)
final class CeleYouProximity: NSObject {
  private let serviceUuid = CBUUID(string: "a1c3ce10-7e10-4c0e-9e10-ce1e70c0de01")

  @objc func canAdvertise() -> Bool {
    false
  }

  @objc func startAdvertising(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    reject("native-unavailable", "Core Bluetooth advertising is not wired. Phase C requires a physical iPhone with both apps in the foreground.", nil)
  }

  @objc func startScanning(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    reject("native-unavailable", "Core Bluetooth scanning is not wired. Do not invent nearby devices.", nil)
  }

  @objc func nearbyPeers() -> [[String: Any]] {
    []
  }
}

typealias RCTPromiseResolveBlock = (Any?) -> Void
typealias RCTPromiseRejectBlock = (String, String, Error?) -> Void
