import { getAppUrlFromEnv } from "@/lib/app-url";

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
    const link = `${appUrl}${options.sharePath.startsWith("/") ? "" : "/"}${options.sharePath}`;
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
