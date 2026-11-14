/**
 * First-card activation. Registration stays on /auth/onboarding.
 * This module is the guided path from a new CeleYou account to a published card.
 * QR stays /c/{publicToken}. NFC stays /n/{nfcToken}. Usernames may move; tokens do not.
 */

import { smartCardStartPath, smartCardStudioPath } from "@/lib/auth/safe-next-path";
import { CELEYOU_ORIGINAL_THEME_ID } from "@/lib/digital-business-card/brand-lock";
import { nfcStudioPath } from "@/lib/digital-business-card/nfc-device";
import { parseCeleYouUsername } from "@/lib/digital-business-card/username";

export const CELEYOU_ONBOARDING_START_PATH = "/dashboard/business-card/start";
export const CELEYOU_ONBOARDING_DRAFT_KEY = "celeyou-onboarding-draft";
export const CELEYOU_ONBOARDING_DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export const CELEYOU_ACTIVATION_STEPS = [
  { id: "username", label: "Username", required: true },
  { id: "profile", label: "Profile", required: true },
  { id: "photo", label: "Photo", required: false },
  { id: "reach", label: "Contacts", required: false },
  { id: "look", label: "Look", required: false },
  { id: "preview", label: "Preview", required: true },
  { id: "welcome", label: "Share", required: true },
] as const;

export type CeleYouActivationStepId = (typeof CELEYOU_ACTIVATION_STEPS)[number]["id"];

export const CELEYOU_ACTIVATION_EVENT_KINDS = [
  "OnboardingStarted",
  "OnboardingStepViewed",
  "OnboardingAbandoned",
  "OnboardingCompleted",
  "FirstShare",
] as const;

export type CeleYouActivationEventKind = (typeof CELEYOU_ACTIVATION_EVENT_KINDS)[number];

export const CELEYOU_WELCOME_ACTION_IDS = [
  "view",
  "share",
  "qr",
  "contact",
  "edit",
  "nfc",
  "analytics",
] as const;

export type CeleYouWelcomeActionId = (typeof CELEYOU_WELCOME_ACTION_IDS)[number];

export type CeleYouOnboardingDraft = {
  savedAt: number;
  step: CeleYouActivationStepId;
  username: string;
  displayName: string;
  title: string;
  company: string;
  bio: string;
  email: string;
  phone: string;
  website: string;
  whatsapp: string;
  avatarUrl: string | null;
  themeId: string;
  cardId: string | null;
};

export type CeleYouActivationCardLike = {
  id: string;
  isPublished: boolean;
  createdAt?: Date | string | null;
  deletedAt?: Date | string | null;
};

export type CeleYouWelcomeActionContext = {
  cardId: string;
  profilePath: string;
  published: boolean;
  guestShareable: boolean;
  nfcEnabled: boolean;
  analyticsAvailable: boolean;
};

export type CeleYouWelcomeAction = {
  id: CeleYouWelcomeActionId;
  label: string;
  href?: string;
  kind: "link" | "share" | "qr" | "contact";
};

const STEP_IDS = new Set<string>(CELEYOU_ACTIVATION_STEPS.map((step) => step.id));
const EVENT_KINDS = new Set<string>(CELEYOU_ACTIVATION_EVENT_KINDS);

export function celeCardOwnerStartPath(plan?: string | null, theme?: string | null) {
  return smartCardStartPath(plan, theme);
}

export function isCeleYouActivationStepId(value: string | null | undefined): value is CeleYouActivationStepId {
  return Boolean(value && STEP_IDS.has(value));
}

export function isCeleYouActivationEventKind(value: string | null | undefined): value is CeleYouActivationEventKind {
  return Boolean(value && EVENT_KINDS.has(value));
}

export function defaultCeleYouOnboardingDraft(
  partial?: Partial<CeleYouOnboardingDraft>
): CeleYouOnboardingDraft {
  return {
    savedAt: Date.now(),
    step: "username",
    username: "",
    displayName: "",
    title: "",
    company: "",
    bio: "",
    email: "",
    phone: "",
    website: "",
    whatsapp: "",
    avatarUrl: null,
    themeId: CELEYOU_ORIGINAL_THEME_ID,
    cardId: null,
    ...partial,
  };
}

export function emptyOnboardingCards(cards: CeleYouActivationCardLike[]) {
  return retainedOnboardingCards(cards).length === 0;
}

export function retainedOnboardingCards<T extends CeleYouActivationCardLike>(cards: T[]): T[] {
  return cards.filter((card) => !card.deletedAt);
}

export function shouldCreateOnboardingCard(cards: CeleYouActivationCardLike[]) {
  return emptyOnboardingCards(cards);
}

/** Oldest retained card. Retries never mint a second identity. */
export function pickFirstOnboardingCard<T extends CeleYouActivationCardLike>(cards: T[]): T | null {
  const retained = retainedOnboardingCards(cards);
  if (!retained.length) return null;
  return [...retained].sort((a, b) => {
    const left = new Date(a.createdAt || 0).getTime();
    const right = new Date(b.createdAt || 0).getTime();
    return left - right;
  })[0];
}

