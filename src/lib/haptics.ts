/** Light haptic pulse for premium mobile interactions (envelope tap, seal lift). */
export function triggerHapticLight() {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(12);
  } catch {
    // ignore unsupported environments
  }
}
