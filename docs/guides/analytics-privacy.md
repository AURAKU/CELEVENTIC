/**
 * Celeventic Guide analytics privacy (§57)
 *
 * Enforced in:
 * - `src/lib/celeventic-guide/analytics-privacy.ts`
 * - `src/lib/celeventic-guide/analytics.ts` (client)
 * - `src/app/api/analytics/guides/route.ts` (server)
 *
 * Never records:
 * - Guest names / emails / phones
 * - Admission codes, QR tokens, pass tokens
 * - Payment references, card data, amounts
 * - Private invite / admission / gift / memory token URLs
 *
 * Search analytics are sanitized (emails, phones, token-like strings redacted).
 * Paths with sensitive segments are rewritten to `[redacted]`.
 */

export {};
