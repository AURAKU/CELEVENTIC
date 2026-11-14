"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { SignupProgress } from "@/components/auth/signup-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import { CeleYouUsernameField } from "@/components/digital-business-card/celeyou-username-field";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { DigitalCardPortraitField } from "@/components/digital-business-card/digital-card-portrait-field";
import { DigitalCardThemePicker } from "@/components/digital-business-card/digital-card-theme-picker";
import { CeleYouWelcomeDesk } from "@/components/digital-business-card/celeyou-welcome-desk";
import { getCeleYouShareOrigin } from "@/lib/app-url";
import {
  CELEYOU_ACTIVATION_STEPS,
  canAdvanceActivationStep,
  celeYouStudioBypassPath,
  clearCeleYouOnboardingDraft,
  defaultCeleYouOnboardingDraft,
  nextActivationStep,
  previousActivationStep,
  readCeleYouOnboardingDraft,
  resumeActivationStep,
  writeCeleYouOnboardingDraft,
  type CeleYouActivationStepId,
  type CeleYouOnboardingDraft,
  type CeleYouWelcomeAction,
} from "@/lib/digital-business-card/activation";
import { CELEYOU_ORIGINAL_THEME_ID } from "@/lib/digital-business-card/brand-lock";
import { SMARTCARD_BRAND_TAGLINE } from "@/lib/digital-business-card/product";
import { celeYouCameraScanUrl } from "@/lib/digital-business-card/share-identity";
import { resolveDigitalCardTheme, type DigitalCardThemeId } from "@/lib/digital-business-card/themes";
import { digitalCardQrImageSrc } from "@/lib/digital-business-card/types";
import { digitalCardVcardPath } from "@/lib/digital-business-card/vcard";
import { parseCeleYouUsername } from "@/lib/digital-business-card/username";

type ActivationCard = {
  id: string;
  slug: string;
  displayName: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  socials?: { whatsapp?: string | null } | null;
  themeId: string;
  avatarUrl: string | null;
  isPublished: boolean;
  guestShareable?: boolean;
  publicToken?: string;
  nfcPublicToken?: string | null;
  nfcEnabled?: boolean;
};

type ActivationState = {
  identity?: {
    username?: string | null;
    displayName?: string | null;
    needsUsername?: boolean;
  } | null;
  needsActivation: boolean;
  published: boolean;
  card: ActivationCard | null;
  profilePath: string | null;
  welcomeActions: CeleYouWelcomeAction[];
};

const WIZARD_STEPS = CELEYOU_ACTIVATION_STEPS.filter((step) => step.id !== "welcome");

function socialWhatsapp(socials: ActivationCard["socials"]) {
  if (!socials || typeof socials !== "object") return "";
  const value = socials.whatsapp;
  return typeof value === "string" ? value : "";
}

function draftFromState(state: ActivationState, local?: CeleYouOnboardingDraft | null): CeleYouOnboardingDraft {
  const card = state.card;
  const identity = state.identity;
  const base = defaultCeleYouOnboardingDraft({
    username: identity?.username || "",
    displayName: card?.displayName || identity?.displayName || "",
    title: card?.title || "",
    company: card?.company || "",
    bio: card?.bio || "",
    email: card?.email || "",
    phone: card?.phone || "",
    website: card?.website || "",
    whatsapp: socialWhatsapp(card?.socials),
    avatarUrl: card?.avatarUrl || null,
    themeId: card?.themeId || CELEYOU_ORIGINAL_THEME_ID,
    cardId: card?.id || null,
    step: resumeActivationStep({
      published: state.published,
      needsUsername: Boolean(identity?.needsUsername),
      displayName: card?.displayName || identity?.displayName,
    }),
  });
  if (!local) return base;
  if (local.cardId && card?.id && local.cardId !== card.id) return base;
  return {
    ...base,
    ...local,
    username: local.username || base.username,
    cardId: card?.id || local.cardId,
    themeId: local.themeId || base.themeId,
  };
}

