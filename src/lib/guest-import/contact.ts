/**
 * Contact normalisation for bulk guest import.
 *
 * Phone and email are optional throughout the import — a name-only guest is a
 * first-class guest. Nothing here ever rejects a row; the worst outcome is a
 * warning and a dropped contact, so a typo'd email can never cost somebody
 * their invitation.
 */

/** Ghana country calling code. */
export const GHANA_DIALING_CODE = "233";

/**
 * Valid Ghanaian mobile network prefixes (the digit pair after the leading 0).
 * Kept explicit rather than "any 0XX" so a mistyped landline or a truncated
 * number is flagged instead of being confidently mangled into E.164.
 */
const GHANA_MOBILE_PREFIXES = new Set([
  "20", "23", "24", "25", "26", "27", "28", "29",
  "50", "53", "54", "55", "56", "57", "59",
]);

export interface PhoneNormalizationResult {
  /** E.164 when confidently normalised, else the cleaned original. */
  value: string | null;
  /** Exactly what the organiser typed, whitespace-trimmed. */
  raw: string | null;
  /** True when the value was rewritten into +233 E.164. */
  normalized: boolean;
  /** True when the digits cannot be a reachable number. */
  invalid: boolean;
}

function digitsOnly(input: string): string {
  return input.replace(/\D+/g, "");
}

/**
 * Normalise a Ghanaian number to +233XXXXXXXXX.
 *
 * Accepts every shape a guest list actually contains: `0244123456`,
 * `024 412 3456`, `+233 24 412 3456`, `233244123456`, `00233244123456`, and
 * the 9-digit `244123456` that Excel produces when it strips a leading zero
 * from a cell it decided was a number.
 */
export function normalizeGhanaPhone(input: string | null | undefined): PhoneNormalizationResult {
  const raw = input?.trim() ?? "";
  if (!raw) return { value: null, raw: null, normalized: false, invalid: false };

  // Keep an explicit non-Ghanaian international number exactly as given: an
  // organiser inviting family abroad must not have it rewritten to +233.
  const hasPlus = raw.startsWith("+");
  let digits = digitsOnly(raw);
  if (digits.length === 0) return { value: null, raw, normalized: false, invalid: true };

  if (digits.startsWith("00")) digits = digits.slice(2);

  if (hasPlus && !digits.startsWith(GHANA_DIALING_CODE)) {
    // Foreign E.164 — sanity-check the length only.
    const ok = digits.length >= 8 && digits.length <= 15;
    return { value: ok ? `+${digits}` : raw, raw, normalized: false, invalid: !ok };
  }

  let national: string | null = null;

  if (digits.startsWith(GHANA_DIALING_CODE) && digits.length === 12) {
    national = digits.slice(3);
  } else if (digits.length === 10 && digits.startsWith("0")) {
    national = digits.slice(1);
  } else if (digits.length === 9) {
    // Excel ate the leading zero.
    national = digits;
  }

  if (national && national.length === 9 && GHANA_MOBILE_PREFIXES.has(national.slice(0, 2))) {
    return {
      value: `+${GHANA_DIALING_CODE}${national}`,
      raw,
      normalized: `+${GHANA_DIALING_CODE}${national}` !== raw,
      invalid: false,
    };
  }

  // Not confidently Ghanaian: keep what was typed, flag only if it cannot be a
  // phone number at all. Organisers can fix it in the preview.
  const plausible = digits.length >= 7 && digits.length <= 15;
  return {
    value: plausible ? (hasPlus ? `+${digits}` : raw) : null,
    raw,
    normalized: false,
    invalid: !plausible,
  };
}

/** Normalise without the Ghana rules — only strips noise and validates length. */
export function normalizePlainPhone(input: string | null | undefined): PhoneNormalizationResult {
  const raw = input?.trim() ?? "";
  if (!raw) return { value: null, raw: null, normalized: false, invalid: false };
  const digits = digitsOnly(raw);
  const plausible = digits.length >= 7 && digits.length <= 15;
  return { value: plausible ? raw : null, raw, normalized: false, invalid: !plausible };
}

export function normalizePhone(
  input: string | null | undefined,
  ghanaMode: boolean
): PhoneNormalizationResult {
  return ghanaMode ? normalizeGhanaPhone(input) : normalizePlainPhone(input);
}

/**
 * Pragmatic email check: one @, a dot-bearing domain, no whitespace or commas.
 * Deliberately not RFC 5322 — the goal is catching "kofi@gmail" and
 * "kofi at gmail.com", not litigating quoted local parts.
 */
const EMAIL_PATTERN = /^[^\s@,;<>()[\]\\]+@[^\s@,;<>()[\]\\]+\.[A-Za-z]{2,}$/;

export interface EmailNormalizationResult {
  value: string | null;
  invalid: boolean;
}

export function normalizeEmail(input: string | null | undefined): EmailNormalizationResult {
  const raw = input?.trim() ?? "";
  if (!raw) return { value: null, invalid: false };

  // "Kofi Mensah <kofi@example.com>" — take the addr-spec.
  const angled = /<([^>]+)>/.exec(raw)?.[1]?.trim();
  const candidate = (angled ?? raw).toLowerCase();

  if (!EMAIL_PATTERN.test(candidate)) return { value: null, invalid: true };
  return { value: candidate, invalid: false };
}
