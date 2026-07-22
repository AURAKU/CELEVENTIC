export type DeviceTier = "low" | "mid" | "high";

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
}

/**
 * Progressive-enhancement device gate. SSR returns "low" so the first paint
 * never carries motion the device can't afford; the real tier is detected on
 * mount and motion enhances in. "low" forces the `still` profile, "mid"
 * halves motion intensity (spec class-C behavior).
 */
export function detectDeviceTier(): DeviceTier {
  if (typeof navigator === "undefined") return "low";
  const nav = navigator as NavigatorWithHints;
  const conn = nav.connection;
  const effectiveType = conn?.effectiveType ?? "";

  if (conn?.saveData) return "low";
  if (effectiveType === "slow-2g" || effectiveType === "2g") return "low";

  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  if (memory <= 2 || cores <= 2) return "low";
  if (memory <= 4 || cores <= 4 || effectiveType === "3g") return "mid";
  return "high";
}
