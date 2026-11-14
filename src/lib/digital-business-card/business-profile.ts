/**
 * Optional business extras on a CeleYou. Off by default so personal cards stay personal.
 * Stored on socials.business. Location, payments, website, and booking already live elsewhere.
 */

export type CeleYouBusinessProfile = {
  enabled: boolean;
  hours: string;
  services: string[];
};

const HOURS_MAX = 80;
const SERVICE_MAX = 40;
const SERVICE_LIMIT = 6;

export function defaultBusinessProfile(): CeleYouBusinessProfile {
  return { enabled: false, hours: "", services: [] };
}

export function compactBusinessProfile(raw: unknown): CeleYouBusinessProfile {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const services = Array.isArray(source.services)
    ? source.services
        .map((item) => String(item || "").trim().slice(0, SERVICE_MAX))
        .filter(Boolean)
        .slice(0, SERVICE_LIMIT)
    : [];
  return {
    enabled: source.enabled === true,
    hours: String(source.hours || "").trim().slice(0, HOURS_MAX),
    services,
  };
}

/** Persist only when the owner turned business extras on. */
export function persistBusinessProfile(raw: unknown): CeleYouBusinessProfile | undefined {
  const next = compactBusinessProfile(raw);
  if (!next.enabled) return undefined;
  if (!next.hours && next.services.length === 0) return undefined;
  return next;
}
