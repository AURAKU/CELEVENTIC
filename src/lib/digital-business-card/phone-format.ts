/** Compact a stored phone into an E.164-ish value when the country code is already present. */

const LEADING_PLUS = /^\+/;
const LEADING_00 = /^00/;

export function compactDialDigits(value: string): string {
  return value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

export function detectCallingCode(value: string): string | null {
  const compact = compactDialDigits(value);
  if (LEADING_PLUS.test(compact) && compact.length >= 8) {
    const digits = compact.slice(1);
    if (digits.startsWith("233") && digits.length >= 12) return "233";
    if (digits.startsWith("1") && digits.length >= 11) return "1";
    if (digits.length >= 8) {
      const match = digits.match(/^(\d{1,3})/);
      return match?.[1] ?? null;
    }
  }
  if (compact.startsWith("233") && compact.length >= 12) return "233";
  return null;
}

/**
 * Build a tel: href. Never invents a country. Numbers that already include + or 00
 * become E.164. Sibling numbers on the same card can inherit a calling code already
 * present on another number.
 */
export function internationalTelHref(value: string, callingCodeHint?: string | null): string {
  const raw = value.replace(/^tel:/i, "").trim();
  if (!raw) return "";
  const compact = compactDialDigits(raw);
  if (!compact) return "";

  if (LEADING_PLUS.test(compact) && compact.replace(/\D/g, "").length >= 7) {
    return `tel:${compact}`;
  }
  if (LEADING_00.test(compact) && compact.length >= 9) {
    return `tel:+${compact.slice(2)}`;
  }
  if (compact.startsWith("233") && compact.length >= 12) {
    return `tel:+${compact}`;
  }

  const code = (callingCodeHint || "").replace(/\D/g, "");
  if (code && compact.startsWith("0") && compact.length >= 9) {
    return `tel:+${code}${compact.slice(1)}`;
  }
  if (code && /^\d{7,15}$/.test(compact) && !compact.startsWith("0")) {
    return `tel:+${code}${compact}`;
  }

  return `tel:${compact}`;
}

export function displayPhone(value: string): string {
  const raw = value.replace(/^tel:/i, "").trim();
  if (!raw) return "";
  const compact = compactDialDigits(raw);
  if (compact.startsWith("+233") && compact.length === 13) {
    return `+233 ${compact.slice(4, 6)} ${compact.slice(6, 9)} ${compact.slice(9)}`;
  }
  if (compact.startsWith("+") && compact.length >= 8) return compact;
  return raw;
}

export function callingCodeFromPhones(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (!value) continue;
    const code = detectCallingCode(value);
    if (code) return code;
  }
  return null;
}
