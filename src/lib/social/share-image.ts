import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { resolveMediaUrl } from "@/lib/uploads/media-url";
import { CELEVENTIC_OFFICIAL_LOGO } from "@/lib/qr/qr-constants";

/**
 * Resolve the social share preview image for a guest-facing page (invite
 * links, event public pages, admission passes) shared on WhatsApp, iMessage,
 * Facebook, X/Twitter, Telegram, etc.
 *
 * Resolution order intentionally mirrors the branded QR center mark so the
 * link-preview thumbnail and the QR the guest scans always match:
 * 1. Event's uploaded QR center logo (`event.qrCenterImageUrl`)
 * 2. Admin platform default logo
 * 3. Celeventic official logo (`/brand/logo-full.png`)
 *
 * Always returns an absolute `https://` URL against `appUrl` so social
 * crawlers (which cannot resolve relative paths or localhost) can fetch it.
 */
export async function resolveShareOgImage(eventId: string, appUrl: string): Promise<string> {
  let centerImage: string;
  try {
    centerImage = await qrBrandingService.resolveCenterImageUrl(eventId);
  } catch {
    centerImage = CELEVENTIC_OFFICIAL_LOGO;
  }

  const resolved = resolveMediaUrl(centerImage) || CELEVENTIC_OFFICIAL_LOGO;
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) return resolved;
  return `${appUrl}${resolved.startsWith("/") ? resolved : `/${resolved}`}`;
}
