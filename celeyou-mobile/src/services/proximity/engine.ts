/**
 * Mobile entry for the shared engine.
 * Peers are never invented here. Import the tested implementation from the web repo
 * until a React Native workspace can resolve `@/` aliases.
 */
export {
  CeleYouProximityEngine,
  rssiIsPhysicalTouchProof,
  type NearbyPeer,
  type NativeDiscoverResult,
} from "../../../src/lib/celeyou-proximity/native-engine";
