import { prisma } from "@/lib/prisma";
import { GUEST_TIERS } from "@/lib/constants";
import {
  getProviderCredentials,
  isProviderEnabled,
} from "@/lib/integrations/integration-runtime";
import { getPlatformDefaultProviders } from "@/lib/integrations/platform-provider-settings";
import type { CommunicationPreview } from "@/types";
import type { CampaignChannel } from "@prisma/client";

const CHANNEL_PRICES: Record<CampaignChannel, number> = {
  SMS: 0.15,
  WHATSAPP: 0.25,
  EMAIL: 0.05,
};

export interface SendCampaignParams {
  userId: string;
  eventId?: string;
  name: string;
  channel: CampaignChannel;
  message: string;
  recipients: { name?: string; contact: string }[];
  guestTier?: number;
}

export class CommunicationProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommunicationProviderError";
  }
}

/**
 * Communication Hub — sends via admin-configured providers (no mock success paths).
 */
export class CommunicationService {
  calculateCost(channel: CampaignChannel, recipientCount: number): number {
    return CHANNEL_PRICES[channel] * recipientCount;
  }

  getNearestTier(count: number): number {
    return GUEST_TIERS.find((t) => t >= count) ?? GUEST_TIERS[GUEST_TIERS.length - 1];
  }

  previewCampaign(channel: CampaignChannel, message: string, recipientCount: number): CommunicationPreview {
    return {
      channel,
      message: this.personalizeMessage(message, "{{guest_name}}"),
      recipientCount,
      estimatedCost: this.calculateCost(channel, recipientCount),
    };
  }

  personalizeMessage(template: string, guestName: string): string {
    return template.replace(/\{\{guest_name\}\}/gi, guestName);
  }

  async createCampaign(params: SendCampaignParams) {
    const tier = params.guestTier ?? this.getNearestTier(params.recipients.length);
    const totalCost = this.calculateCost(params.channel, params.recipients.length);

    return prisma.campaign.create({
      data: {
        userId: params.userId,
        eventId: params.eventId,
        name: params.name,
        channel: params.channel,
        message: params.message,
        guestTier: tier,
        totalCost,
        status: "DRAFT",
        messages: {
          create: params.recipients.map((r) => ({
            recipient: r.contact,
            guestName: r.name,
            status: "PENDING",
          })),
        },
      },
      include: { messages: true },
    });
  }

