/**
 * Classify raw gate input (camera decode, screenshot upload, or keypad)
 * before it hits a write path. Classification is client-safe shape routing
 * only — admission still requires server HMAC / event-scope validation.
 */
import { extractPassToken } from "@/lib/admission/pass-token-format";
import {
  isAdmissionCode,
  normalizeAdmissionCode,
} from "@/lib/admission/pass-code";
import { extractVendorTeamToken } from "@/lib/vendor-pass/token-format";

export type GateScanKind =
  | { kind: "pass_token"; token: string; raw: string }
  | { kind: "vendor_team_token"; token: string; raw: string }
  | { kind: "admission_code"; code: string; raw: string }
  | { kind: "legacy"; raw: string };

/**
 * Route scanner / keypad input to Guest Entry Pass, Vendor Team Pass, or legacy QR.
 */
export function classifyGateInput(raw: string): GateScanKind {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "legacy", raw: "" };

  const vendorTeam = extractVendorTeamToken(trimmed);
  if (vendorTeam) return { kind: "vendor_team_token", token: vendorTeam, raw: trimmed };

  const token = extractPassToken(trimmed);
  if (token) return { kind: "pass_token", token, raw: trimmed };

  if (/^[\d\s\-]+$/.test(trimmed)) {
    const code = normalizeAdmissionCode(trimmed);
    if (isAdmissionCode(code)) {
      return { kind: "admission_code", code, raw: trimmed };
    }
  }

  return { kind: "legacy", raw: trimmed };
}

/** True when this input should attempt `/api/admission/admit` first. */
export function prefersEntryPassAdmit(raw: string): boolean {
  const kind = classifyGateInput(raw).kind;
  return kind === "pass_token" || kind === "admission_code" || kind === "vendor_team_token";
}