export function hasPublishedOnboardingCard(cards: CeleYouActivationCardLike[]) {
  return retainedOnboardingCards(cards).some((card) => card.isPublished);
}

export function ownerNeedsFirstCardActivation(cards: CeleYouActivationCardLike[]) {
  return !hasPublishedOnboardingCard(cards);
}

export function celeYouStudioBypassPath(cardId?: string | null) {
  const params = new URLSearchParams({ studio: "1" });
  if (cardId) params.set("card", cardId);
  return `${smartCardStudioPath()}?${params.toString()}`;
}

export function celeYouAnalyticsPath(cardId?: string | null) {
  const base = celeYouStudioBypassPath(cardId);
  return `${base}#studio-activity`;
}

export function sanitizeActivationEventMeta(raw: unknown): { step?: CeleYouActivationStepId } {
  if (!raw || typeof raw !== "object") return {};
  const step = (raw as { step?: unknown }).step;
  if (typeof step === "string" && isCeleYouActivationStepId(step)) {
    return { step };
  }
  return {};
}

export function activationEventAllowsWrite(kind: string, meta?: unknown) {
  if (!isCeleYouActivationEventKind(kind)) return false;
  const sanitized = sanitizeActivationEventMeta(meta);
  if (kind === "OnboardingStepViewed" || kind === "OnboardingAbandoned") {
    return Boolean(sanitized.step) && sanitized.step !== "welcome";
  }
  return true;
}

export function canAdvanceActivationStep(
  step: CeleYouActivationStepId,
  draft: Pick<CeleYouOnboardingDraft, "username" | "displayName">
) {
  if (step === "username") return parseCeleYouUsername(draft.username).ok;
  if (step === "profile" || step === "preview") return draft.displayName.trim().length >= 2;
  return true;
}

export function nextActivationStep(step: CeleYouActivationStepId): CeleYouActivationStepId {
  const index = CELEYOU_ACTIVATION_STEPS.findIndex((item) => item.id === step);
  return CELEYOU_ACTIVATION_STEPS[Math.min(index + 1, CELEYOU_ACTIVATION_STEPS.length - 1)]?.id ?? "welcome";
}

export function previousActivationStep(step: CeleYouActivationStepId): CeleYouActivationStepId {
  const index = CELEYOU_ACTIVATION_STEPS.findIndex((item) => item.id === step);
  return CELEYOU_ACTIVATION_STEPS[Math.max(index - 1, 0)]?.id ?? "username";
}

export function resumeActivationStep(input: {
  published: boolean;
  needsUsername: boolean;
  draftStep?: CeleYouActivationStepId | null;
  displayName?: string | null;
}): CeleYouActivationStepId {
  if (input.published) return "welcome";
  if (input.needsUsername) return "username";
  if (input.draftStep && input.draftStep !== "welcome" && isCeleYouActivationStepId(input.draftStep)) {
    return input.draftStep;
  }
  if ((input.displayName || "").trim().length >= 2) return "photo";
  return "profile";
}

export function celeYouWelcomeActions(ctx: CeleYouWelcomeActionContext): CeleYouWelcomeAction[] {
  const actions: CeleYouWelcomeAction[] = [];
  const publicLive = ctx.published && ctx.guestShareable;
  if (publicLive) {
    actions.push({ id: "view", label: "View My Card", kind: "link", href: ctx.profilePath });
    actions.push({ id: "share", label: "Share My Card", kind: "share" });
    actions.push({ id: "qr", label: "Download QR", kind: "qr" });
    actions.push({ id: "contact", label: "Save Contact", kind: "contact" });
  }
  actions.push({
    id: "edit",
    label: "Edit Card",
    kind: "link",
    href: celeYouStudioBypassPath(ctx.cardId),
  });
  if (ctx.nfcEnabled) {
    actions.push({
      id: "nfc",
      label: "Connect NFC Card",
      kind: "link",
      href: nfcStudioPath(ctx.cardId),
    });
  }
  if (ctx.analyticsAvailable) {
    actions.push({
      id: "analytics",
      label: "View Analytics",
      kind: "link",
      href: celeYouAnalyticsPath(ctx.cardId),
    });
  }
  return actions;
}

export function writeCeleYouOnboardingDraft(value: CeleYouOnboardingDraft) {
  if (typeof window === "undefined") return;
  const envelope: CeleYouOnboardingDraft = { ...value, savedAt: Date.now() };
  try {
    window.localStorage.setItem(CELEYOU_ONBOARDING_DRAFT_KEY, JSON.stringify(envelope));
  } catch {
    /* quota */
  }
}

export function readCeleYouOnboardingDraft(): CeleYouOnboardingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CELEYOU_ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CeleYouOnboardingDraft;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > CELEYOU_ONBOARDING_DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(CELEYOU_ONBOARDING_DRAFT_KEY);
      return null;
    }
    if (!isCeleYouActivationStepId(parsed.step)) parsed.step = "username";
    if (!parsed.themeId) parsed.themeId = CELEYOU_ORIGINAL_THEME_ID;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCeleYouOnboardingDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CELEYOU_ONBOARDING_DRAFT_KEY);
}
