package com.celeventic.celeyou.proximity

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.ParcelUuid
import org.json.JSONObject
import java.util.UUID

/**
 * Foreground BLE advertiser, GATT server, and scanner for CeleYou Tap-to-Connect.
 * Advertisements carry only the service UUID. Hello (discovery id + join code) is GATT-only.
 * Android Beam is not used. Nearby peers are never invented.
 */
class CeleYouProximity(private val context: Context) {
    private val serviceUuid: UUID = UUID.fromString("a1c3ce10-7e10-4c0e-9e10-ce1e70c0de01")
    private val sessionUuid: UUID = UUID.fromString("a1c3ce11-7e10-4c0e-9e10-ce1e70c0de01")
    private val handshakeUuid: UUID = UUID.fromString("a1c3ce12-7e10-4c0e-9e10-ce1e70c0de01")
    private val manager = context.getSystemService(BluetoothManager::class.java)
    private var gattServer: BluetoothGattServer? = null
    private var helloBytes: ByteArray = ByteArray(0)
    private val peers = linkedMapOf<String, Map<String, Any>>()
    private val pendingRssi = linkedMapOf<String, Int>()
    private val gattClients = mutableListOf<BluetoothGatt>()

    private val advertiseCallback = object : AdvertiseCallback() {}
    private val scanCallback = object : ScanCallback() {
        @SuppressLint("MissingPermission")
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device ?: return
            pendingRssi[device.address] = result.rssi
            device.connectGatt(context, false, gattCallback)
        }
    }
    private val gattCallback = object : BluetoothGattCallback() {
        @SuppressLint("MissingPermission")
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                gatt.discoverServices()
            }
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            val characteristic = gatt.getService(serviceUuid)?.getCharacteristic(sessionUuid) ?: return
            @Suppress("DEPRECATION")
            gatt.readCharacteristic(characteristic)
        }

        override fun onCharacteristicRead(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            value: ByteArray,
            status: Int
        ) {
            recordHello(value, pendingRssi[gatt.device.address])
        }
    }

    fun canAdvertise(): Boolean {
        val adapter = manager?.adapter ?: return false
        val advertiser: BluetoothLeAdvertiser? = adapter.bluetoothLeAdvertiser
        return advertiser != null && adapter.isEnabled
    }

    @SuppressLint("MissingPermission")
    fun startAdvertising(helloJson: String): Result<Unit> {
        val adapter = manager?.adapter ?: return Result.failure(IllegalStateException("bluetooth-off"))
        val advertiser = adapter.bluetoothLeAdvertiser
            ?: return Result.failure(IllegalStateException("native-unavailable"))
        if (!adapter.isEnabled) return Result.failure(IllegalStateException("bluetooth-off"))
        helloBytes = helloJson.toByteArray(Charsets.UTF_8)
        openGattServer()
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setConnectable(true)
            .setTimeout(0)
            .build()
        val data = AdvertiseData.Builder()
            .addServiceUuid(ParcelUuid(serviceUuid))
            .setIncludeDeviceName(true)
            .build()
        advertiser.startAdvertising(settings, data, advertiseCallback)
        return Result.success(Unit)
    }

    @SuppressLint("MissingPermission")
    fun stopAdvertising() {
        manager?.adapter?.bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
        gattServer?.close()
        gattServer = null
    }

    @SuppressLint("MissingPermission")
    fun startScanning(): Result<Unit> {
        val scanner = manager?.adapter?.bluetoothLeScanner
            ?: return Result.failure(IllegalStateException("native-unavailable"))
        peers.clear()
        val filter = ScanFilter.Builder().setServiceUuid(ParcelUuid(serviceUuid)).build()
        val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
        scanner.startScan(listOf(filter), settings, scanCallback)
        return Result.success(Unit)
    }

    @SuppressLint("MissingPermission")
    fun stopScanning() {
        manager?.adapter?.bluetoothLeScanner?.stopScan(scanCallback)
        gattClients.forEach { it.close() }
        gattClients.clear()
    }

    fun nearbyPeers(): List<Map<String, Any>> = peers.values.toList()

    @SuppressLint("MissingPermission")
    private fun openGattServer() {
        val service = BluetoothGattService(serviceUuid, BluetoothGattService.SERVICE_TYPE_PRIMARY)
        val session = BluetoothGattCharacteristic(
            sessionUuid,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        session.value = helloBytes
        service.addCharacteristic(session)
        val handshake = BluetoothGattCharacteristic(
            handshakeUuid,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE
        )
        service.addCharacteristic(handshake)
        gattServer = manager?.openGattServer(context, object : BluetoothGattServerCallback() {
            override fun onCharacteristicReadRequest(
                device: BluetoothDevice,
                requestId: Int,
                offset: Int,
                characteristic: BluetoothGattCharacteristic
            ) {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, helloBytes)
            }
        })
        gattServer?.addService(service)
    }

    private fun recordHello(value: ByteArray, rssi: Int?) {
        val json = runCatching { JSONObject(String(value, Charsets.UTF_8)) }.getOrNull() ?: return
        val discoveryId = json.optString("discoveryId")
        val joinCode = json.optString("joinCode")
        if (discoveryId.length < 16 || joinCode.length < 4) return
        if (peers.containsKey(discoveryId)) return
        peers[discoveryId] = mapOf(
            "discoveryId" to discoveryId,
            "joinCode" to joinCode,
            "rssi" to (rssi ?: JSONObject.NULL)
        )
    }
}
