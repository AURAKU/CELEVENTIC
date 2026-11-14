import { prisma } from "@/lib/prisma";
import { CELEYOU_ORIGINAL_THEME_ID } from "@/lib/digital-business-card/brand-lock";
import {
  activationEventAllowsWrite,
  celeYouWelcomeActions,
  hasPublishedOnboardingCard,
  ownerNeedsFirstCardActivation,
  pickFirstOnboardingCard,
  sanitizeActivationEventMeta,
  shouldCreateOnboardingCard,
  type CeleYouActivationEventKind,
  type CeleYouActivationStepId,
} from "@/lib/digital-business-card/activation";
import { celeCardOwnerShareFlags } from "@/lib/digital-business-card/access";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import type { DigitalCardSocials } from "@/lib/digital-business-card/types";
import {
  createDigitalCard,
  listDigitalCardsForUser,
  nfcTokensByCardId,
  recordCeleCardLifecycleEvent,
  updateDigitalCard,
  type UpsertDigitalCardInput,
} from "@/services/digital-business-card/digital-business-card.service";
import { getCeleYouAccountIdentity } from "@/services/digital-business-card/username.service";

export type OnboardingDraftInput = {
  displayName?: string;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  themeId?: string;
  avatarUrl?: string | null;
};

function draftToUpsert(
  input: OnboardingDraftInput,
  options?: { publish?: boolean; existingSocials?: unknown }
): UpsertDigitalCardInput {
  const displayName = input.displayName?.trim();
  const whatsapp = input.whatsapp?.trim();
  const prior =
    options?.existingSocials && typeof options.existingSocials === "object"
      ? (options.existingSocials as Record<string, unknown>)
      : {};
  return {
    displayName: displayName && displayName.length >= 2 ? displayName : undefined,
    title: input.title,
    company: input.company,
    bio: input.bio,
    email: input.email,
    phone: input.phone,
    website: input.website,
    themeId: input.themeId || CELEYOU_ORIGINAL_THEME_ID,
    avatarUrl: input.avatarUrl,
    socials:
      input.whatsapp !== undefined
        ? ({ ...prior, ...(whatsapp ? { whatsapp } : {}) } as DigitalCardSocials)
        : undefined,
    isPublished: options?.publish === true,
  };
}

export async function ensureFirstOnboardingCard(userId: string, input: OnboardingDraftInput = {}) {
  const cards = await listDigitalCardsForUser(userId);
  const existing = pickFirstOnboardingCard(cards);
  if (existing) {
    if (existing.isPublished) return existing;
    const displayName = (input.displayName?.trim() || existing.displayName).trim();
    if (displayName.length < 2) return existing;
    const updated = await updateDigitalCard(userId, existing.id, {
      ...draftToUpsert(
        { ...input, displayName },
        { publish: false, existingSocials: existing.socials }
      ),
      isPublished: false,
    });
    return updated ?? existing;
  }
  if (!shouldCreateOnboardingCard(cards)) {
    return pickFirstOnboardingCard(cards);
  }
  const displayName = input.displayName?.trim() || "My CeleYou";
  return createDigitalCard(userId, {
    ...draftToUpsert({ ...input, displayName }, { publish: false }),
    displayName,
    themeId: input.themeId || CELEYOU_ORIGINAL_THEME_ID,
    isPublished: false,
    nfcEnabled: true,
  });
}

export async function publishOnboardingCard(userId: string, input: OnboardingDraftInput = {}) {
  const card = await ensureFirstOnboardingCard(userId, input);
  if (!card) throw new Error("Could not create your CeleYou");
  const displayName = (input.displayName?.trim() || card.displayName).trim();
  if (displayName.length < 2) throw new Error("Add the name that should appear on the card.");
  const wasPublished = card.isPublished === true;
  const published = await updateDigitalCard(userId, card.id, {
    ...draftToUpsert(
      { ...input, displayName },
      { publish: true, existingSocials: card.socials }
    ),
    isPublished: true,
  });
  if (!published) throw new Error("Could not publish your CeleYou");
  if (!wasPublished) {
    await recordCeleCardLifecycleEvent({
      cardId: published.id,
      kind: "CardPublished",
      meta: { source: "onboarding" },
    });
    await recordCeleCardLifecycleEvent({
      cardId: published.id,
      kind: "OnboardingCompleted",
      meta: {},
    });
  }
  return published;
}

export async function recordOnboardingActivationEvent(input: {
  userId: string;
  cardId?: string | null;
  kind: CeleYouActivationEventKind;
  step?: CeleYouActivationStepId;
}) {
  if (!activationEventAllowsWrite(input.kind, { step: input.step })) return false;
  const cards = await listDigitalCardsForUser(input.userId);
  const card =
    (input.cardId ? cards.find((item) => item.id === input.cardId) : null) ?? pickFirstOnboardingCard(cards);
  if (!card) return false;
  if (card.userId !== input.userId) return false;
  if (input.kind === "FirstShare") {
    const already = await prisma.smartCardLifecycleEvent
      .findFirst({
        where: { cardId: card.id, kind: "FirstShare" },
        select: { id: true },
      })
      .catch(() => null);
    if (already) return false;
  }
  const meta = sanitizeActivationEventMeta({ step: input.step });
  await recordCeleCardLifecycleEvent({
    cardId: card.id,
    kind: input.kind,
    meta,
  });
  return true;
}

export async function getOnboardingActivationState(userId: string) {
  const [cards, identity, policy] = await Promise.all([
    listDigitalCardsForUser(userId),
    getCeleYouAccountIdentity(userId),
    getCeleCardLifecyclePolicy(),
  ]);
  const card = pickFirstOnboardingCard(cards);
  const nfcTokens = card ? await nfcTokensByCardId([card]) : new Map<string, string>();
  const flags = card ? celeCardOwnerShareFlags(card, policy) : null;
  const username = identity?.username ?? null;
  const profilePath = username ? `/u/${username}` : card ? `/u/${card.slug}` : null;
  const welcomeActions =
    card && flags
      ? celeYouWelcomeActions({
          cardId: card.id,
          profilePath: profilePath || `/u/${card.slug}`,
          published: card.isPublished,
          guestShareable: flags.guestShareable,
          nfcEnabled: card.nfcEnabled !== false,
          analyticsAvailable: card.isPublished,
        })
      : [];
  return {
    identity,
    needsActivation: ownerNeedsFirstCardActivation(cards),
    published: hasPublishedOnboardingCard(cards),
    card: card
      ? {
          ...card,
          ...flags,
          nfcPublicToken: nfcTokens.get(card.id) || null,
        }
      : null,
    profilePath,
    welcomeActions,
  };
}
