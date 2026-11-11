import type { CeleYouNativeBleBridge } from "@/lib/celeyou-proximity/native-bridge";
import { webNativeBleBridge } from "@/lib/celeyou-proximity/native-bridge";
import { TAP_PEER_STALE_MS } from "@/lib/celeyou-proximity/product";
import type { ProximityBleHello } from "@/lib/celeyou-proximity/protocol";

export type NearbyPeer = {
  discoveryId: string;
  joinCode: string;
  /** Signal hint only. Never proof that two phones touched. */
  rssi: number | null;
  reportedAt: number;
};

export type NativeDiscoverReason =
  | "started"
  | "native-unavailable"
  | "bluetooth-off"
  | "permission-denied"
  | "cancelled";

export type NativeDiscoverResult = {
  ok: boolean;
  peers: NearbyPeer[];
  reason: NativeDiscoverReason;
};

/**
 * Native proximity engine. Peers exist only when the BLE bridge reports them.
 * The website bridge cannot advertise, so this list stays empty in browsers.
 */
export class CeleYouProximityEngine {
  private readonly peers = new Map<string, NearbyPeer>();
  private scanning = false;

  constructor(private readonly bridge: CeleYouNativeBleBridge = webNativeBleBridge()) {}

  listPeers(now = Date.now()): NearbyPeer[] {
    this.pruneStalePeers(now);
    return [...this.peers.values()].sort((left, right) => (right.rssi ?? -999) - (left.rssi ?? -999));
  }

  selectPeer(discoveryId: string, now = Date.now()): NearbyPeer | null {
    this.pruneStalePeers(now);
    return this.peers.get(discoveryId) ?? null;
  }

  pruneStalePeers(now = Date.now()): void {
    for (const [id, peer] of this.peers) {
      if (now - peer.reportedAt > TAP_PEER_STALE_MS) this.peers.delete(id);
    }
  }

  async startDiscovering(hello: ProximityBleHello): Promise<NativeDiscoverResult> {
    this.peers.clear();
    if (!this.bridge.canAdvertise) {
      return { ok: false, peers: [], reason: "native-unavailable" };
    }
    try {
      this.scanning = true;
      await this.bridge.startAdvertising(hello);
      await this.bridge.startScanning((incoming, meta) => {
        if (incoming.discoveryId === hello.discoveryId) return;
        this.peers.set(incoming.discoveryId, {
          discoveryId: incoming.discoveryId,
          joinCode: incoming.joinCode,
          rssi: typeof meta?.rssi === "number" ? meta.rssi : null,
          reportedAt: Date.now(),
        });
      });
      return { ok: true, peers: this.listPeers(), reason: "started" };
    } catch (error) {
      this.scanning = false;
      this.peers.clear();
      return { ok: false, peers: [], reason: classifyDiscoverFailure(error) };
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

export function classifyDiscoverFailure(error: unknown): NativeDiscoverReason {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/permission/i.test(message)) return "permission-denied";
  if (/bluetooth-off|powered.?off|turn on bluetooth/i.test(message)) return "bluetooth-off";
  if (/cancel/i.test(message)) return "cancelled";
  return "native-unavailable";
}

export function rssiIsPhysicalTouchProof(_rssi: number | null): false {
  return false;
}

export function nearbySignalHint(rssi: number | null): "closer" | "nearby" | "unknown" {
  if (typeof rssi !== "number") return "unknown";
  if (rssi >= -55) return "closer";
  return "nearby";
}
