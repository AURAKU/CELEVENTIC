import type { AppLocale } from "@/lib/i18n/constants";
import { CELEVENTIC_BRAND } from "@/lib/invitation-os/brand";

export interface AiCreatorInput {
  eventType: string;
  names: string;
  eventDate?: string;
  venue?: string;
  style?: string;
  colors?: string;
  story?: string;
  language: AppLocale | "both";
}

export interface AiCreatorOutput {
  eventTitle: string;
  eventTitleFr?: string;
  story: string;
  storyFr?: string;
  schedule: { time: string; title: string; description?: string }[];
  rsvpText: string;
  rsvpTextFr?: string;
  thankYouText: string;
  thankYouTextFr?: string;
  whatsappShareText: string;
  whatsappShareTextFr?: string;
  dressCodeSuggestion?: string;
  hostLine: string;
}

const EVENT_TONES: Record<string, { en: string; fr: string }> = {
  WEDDING: { en: "with joy and gratitude", fr: "avec joie et gratitude" },
  FUNERAL: { en: "in loving memory", fr: "en souvenir affectueux" },
  BIRTHDAY: { en: "with celebration and warmth", fr: "avec célébration et chaleur" },
  CORPORATE_EVENT: { en: "with professionalism and prestige", fr: "avec professionnalisme et prestige" },
  CHURCH_PROGRAM: { en: "in fellowship and faith", fr: "en communion et foi" },
  PRIVATE_EVENT: { en: "with elegance", fr: "avec élégance" },
};

export class AiInvitationCreatorService {
  async generate(input: AiCreatorInput): Promise<AiCreatorOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        return await this.generateWithOpenAI(input, apiKey);
      } catch {
        // fall through to luxury templates
      }
    }
    return this.generateLuxuryTemplate(input);
  }

  private async generateWithOpenAI(input: AiCreatorInput, apiKey: string): Promise<AiCreatorOutput> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Celeventic AI Invitation Creator. Voice: ${CELEVENTIC_BRAND.voice}. Ghana-first, globally refined. Return JSON matching AiCreatorOutput schema. Never copy competitor wording.`,
          },
          { role: "user", content: JSON.stringify(input) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error("OpenAI failed");
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content) as AiCreatorOutput;
  }

  private generateLuxuryTemplate(input: AiCreatorInput): AiCreatorOutput {
    const tone = EVENT_TONES[input.eventType] ?? EVENT_TONES.PRIVATE_EVENT;
    const dateStr = input.eventDate
      ? new Date(input.eventDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : "a date to be announced";
    const venue = input.venue ?? "a distinguished venue";
    const style = input.style ?? "elegant";

    const eventTitle =
      input.eventType === "WEDDING"
        ? `The Wedding of ${input.names}`
        : input.eventType === "FUNERAL"
          ? `In Loving Memory of ${input.names}`
          : `Celebrating ${input.names}`;

    const eventTitleFr =
      input.eventType === "WEDDING"
        ? `Le mariage de ${input.names}`
        : input.eventType === "FUNERAL"
          ? `En mémoire de ${input.names}`
          : `Célébration de ${input.names}`;

    const story =
      input.story?.trim() ||
      `You are warmly invited to join us ${tone.en} as we honour ${input.names}. ` +
      `This ${style} celebration will unfold at ${venue} on ${dateStr}. ` +
      `Your presence would mean the world to us as we create unforgettable moments together.`;

    const storyFr =
      `Vous êtes cordialement invité(e) à nous rejoindre ${tone.fr} pour honorer ${input.names}. ` +
      `Cette célébration ${style} aura lieu à ${venue} le ${dateStr}. ` +
      `Votre présence compte énormément pour nous.`;

    const whatsappShareText =
      `✨ You're invited!\n\n${eventTitle}\n📅 ${dateStr}\n📍 ${venue}\n\n` +
      `View your Celeventic invitation:`;

    const whatsappShareTextFr =
      `✨ Vous êtes invité(e)!\n\n${eventTitleFr}\n📅 ${dateStr}\n📍 ${venue}\n\n` +
      `Voir votre invitation Celeventic:`;

    return {
      eventTitle,
      eventTitleFr: input.language !== "en" ? eventTitleFr : undefined,
      story,
      storyFr: input.language !== "en" ? storyFr : undefined,
      schedule: [
        { time: "14:00", title: "Guest Arrival", description: "Welcome refreshments" },
        { time: "15:00", title: "Main Ceremony", description: "The celebration begins" },
        { time: "18:00", title: "Reception", description: "Dinner, music & memories" },
      ],
      rsvpText: "Kindly confirm your attendance at your earliest convenience. We look forward to celebrating with you.",
      rsvpTextFr: "Merci de confirmer votre présence dans les meilleurs délais.",
      thankYouText: `Thank you for being part of our story. With love, ${input.names}.`,
      thankYouTextFr: `Merci de faire partie de notre histoire. Avec affection, ${input.names}.`,
      whatsappShareText,
      whatsappShareTextFr: input.language !== "en" ? whatsappShareTextFr : undefined,
      dressCodeSuggestion: input.style?.toLowerCase().includes("formal") ? "Formal / Black Tie" : "Smart Elegant",
      hostLine: `Hosted by ${input.names}`,
    };
  }
}

export const aiInvitationCreatorService = new AiInvitationCreatorService();
