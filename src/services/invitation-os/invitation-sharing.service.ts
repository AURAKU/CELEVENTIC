import { getAppUrlFromEnv, sanitizePublicUrl } from "@/lib/app-url";

/**
 * `sharePath` is meant to be a relative path (e.g. `/invite/abc`), but a
 * caller passing an already-absolute URL used to get it blindly concatenated
 * onto `appUrl` — producing a mangled double-URL like
 * `https://www.celeventic.com/https://www.celeventic.com/invite/abc` (or,
 * worse, leaking a stale `http://localhost:3000/...` share link if the
 * absolute value hadn't been sanitized upstream). Normalize defensively here
 * so this builder is safe regardless of what a caller passes.
 */
function resolveShareLink(sharePath: string, appUrl: string): string {
  if (/^https?:\/\//i.test(sharePath)) {
    return sanitizePublicUrl(sharePath, appUrl);
  }
  const path = sharePath.startsWith("/") ? sharePath : `/${sharePath}`;
  return `${appUrl}${path}`;
}

export interface WhatsAppSharePack {
  generalText: string;
  generalTextFr?: string;
  shareLink: string;
  guestPersonalizedLink: (guestToken: string, guestName: string) => string;
  guestMessage: (guestName: string, guestToken: string) => string;
  bulkCampaignText: (eventTitle: string, guestCount: number) => string;
}

export class InvitationSharingService {
  buildWhatsAppPack(options: {
    eventTitle: string;
    eventDate?: string;
    venue?: string;
    sharePath: string;
    hostName?: string;
    language?: "en" | "fr" | "both";
  }): WhatsAppSharePack {
    const appUrl = getAppUrlFromEnv();
    const link = resolveShareLink(options.sharePath, appUrl);
    const dateLine = options.eventDate
      ? new Date(options.eventDate).toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
      : "Date TBA";

    const generalText =
      `✨ *${options.eventTitle}*\n\n` +
      `You're invited to something special.\n` +
      `📅 ${dateLine}\n` +
      `${options.venue ? `📍 ${options.venue}\n` : ""}` +
      `\nOpen your Celeventic invitation:\n${link}\n\n` +
      `_Powered by Celeventic — Global Event Operating System_`;

    const generalTextFr =
      `✨ *${options.eventTitle}*\n\n` +
      `Vous êtes invité(e) à un moment spécial.\n` +
      `📅 ${dateLine}\n` +
      `${options.venue ? `📍 ${options.venue}\n` : ""}` +
      `\nOuvrez votre invitation Celeventic:\n${link}`;

    return {
      generalText,
      generalTextFr: options.language !== "en" ? generalTextFr : undefined,
      shareLink: link,
      guestPersonalizedLink: (token, _name) => `${link}${link.includes("?") ? "&" : "?"}guest=${token}`,
      guestMessage: (name, token) =>
        `Dear ${name},\n\nYou are personally invited to *${options.eventTitle}*.\n\n` +
        `📅 ${dateLine}\n` +
        `${options.venue ? `📍 ${options.venue}\n` : ""}` +
        `\nYour private invitation link:\n${link}?guest=${token}\n\n` +
        `We hope to see you there. — ${options.hostName ?? "Your hosts"}`,
      bulkCampaignText: (title, count) =>
        `Celeventic bulk invite ready: *${title}* — ${count} guests. ` +
        `Personalized WhatsApp messages generated. Review in Guest CRM before sending.`,
    };
  }

  whatsAppUrl(text: string) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
}

export const invitationSharingService = new InvitationSharingService();
