# CeleYou native proximity feasibility (Phase A)

Date: 11 November 2026. Official public APIs only. No private APIs. No invented device tests.

Gate D remains **NOT AVAILABLE** until Phase C runs on physical phones.

## Verdict

| Goal | Feasible? | Condition |
|---|---|---|
| iPhone ↔ iPhone nearby share of a CeleYou profile | Supported with limitations | Both phones run CeleYou, foreground BLE, recipient approves |
| Android ↔ Android | Supported with limitations | Both phones run CeleYou; advertising hardware must exist (`getBluetoothLeAdvertiser()` non-null) |
| iPhone ↔ Android | Supported with limitations | Same shared GATT protocol; both apps foreground; requires physical-device testing |
| Phone ↔ phone NFC through any app | Unsupported | Core NFC is tag read/write. Android Beam is removed. |
| Discover an uninstalled recipient over custom BLE | Unsupported | The other phone cannot advertise CeleYou’s service UUID |
| Automatic transfer because two phones touch | Unsupported | Not an OS API for third-party apps |

## Official sources

- [About Core Bluetooth](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/AboutCoreBluetooth/Introduction.html)
- [Core Bluetooth background processing](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html)
- [Best practices: iOS as a peripheral](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/BestPracticesForSettingUpYourIOSDeviceAsAPeripheral/BestPracticesForSettingUpYourIOSDeviceAsAPeripheral.html)
- [Core NFC](https://developer.apple.com/documentation/corenfc)
- [BluetoothLeAdvertiser](https://developer.android.com/reference/android/bluetooth/le/BluetoothLeAdvertiser)
- [BluetoothAdapter.getBluetoothLeAdvertiser](https://developer.android.com/reference/android/bluetooth/BluetoothAdapter#getBluetoothLeAdvertiser())
- [Android 10 Android Beam deprecation](https://developer.android.com/about/versions/10/behavior-changes-all)
- [NfcAdapter.CreateBeamUrisCallback deprecated, feature removed](https://developer.android.com/reference/android/nfc/NfcAdapter.CreateBeamUrisCallback)

## Protocol implication (verified in code)

iOS foreground advertisements allow **28 bytes** for local name plus service UUIDs. A JSON hello with `discoveryId` and `joinCode` does not fit.

Broadcast: service UUID `a1c3ce10-7e10-4c0e-9e10-ce1e70c0de01` only.

GATT after connect: hello / ack on session and handshake characteristics. No account tokens.

Evidence: `src/lib/celeyou-proximity/protocol.ts`, `src/lib/celeyou-proximity/__tests__/protocol.test.ts`.

## Background

Out of initial acceptance. iOS background advertising hides the local name and puts service UUIDs in an overflow area discoverable only by iOS devices explicitly scanning for them. Android background BLE is also restricted. Phase C is **foreground, both apps open**.

## No-app recipients

Use AirDrop / Quick Share via the system share sheet, Smart QR, HTTPS `/card/{slug}`, or a programmed NFC tag. Those are OS sharing mechanisms. They are not CeleYou BLE.