  async sendCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { messages: true },
    });

    if (!campaign) throw new Error("Campaign not found");

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENDING" },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const message of campaign.messages) {
      try {
        const personalized = this.personalizeMessage(
          campaign.message,
          message.guestName ?? "Guest"
        );

        await this.dispatchMessage(campaign.channel, message.recipient, personalized);

        await prisma.campaignMessage.update({
          where: { id: message.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        sentCount++;
      } catch (error) {
        await prisma.campaignMessage.update({
          where: { id: message.id },
          data: {
            status: "FAILED",
            // store last error in a safe field if schema allows — otherwise log
          },
        });
        console.error("[comms.send]", campaign.channel, message.recipient, error);
        failedCount++;
      }
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "COMPLETED", sentCount, failedCount },
    });

    return { sentCount, failedCount };
  }

  private async dispatchMessage(channel: CampaignChannel, recipient: string, message: string) {
    switch (channel) {
      case "EMAIL":
        return this.sendEmail(recipient, message);
      case "SMS":
        return this.sendSMS(recipient, message);
      case "WHATSAPP":
        return this.sendWhatsApp(recipient, message);
    }
  }

  async sendTransactionalEmail(params: {
    to: string;
    subject: string;
    body: string;
    locale?: string;
    templateType?: string;
    html?: string;
  }) {
    const defaults = await getPlatformDefaultProviders();
    const provider = defaults.email || "RESEND";

    if (!(await isProviderEnabled(provider))) {
      throw new CommunicationProviderError(
        `Email provider "${provider}" is not enabled. Configure it in Admin → Integrations.`
      );
    }

    const creds = await getProviderCredentials(provider);
    if (!creds.secret) {
      throw new CommunicationProviderError(
        `Email provider "${provider}" has no API key. Add it in Admin → Integrations.`
      );
    }

    if (provider === "RESEND" || provider.startsWith("CUSTOM_")) {
      const from =
        (typeof creds.config.fromEmail === "string" && creds.config.fromEmail) ||
        process.env.EMAIL_FROM ||
        "Celeventic <noreply@celeventic.com>";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject: params.subject,
          text: params.body,
          html: params.html ?? `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(params.body)}</pre>`,
          tags: params.templateType
            ? [{ name: "template", value: params.templateType }]
            : undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { message?: string; id?: string };
      if (!res.ok) {
        throw new CommunicationProviderError(data.message || `Resend error (${res.status})`);
      }
      return { success: true, id: data.id, provider };
    }

    throw new CommunicationProviderError(`Unsupported email provider: ${provider}`);
  }

  private async sendEmail(to: string, message: string) {
    return this.sendTransactionalEmail({ to, subject: "Celeventic", body: message });
  }

  private async sendSMS(to: string, message: string) {
    const defaults = await getPlatformDefaultProviders();
    const provider = defaults.sms || "SMS";

    if (!(await isProviderEnabled(provider))) {
      throw new CommunicationProviderError(
        `SMS provider "${provider}" is not enabled. Configure it in Admin → Integrations.`
      );
    }

    const creds = await getProviderCredentials(provider);
    if (!creds.secret) {
      throw new CommunicationProviderError(`SMS provider "${provider}" has no API key.`);
    }

    const endpoint =
      (typeof creds.config.endpoint === "string" && creds.config.endpoint) ||
      process.env.SMS_API_ENDPOINT ||
      null;
    const senderId =
      (typeof creds.config.senderId === "string" && creds.config.senderId) ||
      process.env.SMS_SENDER_ID ||
      "Celeventic";

    // Hubtel SMS when SMS provider is configured as Hubtel-compatible
    if (provider === "HUBTEL" || creds.config.driver === "hubtel") {
      const clientId = creds.publicKey;
      const clientSecret = creds.secret;
      if (!clientId) {
        throw new CommunicationProviderError("Hubtel SMS requires Client ID as public key.");
      }
      const from = senderId;
      const url = `https://sms.hubtel.com/v1/messages/send?From=${encodeURIComponent(from)}&To=${encodeURIComponent(to)}&Content=${encodeURIComponent(message)}&ClientId=${encodeURIComponent(clientId)}&ClientSecret=${encodeURIComponent(clientSecret)}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        const text = await res.text();
        throw new CommunicationProviderError(`Hubtel SMS failed: ${text.slice(0, 200)}`);
      }
      return { success: true, provider: "HUBTEL" };
    }

    if (!endpoint) {
      throw new CommunicationProviderError(
        'SMS endpoint missing. Set config.endpoint (e.g. your SMS gateway URL) in Admin → Integrations → SMS.'
      );
    }

    const authHeader =
      typeof creds.config.authHeader === "string"
        ? creds.config.authHeader
        : `Bearer ${creds.secret}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        from: senderId,
        message,
        senderId,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new CommunicationProviderError(`SMS send failed (${res.status}): ${text.slice(0, 200)}`);
    }

    return { success: true, provider };
  }

  private async sendWhatsApp(to: string, message: string) {
    const defaults = await getPlatformDefaultProviders();
    const provider = defaults.whatsapp || "WHATSAPP";

    if (!(await isProviderEnabled(provider))) {
      throw new CommunicationProviderError(
        `WhatsApp provider "${provider}" is not enabled. Configure it in Admin → Integrations.`
      );
    }

    const creds = await getProviderCredentials(provider);
    if (!creds.secret) {
      throw new CommunicationProviderError(`WhatsApp provider has no access token.`);
    }

    const phoneNumberId =
      creds.publicKey ||
      (typeof creds.config.phoneNumberId === "string" ? creds.config.phoneNumberId : null) ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      null;

    if (!phoneNumberId) {
      throw new CommunicationProviderError(
        "WhatsApp Phone Number ID required (store as Public Key or config.phoneNumberId)."
      );
    }

    const normalized = to.replace(/[^\d]/g, "");
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalized,
        type: "text",
        text: { body: message },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      messages?: unknown[];
    };

    if (!res.ok) {
      throw new CommunicationProviderError(
        data.error?.message || `WhatsApp API error (${res.status})`
      );
    }

    return { success: true, provider };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const communicationService = new CommunicationService();
