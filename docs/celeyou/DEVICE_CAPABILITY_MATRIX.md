# CeleYou device capability matrix

Status labels: **Supported** | **Supported with limitations** | **Requires both applications** | **Requires recipient approval** | **Requires physical-device testing** | **Unsupported**.

## Native APIs

| Capability | iOS | Android | Notes |
|---|---|---|---|
| BLE scan (central) | Supported with limitations | Supported | Core Bluetooth `CBCentralManager`. Android `BluetoothLeScanner`. Runtime permission. Foreground first. |
| BLE advertise (peripheral) | Supported with limitations | Supported with limitations | iOS `CBPeripheralManager.startAdvertising` (local name + service UUIDs only). Android `BluetoothLeAdvertiser`; null if chipset cannot advertise. |
| BLE background | Supported with limitations | Supported with limitations | iOS `bluetooth-central` / `bluetooth-peripheral` UIBackgroundModes. Overflow UUID area. Not Phase C scope. |
| NFC tag read | Supported | Supported | iOS Core NFC NDEF types 1–5, foreground session, ~60s. Android `NfcAdapter` tag dispatch. |
| NFC tag write | Supported with limitations | Supported | iOS Core NFC write to tags. Android `Ndef.writeNdefMessage`. Not phone-to-phone. |
| NFC peer-to-peer | Unsupported | Unsupported | Core NFC has no P2P. Android Beam deprecated in 10 and removed. |
| AirDrop invoke | Unsupported | Unsupported | No public AirDrop start API. Share a URL through `UIActivityViewController`; AirDrop may appear. Requires recipient approval. |
| Quick Share invoke | Unsupported | Supported with limitations | Android Sharesheet / `ACTION_SEND`. Quick Share may appear. Not Samsung-only APIs. Requires recipient approval. |
| Universal Links | Supported | — | `applinks:` Associated Domains + `apple-app-site-association`. Fallback Safari if app missing. |
| Android App Links | — | Supported | Digital Asset Links. Fallback browser if app missing. |
| System share sheet | Supported | Supported | Share HTTPS profile URL. Recipient need not have CeleYou. |
| Web BLE advertise | Unsupported | Unsupported | Browsers cannot advertise. Website `canAdvertise` is always false. |

## Sender → recipient (January native target)

| Sender | Recipient has CeleYou | Transport | Status |
|---|---|---|---|
| iPhone | iPhone | Foreground BLE | Requires both applications, recipient approval, physical-device testing |
| Samsung | Samsung | Foreground BLE | Requires both applications, recipient approval, physical-device testing |
| Android | Android | Foreground BLE | Requires both applications; advertising hardware; physical-device testing |
| iPhone | Android | Foreground BLE | Requires both applications, recipient approval, physical-device testing |
| Android | iPhone | Foreground BLE | Requires both applications, recipient approval, physical-device testing |
| Any | No app | QR / HTTPS / NFC card / share sheet | Supported with limitations. Manual accept. |
| Any | Any | Phone-to-phone NFC | Unsupported |

Physical-device cells are empty until Increment / Phase C hardware runs. See `DEVICE_ACCEPTANCE_RESULTS.md`.
