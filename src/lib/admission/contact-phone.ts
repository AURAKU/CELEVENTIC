/**
 * Event Day / companion host phone helpers.
 * Events may omit contactPhone; never invent numbers or borrow another party’s.
 */

/** Trimmed display string, or empty when absent/invalid. */
export function displayContactPhone(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Digits (and a leading +) only, suitable for `tel:` hrefs.
 * Returns "" when there is no callable number — callers must not render a link.
 */
export function normalizeCallablePhone(value: unknown): string {
  const contactPhone = displayContactPhone(value);
  if (!contactPhone) return "";
  // Keep a single leading +, strip spaces / dashes / parentheses / letters.
  const cleaned = contactPhone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  // Reject strings that are only "+" or have no digits.
  if (!/\d/.test(cleaned)) return "";
  return cleaned;
}
