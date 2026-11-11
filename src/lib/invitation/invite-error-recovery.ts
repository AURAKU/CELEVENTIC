import { DEFAULT_PRODUCTION_URL, isLocalHost } from "@/lib/app-url";

/**
 * Local previews (Cursor, 127.0.0.1, localhost) are not how guests open an
 * invitation. When that origin cannot finish loading, hand the guest the same
 * path on the live Celeventic domain.
 */
export function inviteLiveRecoveryUrl(input: {
  hostname: string;
  pathname: string;
  search?: string;
  hash?: string;
}): string | null {
  if (!isLocalHost(input.hostname)) return null;
  if (!input.pathname.startsWith("/invite/")) return null;
  const path = input.pathname;
  if (path === "/invite" || path === "/invite/") return null;
  return `${DEFAULT_PRODUCTION_URL}${path}${input.search ?? ""}${input.hash ?? ""}`;
}
