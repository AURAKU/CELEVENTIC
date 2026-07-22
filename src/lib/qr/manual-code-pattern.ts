/** Event-scoped 4-digit gate codes (0000–9999). Pure helpers — safe for client bundles. */

const MANUAL_CODE_PATTERN = /^\d{4}$/;

export function isManualAdmissionCode(value: string): boolean {
  return MANUAL_CODE_PATTERN.test(value.trim());
}
