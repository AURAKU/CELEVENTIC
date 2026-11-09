/**
 * Shared-secret webhook admission.
 * Unsigned callbacks are never accepted, even if the provider is enabled.
 */
export function sharedSecretWebhookAllowed(
  enabled: boolean,
  configuredSecret: string | null | undefined,
  signature: string | null | undefined
): boolean {
  if (!enabled) return false;
  if (!configuredSecret) return false;
  if (!signature) return false;
  return signature === configuredSecret;
}
