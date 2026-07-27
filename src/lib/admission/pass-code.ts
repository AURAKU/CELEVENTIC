/**
 * Human-readable admission codes.
 *
 * Guests read these aloud at a noisy gate, so they stay numeric: 4 digits by
 * default, automatically promoted to 6 when the guest list is large enough
 * that the 4-digit space would be uncomfortably dense (collision retries turn
 * into a slow allocation loop, and a near-full space makes guessing cheap).
 *
 * Pure module — no Prisma, no crypto secrets — so both the allocator and the
 * scanner can share it, and it is fully unit-testable.
 */

export const SHORT_CODE_LENGTH = 4;
export const LONG_CODE_LENGTH = 6;

/** Beyond this fraction of the space we promote to 6 digits. */
const DENSITY_CEILING = 0.4;

export const ADMISSION_CODE_PATTERN = /^(\d{4}|\d{6})$/;

export function isAdmissionCode(value: string): boolean {
  return ADMISSION_CODE_PATTERN.test(value.trim());
}

/** Normalise operator input: strip spaces, dashes and other separators. */
export function normalizeAdmissionCode(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function codeSpace(length: number): number {
  return 10 ** length;
}

/**
 * Choose the code length for an event.
 *
 * @param expectedPasses  how many passes the event will need (guest list size)
 * @param configuredLength organiser override; only honoured when it is large
 *                         enough for the guest list
 */
export function resolveCodeLength(
  expectedPasses: number,
  configuredLength?: number | null
): number {
  const needed =
    expectedPasses > codeSpace(SHORT_CODE_LENGTH) * DENSITY_CEILING
      ? LONG_CODE_LENGTH
      : SHORT_CODE_LENGTH;

  if (configuredLength === LONG_CODE_LENGTH) return LONG_CODE_LENGTH;
  if (configuredLength === SHORT_CODE_LENGTH) return needed;
  return needed;
}

/**
 * Format a code for display: 4-digit stays as-is, 6-digit is split into two
 * triplets so guests can read it out without losing their place.
 */
export function formatAdmissionCode(code: string): string {
  const digits = normalizeAdmissionCode(code);
  if (digits.length === LONG_CODE_LENGTH) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return digits;
}

/**
 * Deterministically expand a random integer into a zero-padded code of the
 * requested length. Callers supply randomness so this stays pure/testable.
 */
export function codeFromRandom(random: number, length: number): string {
  const space = codeSpace(length);
  const value = Math.abs(Math.trunc(random)) % space;
  return String(value).padStart(length, "0");
}
