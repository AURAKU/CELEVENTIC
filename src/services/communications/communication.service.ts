import { prisma } from "@/lib/prisma";
import { GUEST_TIERS } from "@/lib/constants";
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

/**
 * Communication Hub Service
 * Provider integrations (WhatsApp Business, SMS, Resend) plug in here
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

    const campaign = await prisma.campaign.create({
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

    return campaign;
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
      } catch {
        await prisma.campaignMessage.update({
          where: { id: message.id },
          data: { status: "FAILED" },
        });
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
  }) {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[MOCK EMAIL][${params.locale ?? "en"}][${params.templateType ?? "generic"}] To: ${params.to}`);
      console.log(`  Subject: ${params.subject}`);
      console.log(`  Body: ${params.body}`);
      return { success: true, mock: true };
    }
    // Resend integration placeholder — locale stored for future template routing
    return { success: true };
  }

  private async sendEmail(to: string, message: string) {
    return this.sendTransactionalEmail({ to, subject: "Celeventic", body: message });
  }

  private async sendSMS(to: string, _message: string) {
    if (!process.env.SMS_PROVIDER_API_KEY) {
      console.log(`[MOCK SMS] To: ${to}`);
      return;
    }
  }

  private async sendWhatsApp(to: string, _message: string) {
    if (!process.env.WHATSAPP_BUSINESS_TOKEN) {
      console.log(`[MOCK WhatsApp] To: ${to}`);
      return;
    }
  }
}

export const communicationService = new CommunicationService();