export function CeleYouFirstCardOnboarding() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ActivationState | null>(null);
  const [draft, setDraft] = useState<CeleYouOnboardingDraft>(defaultCeleYouOnboardingDraft());
  const [lookOpen, setLookOpen] = useState(false);
  const started = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const origin = typeof window !== "undefined" ? window.location.origin : getCeleYouShareOrigin();
  const theme = resolveDigitalCardTheme(draft.themeId);
  const step = draft.step;
  const wizardIndex = Math.max(0, WIZARD_STEPS.findIndex((item) => item.id === step));

  const persistDraft = useCallback((next: CeleYouOnboardingDraft) => {
    draftRef.current = next;
    setDraft(next);
    writeCeleYouOnboardingDraft(next);
  }, []);

  const recordEvent = useCallback(
    (kind: string, nextStep?: CeleYouActivationStepId) => {
      const cardId = draftRef.current.cardId;
      void fetch("/api/digital-business-cards/activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "event", kind, step: nextStep ?? draftRef.current.step, cardId }),
        keepalive: true,
      }).catch(() => undefined);
    },
    []
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/digital-business-cards/activation");
    const json = (await res.json().catch(() => ({}))) as { error?: string; data?: ActivationState };
    if (!res.ok || !json.data) throw new Error(json.error || "Could not load onboarding");
    setState(json.data);
    const local = readCeleYouOnboardingDraft();
    const next = draftFromState(json.data, local);
    persistDraft(next);
    return json.data;
  }, [persistDraft]);

  useEffect(() => {
    void load()
      .then((data) => {
        if (!started.current) {
          started.current = true;
          if (data.needsActivation) recordEvent("OnboardingStarted", "username");
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load, recordEvent]);

  useEffect(() => {
    if (loading || step === "welcome") return;
    recordEvent("OnboardingStepViewed", step);
  }, [loading, recordEvent, step]);

  useEffect(() => {
    if (loading || step === "welcome") return;
    const onLeave = () => recordEvent("OnboardingAbandoned", draftRef.current.step);
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [loading, recordEvent, step]);

  const qrUrl = useMemo(() => {
    const token = state?.card?.publicToken;
    return token ? celeYouCameraScanUrl(token, origin) : "";
  }, [origin, state?.card?.publicToken]);

  const profileUrl = state?.profilePath
    ? `${origin}${state.profilePath}`
    : draft.username
      ? `${origin}/u/${draft.username}`
      : "";

  async function claimUsername() {
    const parsed = parseCeleYouUsername(draft.username);
    if (!parsed.ok) throw new Error(parsed.message);
    if (state?.identity?.username === parsed.username) return;
    const res = await fetch("/api/digital-business-cards/username", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: parsed.username,
        displayName: draft.displayName,
        company: draft.company,
        profession: draft.title,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(json.error || "That username is not available.");
  }

  async function save(action: "save" | "publish") {
    const res = await fetch("/api/digital-business-cards/activation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        draft: {
          displayName: draftRef.current.displayName,
          title: draftRef.current.title,
          company: draftRef.current.company,
          bio: draftRef.current.bio,
          email: draftRef.current.email,
          phone: draftRef.current.phone,
          website: draftRef.current.website,
          whatsapp: draftRef.current.whatsapp,
          themeId: draftRef.current.themeId,
          avatarUrl: draftRef.current.avatarUrl,
        },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; data?: ActivationState };
    if (!res.ok || !json.data) throw new Error(json.error || "Could not save");
    setState(json.data);
    persistDraft({
      ...draftRef.current,
      cardId: json.data.card?.id || draftRef.current.cardId,
      step: json.data.published ? "welcome" : draftRef.current.step,
    });
    if (json.data.published) clearCeleYouOnboardingDraft();
    return json.data;
  }

  async function goNext() {
    setError(null);
    if (!canAdvanceActivationStep(step, draft)) {
      setError(step === "username" ? "Choose a unique username to continue." : "Add the name that should appear on the card.");
      return;
    }
    setSaving(true);
    try {
      if (step === "username") {
        await claimUsername();
        const displayName = draft.displayName.trim() || state?.identity?.displayName?.trim() || "";
        if (displayName.length >= 2) {
          persistDraft({ ...draft, displayName });
          await save("save");
        }
      }
      if (step === "profile" || step === "photo" || step === "reach" || step === "look") {
        await save("save");
      }
      if (step === "preview") {
        await save("publish");
        return;
      }
      persistDraft({ ...draftRef.current, step: nextActivationStep(step) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setSaving(false);
    }
  }

  async function saveAndLeave() {
    setSaving(true);
    setError(null);
    try {
      if (step === "username" && parseCeleYouUsername(draft.username).ok) await claimUsername();
      if (draft.displayName.trim().length >= 2) await save("save");
      else writeCeleYouOnboardingDraft(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-xl py-16 text-center" role="status">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#0B8A83]" />
        <p className="mt-3 text-sm text-slate-500">Loading your CeleYou…</p>
      </div>
    );
  }

  if (step === "welcome" && state?.published) {
    const card = state.card;
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 py-4 sm:py-8">
        <CeleYouWelcomeDesk
          displayName={card?.displayName || draft.displayName}
          profileUrl={profileUrl}
          qrUrl={qrUrl}
          contactHref={card ? digitalCardVcardPath(card.slug) : null}
          actions={state.welcomeActions}
          onFirstShare={() => recordEvent("FirstShare")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 py-4 sm:py-8">
      <header className="space-y-3">
        <CeleYouBrandMark variant="chip" tone="light" markClassName="h-8 w-8" />
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Create your first CeleYou
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{SMARTCARD_BRAND_TAGLINE}</p>
        </div>
      </header>

      <SignupProgress current={wizardIndex + 1} total={WIZARD_STEPS.length} labels={WIZARD_STEPS.map((item) => item.label)} />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {step === "username" ? (
        <section className="space-y-3">
          <CeleYouUsernameField
            value={draft.username}
            onChange={(username) => persistDraft({ ...draft, username })}
            displayName={draft.displayName}
            company={draft.company}
            profession={draft.title}
            currentUsername={state?.identity?.username}
            publicOrigin={origin}
          />
          <p className="text-xs text-slate-500">
            Display names can match someone else. Usernames cannot. Your QR and NFC links stay the same if you change this later.
          </p>
        </section>
      ) : null}

      {step === "profile" ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="celeyou-display-name">Name on the card</Label>
            <Input
              id="celeyou-display-name"
              value={draft.displayName}
              onChange={(event) => persistDraft({ ...draft, displayName: event.target.value })}
              autoComplete="name"
              placeholder="How your name should read"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="celeyou-title">Role or title</Label>
            <Input
              id="celeyou-title"
              value={draft.title}
              onChange={(event) => persistDraft({ ...draft, title: event.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="celeyou-company">Company</Label>
            <Input
              id="celeyou-company"
              value={draft.company}
              onChange={(event) => persistDraft({ ...draft, company: event.target.value })}
              placeholder="Optional"
            />
          </div>
        </section>
      ) : null}

      {step === "photo" ? (
        <DigitalCardPortraitField
          value={draft.avatarUrl}
          onChange={(avatarUrl) => persistDraft({ ...draft, avatarUrl })}
          theme={theme}
          displayName={draft.displayName}
          compact
          onError={(message) => setError(message)}
        />
      ) : null}

      {step === "reach" ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="celeyou-email">Email</Label>
            <Input
              id="celeyou-email"
              type="email"
              value={draft.email}
              onChange={(event) => persistDraft({ ...draft, email: event.target.value })}
              autoComplete="email"
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="celeyou-phone">Phone</Label>
            <Input
              id="celeyou-phone"
              value={draft.phone}
              onChange={(event) => persistDraft({ ...draft, phone: event.target.value })}
              autoComplete="tel"
              inputMode="tel"
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="celeyou-whatsapp">WhatsApp</Label>
            <Input
              id="celeyou-whatsapp"
              value={draft.whatsapp}
              onChange={(event) => persistDraft({ ...draft, whatsapp: event.target.value })}
              inputMode="tel"
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="celeyou-website">Website</Label>
            <Input
              id="celeyou-website"
              value={draft.website}
              onChange={(event) => persistDraft({ ...draft, website: event.target.value })}
              inputMode="url"
              placeholder="Optional"
            />
          </div>
        </section>
      ) : null}

      {step === "look" ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-[#0B8A83]/20 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Original CeleYou plate</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Elegant Frost, classic landscape, gold edge. This is the default. You can change it later in studio.
            </p>
            {draft.themeId !== CELEYOU_ORIGINAL_THEME_ID ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => persistDraft({ ...draft, themeId: CELEYOU_ORIGINAL_THEME_ID })}
              >
                Keep original
              </Button>
            ) : (
              <p className="mt-3 text-xs font-medium text-[#0B8A83]">Original look selected.</p>
            )}
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-[#0B8A83]"
            onClick={() => setLookOpen((open) => !open)}
            aria-expanded={lookOpen}
          >
            {lookOpen ? "Hide other looks" : "Try another look"}
          </button>
          {lookOpen ? (
            <DigitalCardThemePicker
              value={draft.themeId as DigitalCardThemeId}
              onChange={(themeId) => persistDraft({ ...draft, themeId })}
            />
          ) : null}
        </section>
      ) : null}

      {step === "preview" ? (
        <section className="space-y-4">
          <DigitalCardFace
            themeId={draft.themeId}
            displayName={draft.displayName}
            title={draft.title}
            company={draft.company}
            avatarUrl={draft.avatarUrl}
            qrSrc={qrUrl ? digitalCardQrImageSrc(qrUrl, 512) : null}
            className="mx-auto w-full max-w-md"
          />
          <p className="text-center text-xs leading-relaxed text-slate-500">
            Publishing makes this visible at your profile link. QR and NFC destinations stay on their permanent tokens.
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {step !== "username" ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => persistDraft({ ...draft, step: previousActivationStep(step) })}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        ) : null}
        <Button type="button" onClick={() => void goNext()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {step === "preview" ? "Publish card" : step === "photo" || step === "reach" || step === "look" ? "Continue" : "Continue"}
        </Button>
        {step === "photo" || step === "reach" || step === "look" ? (
          <Button type="button" variant="ghost" onClick={() => persistDraft({ ...draft, step: nextActivationStep(step) })}>
            Skip for now
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => void saveAndLeave()} disabled={saving}>
          Save draft
        </Button>
      </div>

      {draft.cardId && draft.displayName.trim().length >= 2 ? (
        <p className="text-center text-xs text-slate-500">
          Need every studio control?{" "}
          <Link href={celeYouStudioBypassPath(draft.cardId)} className="font-semibold text-[#0B8A83]">
            Open full studio
          </Link>
        </p>
      ) : null}
    </div>
  );
}
