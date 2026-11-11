package com.celeventic.celeyou.proximity

import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context

/**
 * Phase C will implement BluetoothLeAdvertiser + BluetoothLeScanner.
 * This stub must not return simulated peers. Android Beam must not be used.
 */
class CeleYouProximity(private val context: Context) {
    fun canAdvertise(): Boolean {
        val adapter = context.getSystemService(BluetoothManager::class.java)?.adapter ?: return false
        val advertiser: BluetoothLeAdvertiser? = adapter.bluetoothLeAdvertiser
        return advertiser != null && adapter.isEnabled
    }

    fun startAdvertising(): Result<Unit> {
        return Result.failure(
            IllegalStateException("Android BLE advertising is not wired. Phase C requires a physical phone with both apps in the foreground.")
        )
    }

    fun nearbyPeers(): List<Map<String, Any>> = emptyList()
}
