import {
  compactCeleCardDesign,
  type CeleCardDesign,
  type CeleCardFaceLead,
} from "@/lib/digital-business-card/design";
import { parseCeleCardPortraitFrame, type CeleCardPortraitFrame } from "@/lib/digital-business-card/portrait-frame";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";

export type CeleCardDesignConfig = {
  themeId: string;
  layout?: string;
  photographPlacement?: string;
  qrPlacement?: string;
  design?: CeleCardDesign;
  portraitFrame?: CeleCardPortraitFrame;
  faceLead?: CeleCardFaceLead;
};

export type CeleCardCanonicalIdentity = {
  displayName: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  socials: unknown;
  avatarUrl: string | null;
};

function qrPlacementFromLead(lead?: CeleCardFaceLead): string {
  if (lead === "code") return "leading";
  if (lead === "name") return "name";
  return "trailing";
}

function faceLeadFromPlacement(raw?: string): CeleCardFaceLead | undefined {
  if (raw === "leading") return "code";
  if (raw === "name") return "name";
  if (raw === "trailing" || raw === "portrait") return "photo";
  return undefined;
}

export function designConfigFromCard(card: {
  themeId: string;
  socials?: unknown;
}): CeleCardDesignConfig {
  const socials = card.socials && typeof card.socials === "object" ? (card.socials as Record<string, unknown>) : {};
  const design = compactCeleCardDesign(socials.design);
  const portraitFrame = parseCeleCardPortraitFrame(socials.portraitFrame) ?? undefined;
  const faceLead = design?.faceLead ?? faceLeadFromPlacement(typeof socials.faceLead === "string" ? socials.faceLead : undefined);
  return {
    themeId: resolveDigitalCardTheme(card.themeId).id,
    layout: "id-1",
    photographPlacement: faceLead === "photo" ? "portrait" : "quiet",
    qrPlacement: qrPlacementFromLead(faceLead),
    ...(design ? { design } : {}),
    ...(portraitFrame ? { portraitFrame } : {}),
    ...(faceLead ? { faceLead } : {}),
  };
}

export function parseDesignConfig(raw: unknown, fallbackTheme?: string | null): CeleCardDesignConfig {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const themeId = typeof record.themeId === "string" ? record.themeId : fallbackTheme;
  const design = compactCeleCardDesign(record.design);
  const portraitFrame = parseCeleCardPortraitFrame(record.portraitFrame) ?? undefined;
  const faceLead =
    design?.faceLead ??
    (typeof record.faceLead === "string" ? (record.faceLead as CeleCardFaceLead) : undefined) ??
    faceLeadFromPlacement(typeof record.qrPlacement === "string" ? record.qrPlacement : undefined);
  return {
    themeId: resolveDigitalCardTheme(themeId).id,
    layout: typeof record.layout === "string" ? record.layout : "id-1",
    photographPlacement:
      typeof record.photographPlacement === "string" ? record.photographPlacement : "portrait",
    qrPlacement: typeof record.qrPlacement === "string" ? record.qrPlacement : qrPlacementFromLead(faceLead),
    ...(design ? { design } : {}),
    ...(portraitFrame ? { portraitFrame } : {}),
    ...(faceLead ? { faceLead } : {}),
  };
}

export function identityFromCard(card: CeleCardCanonicalIdentity): CeleCardCanonicalIdentity {
  return {
    displayName: card.displayName,
    title: card.title,
    company: card.company,
    bio: card.bio,
    email: card.email,
    phone: card.phone,
    website: card.website,
    socials: card.socials,
    avatarUrl: card.avatarUrl,
  };
}

function identitySocials(raw: unknown) {
  if (!raw || typeof raw !== "object") return {};
  const next = { ...(raw as Record<string, unknown>) };
  delete next.design;
  delete next.portraitFrame;
  return next;
}

export function designChangeTouchesIdentity(
  before: CeleCardCanonicalIdentity,
  after: CeleCardCanonicalIdentity
): boolean {
  return (
    before.displayName !== after.displayName ||
    before.title !== after.title ||
    before.company !== after.company ||
    before.bio !== after.bio ||
    before.email !== after.email ||
    before.phone !== after.phone ||
    before.website !== after.website ||
    before.avatarUrl !== after.avatarUrl ||
    JSON.stringify(identitySocials(before.socials)) !== JSON.stringify(identitySocials(after.socials))
  );
}

export function defaultDesignLabel(themeId: string, at = new Date()): string {
  const theme = resolveDigitalCardTheme(themeId);
  const stamp = at.toISOString().slice(0, 10);
  return `${theme.name} · ${stamp}`;
}
