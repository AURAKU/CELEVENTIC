import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";

export type CeleCardDesignConfig = {
  themeId: string;
  layout?: string;
  photographPlacement?: string;
  qrPlacement?: string;
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

export function designConfigFromCard(card: { themeId: string }): CeleCardDesignConfig {
  return {
    themeId: resolveDigitalCardTheme(card.themeId).id,
    layout: "id-1",
    photographPlacement: "portrait",
    qrPlacement: "trailing",
  };
}

export function parseDesignConfig(raw: unknown, fallbackTheme?: string | null): CeleCardDesignConfig {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const themeId = typeof record.themeId === "string" ? record.themeId : fallbackTheme;
  return {
    themeId: resolveDigitalCardTheme(themeId).id,
    layout: typeof record.layout === "string" ? record.layout : "id-1",
    photographPlacement:
      typeof record.photographPlacement === "string" ? record.photographPlacement : "portrait",
    qrPlacement: typeof record.qrPlacement === "string" ? record.qrPlacement : "trailing",
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
    JSON.stringify(before.socials ?? {}) !== JSON.stringify(after.socials ?? {})
  );
}

export function defaultDesignLabel(themeId: string, at = new Date()): string {
  const theme = resolveDigitalCardTheme(themeId);
  const stamp = at.toISOString().slice(0, 10);
  return `${theme.name} · ${stamp}`;
}
