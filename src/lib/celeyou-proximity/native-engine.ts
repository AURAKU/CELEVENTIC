import type { CeleYouNativeBleBridge } from "@/lib/celeyou-proximity/native-bridge";
import { webNativeBleBridge } from "@/lib/celeyou-proximity/native-bridge";
import type { ProximityBleHello } from "@/lib/celeyou-proximity/protocol";

export type NearbyPeer = {
  discoveryId: string;
  joinCode: string;
  /** Signal hint only. Never proof that two phones touched. */
  rssi: number | null;
  reportedAt: number;
};

export type NativeDiscoverResult = {
  ok: boolean;
  peers: NearbyPeer[];
  reason: "started" | "native-unavailable" | "bluetooth-off" | "permission-denied" | "cancelled";
};

/**
 * Native proximity engine. Peers exist only when the BLE bridge reports them.
 * The website bridge cannot advertise, so this list stays empty in browsers.
 */
export class CeleYouProximityEngine {
  private readonly peers = new Map<string, NearbyPeer>();
  private scanning = false;

  constructor(private readonly bridge: CeleYouNativeBleBridge = webNativeBleBridge()) {}

  listPeers(): NearbyPeer[] {
    return [...this.peers.values()];
  }

  async startDiscovering(hello: ProximityBleHello): Promise<NativeDiscoverResult> {
    this.peers.clear();
    if (!this.bridge.canAdvertise) {
      return { ok: false, peers: [], reason: "native-unavailable" };
    }
    try {
      this.scanning = true;
      await this.bridge.startAdvertising(hello);
      await this.bridge.startScanning((incoming) => {
        this.peers.set(incoming.discoveryId, {
          discoveryId: incoming.discoveryId,
          joinCode: incoming.joinCode,
          rssi: null,
          reportedAt: Date.now(),
        });
      });
      return { ok: true, peers: this.listPeers(), reason: "started" };
    } catch {
      this.scanning = false;
      return { ok: false, peers: [], reason: "native-unavailable" };
    }
  }

  async stopDiscovering(): Promise<void> {
    this.scanning = false;
    this.peers.clear();
    await this.bridge.stopScanning();
    await this.bridge.stopAdvertising();
  }

  isScanning(): boolean {
    return this.scanning;
  }
}

export function rssiIsPhysicalTouchProof(_rssi: number | null): false {
  return false;
}
