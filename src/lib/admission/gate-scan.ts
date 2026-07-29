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

export type GateScanKind =
  | { kind: "pass_token"; token: string; raw: string }
  | { kind: "admission_code"; code: string; raw: string }
  | { kind: "legacy"; raw: string };

/**
 * Route scanner / keypad input to the Guest Entry Pass path or legacy QR.
 *
 * Digit-only 4/6 codes prefer the entry-pass admit API (with legacy
 * fallback at the UI when the pass is not found). Everything else that is
 * not a `cvp1` token goes to the legacy guest/ticket check-in path.
 */
export function classifyGateInput(raw: string): GateScanKind {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "legacy", raw: "" };

  const token = extractPassToken(trimmed);
  if (token) return { kind: "pass_token", token, raw: trimmed };

  // Only treat as a gate code when the whole payload is digits/separators —
  // never peel digits out of a longer URL or opaque token.
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
  return kind === "pass_token" || kind === "admission_code";
}
