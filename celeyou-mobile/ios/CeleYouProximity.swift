import Foundation
import CoreBluetooth

/// Foreground BLE peripheral + central for CeleYou Tap-to-Connect.
/// Advertisements carry only the service UUID and local name "CeleYou".
/// Join codes travel on the GATT session characteristic after connect.
/// This module never invents nearby phones and never uses Core NFC for phone-to-phone exchange.
@objc(CeleYouProximity)
final class CeleYouProximity: NSObject, CBPeripheralManagerDelegate, CBCentralManagerDelegate, CBPeripheralDelegate {
  static let serviceUuid = CBUUID(string: "a1c3ce10-7e10-4c0e-9e10-ce1e70c0de01")
  static let sessionUuid = CBUUID(string: "a1c3ce11-7e10-4c0e-9e10-ce1e70c0de01")
  static let handshakeUuid = CBUUID(string: "a1c3ce12-7e10-4c0e-9e10-ce1e70c0de01")

  private var peripheralManager: CBPeripheralManager?
  private var centralManager: CBCentralManager?
  private var sessionCharacteristic: CBMutableCharacteristic?
  private var helloPayload = Data()
  private var scanned: [UUID: CBPeripheral] = [:]
  private var lastRssi: [UUID: Int] = [:]
  private var peers: [[String: Any]] = []
  private var advertiseResolve: RCTPromiseResolveBlock?
  private var advertiseReject: RCTPromiseRejectBlock?
  private var scanResolve: RCTPromiseResolveBlock?
  private var scanReject: RCTPromiseRejectBlock?

  @objc func canAdvertise() -> Bool {
    peripheralManager?.state == .poweredOn
  }

  @objc func startAdvertising(_ helloJson: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    helloPayload = Data(helloJson.utf8)
    advertiseResolve = resolve
    advertiseReject = reject
    if peripheralManager == nil {
      peripheralManager = CBPeripheralManager(delegate: self, queue: .main)
    } else {
      beginAdvertisingIfReady()
    }
  }

  @objc func stopAdvertising(_ resolve: RCTPromiseResolveBlock, rejecter _: RCTPromiseRejectBlock) {
    peripheralManager?.stopAdvertising()
    if let service = peripheralManager?.services {
      service.forEach { peripheralManager?.remove($0) }
    }
    resolve(true)
  }

  @objc func startScanning(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    peers = []
    scanResolve = resolve
    scanReject = reject
    if centralManager == nil {
      centralManager = CBCentralManager(delegate: self, queue: .main)
    } else {
      beginScanningIfReady()
    }
  }

  @objc func stopScanning(_ resolve: RCTPromiseResolveBlock, rejecter _: RCTPromiseRejectBlock) {
    centralManager?.stopScan()
    scanned.values.forEach { centralManager?.cancelPeripheralConnection($0) }
    scanned = [:]
    resolve(true)
  }

  @objc func nearbyPeers() -> [[String: Any]] {
    peers
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    if peripheral.state == .poweredOn {
      beginAdvertisingIfReady()
      return
    }
    advertiseReject?("bluetooth-off", "Turn on Bluetooth to share nearby. Safari cannot do this. Use the CeleYou app, or show the session QR.", nil)
    advertiseReject = nil
    advertiseResolve = nil
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    if central.state == .poweredOn {
      beginScanningIfReady()
      return
    }
    if central.state == .unauthorized {
      scanReject?("permission-denied", "Allow Bluetooth for CeleYou, then keep Tap Mode in the foreground.", nil)
    } else {
      scanReject?("bluetooth-off", "Turn on Bluetooth to find a nearby CeleYou. Or scan the session QR.", nil)
    }
    scanReject = nil
    scanResolve = nil
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    lastRssi[peripheral.identifier] = RSSI.intValue
    guard scanned[peripheral.identifier] == nil else { return }
    scanned[peripheral.identifier] = peripheral
    peripheral.delegate = self
    central.connect(peripheral, options: nil)
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    peripheral.discoverServices([Self.serviceUuid])
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    guard error == nil else { return }
    peripheral.services?.forEach { peripheral.discoverCharacteristics([Self.sessionUuid, Self.handshakeUuid], for: $0) }
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    guard error == nil else { return }
    service.characteristics?.forEach { peripheral.readValue(for: $0) }
  }

  func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    guard error == nil, let data = characteristic.value, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
    let discoveryId = json["discoveryId"] as? String ?? ""
    let joinCode = json["joinCode"] as? String ?? ""
    guard discoveryId.count >= 16, joinCode.count >= 4 else { return }
    if peers.contains(where: { ($0["discoveryId"] as? String) == discoveryId }) { return }
    peers.append([
      "discoveryId": discoveryId,
      "joinCode": joinCode,
      "rssi": lastRssi[peripheral.identifier] ?? NSNull(),
    ])
  }

  private func beginAdvertisingIfReady() {
    guard let peripheralManager, peripheralManager.state == .poweredOn else { return }
    let session = CBMutableCharacteristic(
      type: Self.sessionUuid,
      properties: [.read, .notify],
      value: helloPayload,
      permissions: [.readable]
    )
    sessionCharacteristic = session
    let handshake = CBMutableCharacteristic(
      type: Self.handshakeUuid,
      properties: [.read, .write, .notify],
      value: nil,
      permissions: [.readable, .writeable]
    )
    let service = CBMutableService(type: Self.serviceUuid, primary: true)
    service.characteristics = [session, handshake]
    peripheralManager.removeAllServices()
    peripheralManager.add(service)
    peripheralManager.startAdvertising([
      CBAdvertisementDataServiceUUIDsKey: [Self.serviceUuid],
      CBAdvertisementDataLocalNameKey: "CeleYou",
    ])
    advertiseResolve?(true)
    advertiseResolve = nil
    advertiseReject = nil
  }

  private func beginScanningIfReady() {
    guard let centralManager, centralManager.state == .poweredOn else { return }
    centralManager.scanForPeripherals(withServices: [Self.serviceUuid], options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    scanResolve?(true)
    scanResolve = nil
    scanReject = nil
  }
}

typealias RCTPromiseResolveBlock = (Any?) -> Void
typealias RCTPromiseRejectBlock = (String, String, Error?) -> Void
