"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CreditCard,
  Loader2,
  Nfc,
  Plus,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import { DigitalCardDesignDesk } from "@/components/digital-business-card/digital-card-design-desk";
import { DIGITAL_CARD_THEMES, resolveDigitalCardTheme, type DigitalCardThemeId } from "@/lib/digital-business-card/themes";
import { CELEYOU_ORIGINAL_THEME_ID } from "@/lib/digital-business-card/brand-lock";
import {
  celeCardOwnerStartPath,
  ownerNeedsFirstCardActivation,
} from "@/lib/digital-business-card/activation";
import {
  applyCeleCardDesign,
  compactCeleCardDesign,
  designAfterThemeChange,
  type CeleCardDesign,
} from "@/lib/digital-business-card/design";
import {
  clearCeleYouStudioDraft,
  readCeleYouStudioDraft,
  studioDraftMayServerAutosave,
  writeCeleYouStudioDraft,
} from "@/lib/digital-business-card/studio-draft";
import { useStudioAutosave } from "@/hooks/use-studio-autosave";
import {
  compactMeetingDesk,
  defaultMeetingDesk,
  persistMeetingDesk,
  type CeleCardMeetingDesk,
} from "@/lib/digital-business-card/meetings";
import {
  compactBusinessProfile,
  defaultBusinessProfile,
  persistBusinessProfile,
  type CeleYouBusinessProfile,
} from "@/lib/digital-business-card/business-profile";
import { celecardCompanyDisplayLines, celecardPlateDisplayName, celecardTitleDisplayLines } from "@/lib/digital-business-card/type-voice";
import { SMARTCARD_PLANS, type SmartCardPlan, type SmartCardPlanId } from "@/lib/digital-business-card/plans";
import {
  CELEYOU_TERM_LOCKED_CTA,
  CELEYOU_TERM_LOCKED_HINT,
  CELEYOU_TERM_OPEN_HINT,
} from "@/lib/digital-business-card/billing-rules";
import { celeYouCameraScanUrl, celeYouNfcScanUrl } from "@/lib/digital-business-card/share-identity";
import {
  CELECARD_BIO_MAX_CHARS,
  clipCeleCardBio,
  digitalCardIdentityUrl,
  digitalCardQrImageSrc,
  normalizeSocials,
  compactDigitalCardSocials,
  collectCardEmails,
  collectCardPhones,
  collectCardWebsites,
  toDigitalCardSocialForm,
} from "@/lib/digital-business-card/types";
import {
  DIGITAL_CARD_SOCIAL_GROUPS,
  chatKindsMapForSocials,
  compactAlignedTags,
  compactChatLinkKindsFromForm,
  collectTaggedEmails,
  collectTaggedPhones,
  emptyDigitalCardSocialForm,
  listDigitalCardReachItems,
  persistCompanyLogoUrl,
  toPayQrMap,
  usesChatLinkKinds,
  type ChatLinkKind,
  type ContactKindTag,
} from "@/lib/digital-business-card/socials";
import { DigitalCardRepeatFields } from "@/components/digital-business-card/digital-card-repeat-fields";
import {
  DigitalCardPayFields,
  DigitalCardPayGroup,
  payQrListForBrand,
  writePayQrBrand,
} from "@/components/digital-business-card/digital-card-pay-fields";
import { DigitalCardReachCatalog } from "@/components/digital-business-card/digital-card-reach-catalog";
import {
  DigitalCardOtherFields,
  DigitalCardOtherReservation,
} from "@/components/digital-business-card/digital-card-other-fields";
import { DigitalCardMeetingDesk } from "@/components/digital-business-card/digital-card-meeting-desk";
import {
  DigitalCardMeetingDrop,
  meetingPreviewItems,
} from "@/components/digital-business-card/digital-card-meeting-drop";
import {
  DigitalCardLocationDrop,
  locationPreviewItems,
} from "@/components/digital-business-card/digital-card-location-drop";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";
import { DigitalCardReachOrderEditor } from "@/components/digital-business-card/digital-card-reach-order";
import { DigitalCardReachGrid } from "@/components/digital-business-card/digital-card-reach-grid";
import { DigitalCardPortraitField } from "@/components/digital-business-card/digital-card-portrait-field";
import { DigitalCardCompanyLogoField } from "@/components/digital-business-card/digital-card-company-logo-field";
import { DigitalCardSlugField } from "@/components/digital-business-card/digital-card-slug-field";
import { CeleYouUsernameField } from "@/components/digital-business-card/celeyou-username-field";
import { DigitalCardLiveTermRibbon } from "@/components/digital-business-card/digital-card-subscription-countdown";
import { DigitalCardPrivacyDesk } from "@/components/digital-business-card/digital-card-privacy-desk";
import { DigitalCardDesignVault } from "@/components/digital-business-card/digital-card-design-vault";
import { DigitalCardConnectionInbox } from "@/components/digital-business-card/digital-card-connection-inbox";
import { DigitalCardConnectAutomations } from "@/components/digital-business-card/digital-card-connect-automations";
import { DigitalCardShareDesk } from "@/components/digital-business-card/digital-card-share-desk";
import { DigitalCardStudioPreview } from "@/components/digital-business-card/digital-card-studio-preview";
import { DigitalCardStudioNotice } from "@/components/digital-business-card/digital-card-studio-notice";
import { celeCardCheckoutUi } from "@/lib/digital-business-card/checkout-outcome";
import { applyReachVisibilityPreview, type ReachVisibility } from "@/lib/digital-business-card/privacy-preview";
import {
  celecardPortraitFrame,
  resolveCeleCardPortraitFrame,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import { digitalCardPresentPath } from "@/lib/digital-business-card/share";
import { nfcStudioPath } from "@/lib/digital-business-card/nfc-device";
import { getCeleYouShareOrigin } from "@/lib/app-url";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";

const DigitalCardAnalyticsPanel = dynamic(
  () =>
    import("@/components/digital-business-card/digital-card-analytics-panel").then(
      (mod) => mod.DigitalCardAnalyticsPanel
    ),
  { ssr: false }
);

type CardRow = {
  id: string;
  slug: string;
  displayName: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  socials: unknown;
  themeId: string;
  avatarUrl: string | null;
  isPublished: boolean;
  nfcEnabled: boolean;
  proximityDiscoverable?: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  lastActivatedAt?: string | null;
  createdAt?: string | null;
  viewCount: number;
  isLive: boolean;
  guestShareable?: boolean;
  publicToken?: string;
  nfcPublicToken?: string | null;
  lifecycleState?: string;
  canRenew?: boolean;
};

const studioInputClass =
  "flex h-11 w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-base outline-none ring-offset-white placeholder:text-[13px] placeholder:leading-tight focus-visible:ring-2 focus-visible:ring-slate-400 sm:h-11 sm:text-sm";

function PlateNameHint({ name }: { name: string }) {
  const plate = celecardPlateDisplayName(name);
  const saved = name.replace(/\s+/g, " ").trim();
  if (!plate || plate === saved) return null;
  return (
    <p className="text-xs leading-relaxed text-slate-500">
      On the card this reads {plate}. Your saved name stays in full.
    </p>
  );
}

function CompanyPlateHint({ name }: { name: string }) {
  const lines = celecardCompanyDisplayLines(name);
  if (lines.length < 2) return null;
  return (
    <p className="text-[11px] leading-relaxed text-slate-500">
      On the card this sits on {lines.length} lines so the plate stays clear. The saved name stays in full.
    </p>
  );
}

function TitlePlateHint({ name }: { name: string }) {
  const lines = celecardTitleDisplayLines(name);
  if (lines.length < 2) return null;
  return (
    <p className="text-xs leading-relaxed text-slate-500">
      On the card this sits on {lines.length} lines so the plate stays clear. The saved title stays in full.
    </p>
  );
}

function StudioPanel({
  id,
  title,
  hint,
  children,
}: {
  id?: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="min-w-0 scroll-mt-16 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

const STUDIO_JUMP = [
  { href: "#studio-activity", label: "Activity" },
  { href: "#studio-activation", label: "Activation" },
  { href: "#studio-identity", label: "Identity" },
  { href: "#studio-look", label: "Design" },
  { href: "#studio-contact", label: "Contact" },
  { href: "#studio-reach", label: "Reach" },
  { href: "#studio-inbox", label: "Connections" },
  { href: "#studio-connect", label: "Follow-ups" },
  { href: "#studio-preview", label: "Share" },
] as const;

const emptyForm = {
  displayName: "",
  title: "",
  company: "",
  bio: "",
  emails: [""],
  emailTags: [""] as Array<ContactKindTag | "">,
  phones: [""],
  phoneTags: [""] as Array<ContactKindTag | "">,
  websites: [""],
  socials: emptyDigitalCardSocialForm(),
  themeId: CELEYOU_ORIGINAL_THEME_ID as DigitalCardThemeId,
  slug: "",
  isPublished: true,
  nfcEnabled: true,
  proximityDiscoverable: true,
  avatarUrl: null as string | null,
  stackOrder: [] as string[],
  dockOrder: [] as string[],
  payQr: {} as Record<string, string>,
  linkKinds: {} as Record<string, Array<ChatLinkKind | "">>,
  reachVisibility: {} as Record<string, ReachVisibility>,
  portraitFrame: "square" as CeleCardPortraitFrame,
  companyLogoUrl: null as string | null,
  design: {} as CeleCardDesign,
  meeting: defaultMeetingDesk() as CeleCardMeetingDesk,
  business: defaultBusinessProfile() as CeleYouBusinessProfile,
};

type StudioForm = typeof emptyForm;

function formFromCard(card: CardRow): StudioForm {
  const socials = normalizeSocials(card.socials);
  const emails = collectCardEmails({ email: card.email, socials });
  const phones = collectCardPhones({ phone: card.phone, socials });
  const websites = collectCardWebsites({ website: card.website, socials });
  const emailTags = collectTaggedEmails({ email: card.email, socials }).map((item) => item.tag ?? "");
  const phoneTags = collectTaggedPhones({ phone: card.phone, socials }).map((item) => item.tag ?? "");
  return {
    displayName: card.displayName,
    title: card.title ?? "",
    company: card.company ?? "",
    bio: card.bio ?? "",
    emails: emails.length ? emails : [""],
    emailTags: emails.length ? emailTags : [""],
    phones: phones.length ? phones : [""],
    phoneTags: phones.length ? phoneTags : [""],
    websites: websites.length ? websites : [""],
    socials: toDigitalCardSocialForm(socials),
    themeId: (card.themeId as DigitalCardThemeId) || CELEYOU_ORIGINAL_THEME_ID,
    slug: card.slug,
    isPublished: card.isPublished,
    nfcEnabled: card.nfcEnabled,
    proximityDiscoverable: card.proximityDiscoverable !== false,
    avatarUrl: card.avatarUrl,
    stackOrder: socials.stackOrder ?? [],
    dockOrder: socials.dockOrder ?? [],
    payQr: toPayQrMap(socials),
    reachVisibility: (socials.reachVisibility ?? {}) as Record<string, ReachVisibility>,
    portraitFrame: resolveCeleCardPortraitFrame(
      resolveDigitalCardTheme((card.themeId as DigitalCardThemeId) || CELEYOU_ORIGINAL_THEME_ID),
      socials.portraitFrame
    ),
    companyLogoUrl: socials.companyLogoUrl ?? null,
    design: compactCeleCardDesign(socials.design) ?? {},
    meeting: compactMeetingDesk(socials.meeting) ?? defaultMeetingDesk(),
    business: compactBusinessProfile(socials.business),
    linkKinds: chatKindsMapForSocials(socials),
  };
}

function studioSocialsFromForm(form: StudioForm) {
  const emails = form.emails.map((value) => value.trim()).filter(Boolean);
  const phones = form.phones.map((value) => value.trim()).filter(Boolean);
  const websites = form.websites.map((value) => value.trim()).filter(Boolean);
  const emailTags = compactAlignedTags(form.emails, form.emailTags);
  const phoneTags = compactAlignedTags(form.phones, form.phoneTags);
  const socials = {
    ...compactDigitalCardSocials(
      {
        ...form.socials,
        website: websites,
      },
      form.payQr
    ),
    ...(emails.length ? { emails } : {}),
    ...(emailTags.some(Boolean) ? { emailTags } : {}),
    ...(phones.length ? { phones } : {}),
    ...(phoneTags.some(Boolean) ? { phoneTags } : {}),
    linkKinds: compactChatLinkKindsFromForm(form.socials, form.linkKinds),
    ...(form.stackOrder.length ? { stackOrder: form.stackOrder } : {}),
    ...(form.dockOrder.length ? { dockOrder: form.dockOrder } : {}),
    portraitFrame: form.portraitFrame,
  } as Record<string, unknown>;
  const design = compactCeleCardDesign(form.design);
  if (design) socials.design = design;
  else delete socials.design;
  const companyLogoUrl = persistCompanyLogoUrl(form.companyLogoUrl);
  if (companyLogoUrl) socials.companyLogoUrl = companyLogoUrl;
  else delete socials.companyLogoUrl;
  const meeting = persistMeetingDesk(form.meeting);
  if (meeting) socials.meeting = meeting;
  else delete socials.meeting;
  const business = persistBusinessProfile(form.business);
  if (business) socials.business = business;
  else delete socials.business;
  if (Object.keys(form.reachVisibility).length) {
    socials.reachVisibility = form.reachVisibility;
  } else {
    delete socials.reachVisibility;
  }
  return { emails, phones, websites, socials };
}

function studioPayloadFromForm(form: StudioForm, includePublish: boolean) {
  const { emails, phones, websites, socials } = studioSocialsFromForm(form);
  return {
    displayName: form.displayName.trim(),
    title: form.title.trim() || null,
    company: form.company.trim() || null,
    bio: clipCeleCardBio(form.bio.trim()) || null,
    email: emails[0] || null,
    phone: phones[0] || null,
    website: websites[0] || null,
    socials,
    themeId: form.themeId,
    slug: form.slug.trim() || undefined,
    nfcEnabled: form.nfcEnabled,
    proximityDiscoverable: form.proximityDiscoverable,
    avatarUrl: form.avatarUrl,
    ...(includePublish ? { isPublished: form.isPublished } : {}),
  };
}

function overlayStudioDraft(server: StudioForm, raw: unknown, published: boolean): { form: StudioForm; restored: boolean } {
  if (!raw || typeof raw !== "object") return { form: server, restored: false };
  const draft = raw as Partial<StudioForm>;
  if (typeof draft.displayName !== "string") return { form: server, restored: false };
  return {
    form: {
      ...server,
      ...draft,
      emails: Array.isArray(draft.emails) ? draft.emails : server.emails,
      phones: Array.isArray(draft.phones) ? draft.phones : server.phones,
      websites: Array.isArray(draft.websites) ? draft.websites : server.websites,
      isPublished: published,
    },
    restored: true,
  };
}

export function DigitalCardStudioClient() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [planId, setPlanId] = useState<SmartCardPlanId>("yearly");
  const [plans, setPlans] = useState<SmartCardPlan[]>(SMARTCARD_PLANS);
  const [paying, setPaying] = useState(false);
  const [slugCustomized, setSlugCustomized] = useState(false);
  const [accountUsername, setAccountUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [usernameConfirming, setUsernameConfirming] = useState(false);
  const [baseline, setBaseline] = useState("");
  const themeFromQuery = useRef<DigitalCardThemeId | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const noticeTimer = useRef<number>(0);
  activeIdRef.current = activeId;

  const note = useCallback((text: string) => {
    setError(null);
    setMessage(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => {
      setMessage((current) => (current === text ? null : current));
    }, 3800);
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const origin = getCeleYouShareOrigin();

  const applyThemeQuery = useCallback(() => {
    const themeId = themeFromQuery.current;
    if (!themeId) return;
    setForm((prev) => (prev.themeId === themeId ? prev : { ...prev, themeId }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, plansRes] = await Promise.all([
        fetch("/api/digital-business-cards"),
        fetch("/api/digital-business-cards/plans"),
      ]);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Failed to load");
      if (plansRes.ok) {
        const catalog = await plansRes.json().catch(() => ({}));
        if (Array.isArray((catalog as { data?: { plans?: unknown } }).data?.plans) && (catalog as { data: { plans: unknown[] } }).data.plans.length) {
          setPlans((catalog as { data: { plans: SmartCardPlan[] } }).data.plans);
        }
      }
      const list = (json.data ?? []) as CardRow[];
      const identity = (json as { identity?: { username?: string | null } }).identity;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (
          params.get("studio") !== "1" &&
          params.get("welcome") !== "1" &&
          ownerNeedsFirstCardActivation(list)
        ) {
          window.location.replace(
            celeCardOwnerStartPath(params.get("plan"), params.get("theme"))
          );
          return;
        }
      }
      setSavedUsername(identity?.username ?? null);
      setAccountUsername(identity?.username ?? "");
      setCards(list);
      const wanted =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("card") ||
            new URLSearchParams(window.location.search).get("adminCard")
          : null;
      if (wanted) {
        const found = list.find((c) => c.id === wanted);
        if (found) {
          selectCard(found);
        } else {
          setError("Studio only shows CeleYou cards you own. Open a customer's card from Command Center.");
          if (list.length && !activeIdRef.current) selectCard(list[0]);
        }
      } else if (activeIdRef.current) {
        const found = list.find((c) => c.id === activeIdRef.current);
        if (found) selectCard(found);
        else if (list.length) selectCard(list[0]);
      } else if (list.length) {
        selectCard(list[0]);
      }
      applyThemeQuery();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("plan");
    if (fromQuery && SMARTCARD_PLANS.some((p) => p.id === fromQuery)) {
      setPlanId(fromQuery as SmartCardPlanId);
    }
    const themeQuery = params.get("theme");
    if (themeQuery && DIGITAL_CARD_THEMES.some((theme) => theme.id === themeQuery)) {
      themeFromQuery.current = themeQuery as DigitalCardThemeId;
      applyThemeQuery();
    }
    const reference = params.get("reference") || params.get("trxref");
    if (params.get("payment") === "callback" && reference) {
      void (async () => {
        let keepReference = false;
        try {
          const res = await fetch(
            `/api/digital-business-cards/subscribe/confirm?reference=${encodeURIComponent(reference)}`
          );
          const json = await res.json();
          if (!res.ok) {
            setError(json.error || "Payment could not be confirmed yet.");
          } else {
            const outcome = celeCardCheckoutUi(
              json.data?.status as string | undefined,
              json.data?.live as boolean | undefined
            );
            if (outcome.kind === "success") {
              setMessage(outcome.text);
              await load();
            } else if (outcome.kind === "error") {
              setError(outcome.text);
            } else {
              setMessage(outcome.text);
              keepReference = true;
            }
          }
        } catch {
          setError("Payment confirmation failed.");
        } finally {
          if (!keepReference) {
            const url = new URL(window.location.href);
            url.searchParams.delete("payment");
            url.searchParams.delete("reference");
            url.searchParams.delete("trxref");
            window.history.replaceState({}, "", url.pathname + url.search);
          }
        }
      })();
    }
  }, [applyThemeQuery, load]);

  const setSlug = useCallback((slug: string) => {
    setForm((current) => (current.slug === slug ? current : { ...current, slug }));
  }, []);

  function selectCard(card: CardRow) {
    setActiveId(card.id);
    setSlugCustomized(true);
    const server = formFromCard(card);
    const draft = readCeleYouStudioDraft<StudioForm>(card.id);
    const next = overlayStudioDraft(server, draft?.value, card.isPublished);
    setForm(next.form);
    setBaseline(JSON.stringify(server));
    if (next.restored) {
      note("Unsaved studio changes restored. Save to publish them.");
    }
  }

  const active = useMemo(() => cards.find((c) => c.id === activeId) ?? null, [cards, activeId]);
  const publicUrl = (accountUsername || form.slug) ? digitalCardIdentityUrl(accountUsername || form.slug, origin) : "";
  const shareUrl = active?.publicToken ? celeYouCameraScanUrl(active.publicToken, origin) : publicUrl.startsWith("http") ? publicUrl : "";
  const nfcShareUrl = active?.nfcPublicToken ? celeYouNfcScanUrl(active.nfcPublicToken, origin) : shareUrl;
  const qrSrc = shareUrl.startsWith("http") ? digitalCardQrImageSrc(shareUrl) : null;
  const previewTheme = applyCeleCardDesign(resolveDigitalCardTheme(form.themeId), form.design);
  const reachPreview = useMemo(
    () =>
      listDigitalCardReachItems({
        email: form.emails[0] || null,
        phone: form.phones[0] || null,
        website: form.websites[0] || null,
        socials: {
          ...compactDigitalCardSocials(
            {
              ...form.socials,
              website: form.websites,
            },
            form.payQr
          ),
          emails: form.emails.map((value) => value.trim()).filter(Boolean),
          emailTags: compactAlignedTags(form.emails, form.emailTags),
          phones: form.phones.map((value) => value.trim()).filter(Boolean),
          phoneTags: compactAlignedTags(form.phones, form.phoneTags),
          linkKinds: compactChatLinkKindsFromForm(form.socials, form.linkKinds),
          stackOrder: form.stackOrder,
          dockOrder: form.dockOrder,
          meeting: persistMeetingDesk(form.meeting),
          business: persistBusinessProfile(form.business),
        },
      }),
    [form]
  );
  const guestPreviewReach = useMemo(
    () => applyReachVisibilityPreview(reachPreview, form.reachVisibility),
    [reachPreview, form.reachVisibility]
  );
  const publishedOnServer = active?.isPublished === true;
  const unsaved = Boolean(baseline) && JSON.stringify(form) !== baseline;
  const mayServerAutosave =
    Boolean(activeId) &&
    studioDraftMayServerAutosave(publishedOnServer) &&
    form.displayName.trim().length >= 2;

  useEffect(() => {
    if (!activeId) return;
    writeCeleYouStudioDraft(activeId, form, publishedOnServer);
  }, [activeId, form, publishedOnServer]);

  useEffect(() => {
    if (!unsaved) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [unsaved]);

  const persistStudioDraft = useCallback(
    async (nextForm: StudioForm) => {
      if (!activeId) return;
      const res = await fetch(`/api/digital-business-cards/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studioPayloadFromForm(nextForm, false)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Draft save failed");
      setBaseline(JSON.stringify(nextForm));
    },
    [activeId]
  );

  const autosave = useStudioAutosave({
    value: form,
    enabled: mayServerAutosave,
    resetKey: activeId,
    saveOnEnable: unsaved,
    save: persistStudioDraft,
  });

  const saveStatus =
    autosave.status === "saving"
      ? "Saving draft…"
      : autosave.status === "error"
        ? "Draft save failed"
        : unsaved
          ? publishedOnServer
            ? "Unsaved. Save to publish."
            : "Unsaved draft"
          : autosave.status === "saved" && !publishedOnServer
            ? "Draft saved"
            : null;

  async function save() {
    if (form.displayName.trim().length < 2) {
      setError("Add a name before saving.");
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    const payload = studioPayloadFromForm(form, true);

    try {
      const res = await fetch(
        activeId ? `/api/digital-business-cards/${activeId}` : "/api/digital-business-cards",
        {
          method: activeId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      const savedSlug = typeof json.data?.slug === "string" ? json.data.slug : "";
      if (savedSlug && savedSlug !== form.slug) {
        setSlug(savedSlug);
        setSlugCustomized(true);
      }
      const savedId = typeof json.data?.id === "string" ? json.data.id : activeId;
      if (savedId) clearCeleYouStudioDraft(savedId);
      setBaseline(JSON.stringify(form));
      note(
        activeId
          ? form.isPublished
            ? "Published changes are live."
            : "Draft saved. It is not on the public page yet."
          : "Card saved. Your public identity stays on CeleYou Free. Try Pro for 7 days after you publish."
      );
      await load();
      if (!activeId && json.data?.id) {
        setActiveId(json.data.id);
        selectCard(json.data as CardRow);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function subscribe() {
    if (!activeId) {
      setError("Save the card first, then activate a plan.");
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-business-cards/${activeId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      if (json.data?.inherited) {
        note("This card now uses your current subscription. It has its own QR, link, and NFC.");
        await load();
        return;
      }
      if (json.data?.free) {
        note("Plan activated. Your CeleYou is live.");
        await load();
        return;
      }
      if (json.data?.authorizationUrl) {
        window.location.href = json.data.authorizationUrl as string;
        return;
      }
      throw new Error("Paystack did not return a checkout URL");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setPaying(false);
    }
  }

  async function copyLink() {
    const canonical = shareUrl || publicUrl;
    if (!canonical) return;
    await navigator.clipboard.writeText(canonical);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function uploadPayQr(file: File): Promise<string | null> {
    const data = new FormData();
    data.append("file", file);
    try {
      const res = await fetch("/api/digital-business-cards/pay-qr", { method: "POST", body: data });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not upload the QR.");
        return null;
      }
      return (json.data?.url as string) || null;
    } catch {
      setError("Could not upload the QR.");
      return null;
    }
  }

  function startNew() {
    setActiveId(null);
    setSlugCustomized(false);
    setForm(emptyForm);
    setBaseline(JSON.stringify(emptyForm));
    note("New card ready. Add a name, then save.");
  }

  return (
    <div className="celecard-studio space-y-6">
      <div className="celecard-studio-masthead">
        <div className="celecard-studio-masthead-copy">
          <CeleYouBrandMark variant="chip" tone="light" className="mb-3" markClassName="h-8 w-8" />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              One link for every contact
            </h1>
            {active ? (
              <Badge variant="secondary">
                {active.isLive ? "Live" : active.guestShareable ? "Shareable" : "Offline"}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Design the plate, fill Reach, then share. Guests open it in any browser. No app, no account.
          </p>
        </div>
        <div className="celecard-studio-toolbar">
          {saveStatus ? (
            <p className="celecard-studio-save-status text-[11px] font-medium text-[#0B8A83]">{saveStatus}</p>
          ) : null}
          <Button type="button" variant="outline" className="celecard-studio-new" onClick={startNew}>
            <Plus className="mr-2 h-4 w-4" />
            New card
          </Button>
          <Button
            type="button"
            className="celecard-studio-save"
            onClick={save}
            disabled={saving || form.displayName.trim().length < 2}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {publishedOnServer && unsaved ? "Publish changes" : form.isPublished ? "Save" : "Save draft"}
          </Button>
        </div>
      </div>

      {active?.subscriptionExpiresAt ? (
        <DigitalCardLiveTermRibbon
          cardId={active.id}
          themeName={previewTheme.name}
          planLabel={(active.subscriptionStatus || "").toUpperCase() === "TRIAL" ? "Trial" : "Paid"}
          endsAt={active.subscriptionExpiresAt}
          startsAt={active.lastActivatedAt || active.createdAt}
          status={active.subscriptionStatus}
          viewCount={active.viewCount}
          nfcEnabled={active.nfcEnabled}
          qrLive={Boolean(active.publicToken && (active.guestShareable || active.isLive))}
          accent={previewTheme.accent}
          border={previewTheme.border}
          fg="#1c1917"
          muted="rgba(28,25,23,0.68)"
          faint="rgba(28,25,23,0.05)"
        />
      ) : null}

      {active?.lifecycleState === "COURTESY" || (active && !active.isLive && active.subscriptionStatus === "EXPIRED") ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-800">
          <p className="font-display text-lg font-semibold">Your CeleYou is ready when you are.</p>
          <p className="mt-1 text-stone-600">
            Your identity, designs, and sharing link are preserved. Reactivate to restore your complete digital profile.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/business-card/billing">Reactivate CeleYou</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href="#celecard-design-vault">View Saved Designs</a>
            </Button>
          </div>
        </div>
      ) : null}

      <DigitalCardStudioNotice message={message} error={error} />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
        <nav className="celecard-studio-jump" aria-label="Studio sections">
          {STUDIO_JUMP.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <DigitalCardAnalyticsPanel cardId={activeId} />

        <div
          id="studio-activation"
          className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
        >
          <p className="text-sm font-semibold tracking-tight text-slate-900">Activation</p>
          <div className="cta-phrase-grid gap-1.5">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                disabled={active?.canRenew === false}
                onClick={() => {
                  if (active?.canRenew === false) return;
                  setPlanId(plan.id);
                }}
                className={`whitespace-nowrap rounded-lg border px-2 py-1.5 text-left text-[11px] ${
                  planId === plan.id
                    ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                    : "border-slate-200 text-slate-600"
                } ${active?.canRenew === false ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span className="font-semibold">{plan.label}</span>
                <span className="ml-1">₵{plan.priceGhs}</span>
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full whitespace-nowrap bg-[#0B8A83] hover:bg-[#097a74]"
            onClick={subscribe}
            disabled={!activeId || paying || active?.canRenew === false}
          >
            {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            {active?.canRenew === false
              ? CELEYOU_TERM_LOCKED_CTA
              : `Activate ${plans.find((p) => p.id === planId)?.label} · ₵${plans.find((p) => p.id === planId)?.priceGhs}`}
          </Button>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {active?.canRenew === false ? CELEYOU_TERM_LOCKED_HINT : CELEYOU_TERM_OPEN_HINT}
          </p>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/business-card/billing">Manage billing</Link>
          </Button>
        </div>

        <div className="celecard-studio-desk">
          <div className="celecard-studio-identity-col space-y-4">
            {cards.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCard(c)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      c.id === activeId
                        ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {c.displayName}
                  </button>
                ))}
              </div>
            ) : null}

            <StudioPanel
              id="studio-identity"
              title="Identity"
              hint="Portrait, name, and the line that sits on the plate."
            >
            <div className="celecard-studio-identity">
              <div className="celecard-studio-identity-wide space-y-2">
                <Label>Portrait</Label>
                <DigitalCardPortraitField
                  value={form.avatarUrl}
                  onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url }))}
                  theme={resolveDigitalCardTheme(form.themeId)}
                  displayName={form.displayName}
                  onError={setError}
                  mode="api"
                  portraitFrame={form.portraitFrame}
                  onPortraitFrameChange={(portraitFrame) => setForm((f) => ({ ...f, portraitFrame }))}
                />
              </div>
              <div className="celecard-studio-identity-wide space-y-2">
                <Label htmlFor="displayName">Full name</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Ama Mensah"
                />
                <PlateNameHint name={form.displayName} />
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Full name sits on the plate and can match other people. Your username is the unique public address.
                </p>
              </div>
              <div className="celecard-studio-identity-wide space-y-2">
                <CeleYouUsernameField
                  value={accountUsername}
                  onChange={(username) => {
                    setAccountUsername(username);
                    setUsernameConfirming(false);
                  }}
                  displayName={form.displayName}
                  company={form.company}
                  profession={form.title}
                  currentUsername={savedUsername}
                  publicOrigin={origin}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving || accountUsername.trim().length < 3}
                  onClick={() => {
                    void (async () => {
                      const res = await fetch("/api/digital-business-cards/username", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          username: accountUsername,
                          confirm: usernameConfirming,
                          displayName: form.displayName,
                          company: form.company,
                          profession: form.title,
                          primaryCardId: activeId,
                        }),
                      });
                      const json = (await res.json().catch(() => ({}))) as {
                        error?: string;
                        needsConfirm?: boolean;
                        data?: { username?: string | null };
                      };
                      if (res.status === 409 && json.needsConfirm) {
                        setUsernameConfirming(true);
                        setError(json.error ?? "Confirm this username change.");
                        return;
                      }
                      if (!res.ok) {
                        setError(json.error ?? "Could not save that username.");
                        return;
                      }
                      setUsernameConfirming(false);
                      setSavedUsername(json.data?.username ?? accountUsername);
                      note("Username saved. QR and NFC links stay the same.");
                    })();
                  }}
                >
                  {usernameConfirming ? "Confirm new username" : "Save username"}
                </Button>
              </div>
              <div className="celecard-studio-identity-wide space-y-2">
                <Label htmlFor="title">Title / role</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Founder & Creative Director"
                />
                <TitlePlateHint name={form.title} />
              </div>
              <div className="celecard-studio-identity-wide space-y-2">
                <Label htmlFor="company">Company</Label>
                <div className="flex items-start gap-3">
                  <DigitalCardCompanyLogoField
                    value={form.companyLogoUrl}
                    onChange={(url) => {
                      setForm((f) => ({ ...f, companyLogoUrl: url }));
                      if (url) note("Company logo selected.");
                    }}
                    onAction={note}
                    company={form.company}
                    theme={resolveDigitalCardTheme(form.themeId)}
                    onError={setError}
                    compact
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Input
                      id="company"
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      placeholder="Aura Group"
                    />
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      Upload a square PNG or JPEG. It sits on the profile picture on the card.
                    </p>
                    <CompanyPlateHint name={form.company} />
                  </div>
                </div>
              </div>
              <div className="celecard-studio-identity-wide space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor="bio">About</Label>
                  <span id="bio-count" className="text-[11px] tabular-nums text-slate-500">
                    {form.bio.length}/{CELECARD_BIO_MAX_CHARS}
                  </span>
                </div>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: clipCeleCardBio(e.target.value) }))}
                  placeholder="One short line about what you do."
                  rows={4}
                  maxLength={CELECARD_BIO_MAX_CHARS}
                  aria-describedby="bio-count"
                />
              </div>
            </div>
            </StudioPanel>
          </div>

          <div className="celecard-studio-work">
              <div id="studio-look" className="scroll-mt-16">
              <DigitalCardDesignDesk
                  themeId={form.themeId}
                  design={form.design}
                  portraitFrame={form.portraitFrame}
                  onPortraitFrameChange={(portraitFrame) => setForm((f) => ({ ...f, portraitFrame }))}
                  onThemeChange={(themeId, options) => {
                    const next = resolveDigitalCardTheme(themeId);
                    const keepFinish = options?.keepFinish !== false;
                    setForm((f) => {
                      const current = resolveDigitalCardTheme(f.themeId);
                      return {
                        ...f,
                        themeId,
                        portraitFrame: keepFinish ? f.portraitFrame : celecardPortraitFrame(next),
                        design: designAfterThemeChange(f.design, next, keepFinish, current),
                      };
                    });
                  }}
                  onDesignChange={(design) => setForm((f) => ({ ...f, design }))}
                  onError={setError}
                />
              </div>
              <DigitalCardDesignVault cardId={activeId} />
            <StudioPanel
              id="studio-contact"
              title="Contact"
              hint="Mail, number, website, location, meetings, and the public link guests open."
            >
              <div className="space-y-4">
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-2">
                  <DigitalCardBrandMark id="email" className="h-7 w-7 rounded-[9px]" />
                  Email
                </Label>
                <DigitalCardRepeatFields
                  brand="email"
                  values={form.emails}
                  tags={form.emailTags}
                  onTaggedChange={({ values, tags }) => setForm((f) => ({ ...f, emails: values, emailTags: tags }))}
                  type="email"
                  placeholder="you@studio.com"
                  addLabel="Add another email"
                  inputClassName={studioInputClass}
                  addStyle={{ color: "#0B8A83" }}
                  showKindTags
                  tagAccent="#0B8A83"
                />
              </div>
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-2">
                  <DigitalCardBrandMark id="phone" className="h-7 w-7 rounded-[9px]" />
                  Phone
                </Label>
                <DigitalCardRepeatFields
                  brand="phone"
                  values={form.phones}
                  tags={form.phoneTags}
                  onTaggedChange={({ values, tags }) => setForm((f) => ({ ...f, phones: values, phoneTags: tags }))}
                  type="tel"
                  placeholder="+233 …"
                  addLabel="Add another number"
                  inputClassName={studioInputClass}
                  addStyle={{ color: "#0B8A83" }}
                  showKindTags
                  tagAccent="#0B8A83"
                />
              </div>
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-2">
                  <DigitalCardBrandMark id="website" className="h-7 w-7 rounded-[9px]" />
                  Website
                </Label>
                <DigitalCardRepeatFields
                  brand="website"
                  values={form.websites}
                  onChange={(websites) => setForm((f) => ({ ...f, websites }))}
                  placeholder="www. or http://"
                  addLabel="Add another site"
                  inputClassName={studioInputClass}
                  addStyle={{ color: "#0B8A83" }}
                />
              </div>
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-2">
                  <DigitalCardBrandMark id="location" className="h-7 w-7 rounded-[9px]" />
                  Location
                </Label>
                <p className="text-xs leading-5 text-muted-foreground">
                  Paste a Google Maps, Amap, Apple Maps, Bing, Waze, OpenStreetMap, or other map link. A street
                  address works too. Guests tap Location. The map drops in, then they open it in their maps app.
                </p>
                <DigitalCardRepeatFields
                  brand="location"
                  values={form.socials.location}
                  onChange={(location) =>
                    setForm((f) => ({ ...f, socials: { ...f.socials, location } }))
                  }
                  placeholder="Google Maps, Amap, or a street address"
                  addLabel="Add another place"
                  inputClassName={studioInputClass}
                  addStyle={{ color: "#0B8A83" }}
                />
                {locationPreviewItems(form.socials.location).length ? (
                  <DigitalCardLocationDrop
                    items={locationPreviewItems(form.socials.location)}
                    theme={resolveDigitalCardTheme(form.themeId)}
                    compact
                    preview
                  />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-2">
                  <DigitalCardBrandMark id="meeting" className="h-7 w-7 rounded-[9px]" />
                  Meetings
                </Label>
                <p className="text-xs leading-5 text-muted-foreground">
                  Guests pick a date and time on your card. Times come from this CeleYou desk and from meetings already booked here. CeleYou does not read Google Calendar or Outlook. Add a Calendly or Cal.com page under Other pages if you use an external calendar. Confirm or decline from Connections and they are messaged.
                </p>
                <DigitalCardMeetingDesk
                  value={form.meeting}
                  onChange={(meeting) => setForm((f) => ({ ...f, meeting }))}
                  inputClassName={studioInputClass}
                />
                {meetingPreviewItems(form.meeting).length ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <DigitalCardMeetingDrop
                      items={meetingPreviewItems(form.meeting)}
                      theme={resolveDigitalCardTheme(form.themeId)}
                      compact
                      preview
                      ownerName={form.displayName}
                    />
                  </div>
                ) : null}
                <div className="rounded-2xl border border-slate-200 p-3">
                  <label className="flex items-start gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={form.business.enabled}
                      onChange={(event) =>
                        setForm((f) => ({
                          ...f,
                          business: { ...f.business, enabled: event.target.checked },
                        }))
                      }
                    />
                    <span>
                      <span className="font-medium">Show business extras</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Optional hours and services. Personal cards can stay off. Website, location, payments, and booking already live on the card.
                      </span>
                    </span>
                  </label>
                  {form.business.enabled ? (
                    <div className="mt-3 space-y-2">
                      <input
                        value={form.business.hours}
                        onChange={(event) =>
                          setForm((f) => ({ ...f, business: { ...f.business, hours: event.target.value } }))
                        }
                        placeholder="Mon–Fri 9:00–17:00 Accra"
                        className={studioInputClass}
                      />
                      <input
                        value={form.business.services.join(", ")}
                        onChange={(event) =>
                          setForm((f) => ({
                            ...f,
                            business: {
                              ...f.business,
                              services: event.target.value
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean)
                                .slice(0, 6),
                            },
                          }))
                        }
                        placeholder="Brand design, Photography, Consulting"
                        className={studioInputClass}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              <DigitalCardSlugField
                value={form.slug}
                onChange={setSlug}
                displayName={form.displayName}
                company={form.company}
                title={form.title}
                excludeId={activeId}
                publicUrl={publicUrl}
                copied={copied}
                onCopy={() => void copyLink()}
                followIdentity={!slugCustomized}
                onUserEdit={() => setSlugCustomized(true)}
              />
              </div>
            </StudioPanel>

            <StudioPanel
              id="studio-reach"
              title="Reach"
              hint="Search or flip through a network. Tap one to add it, then fill that field. If the app is not listed, save it as another page guests can open."
            >
            <div className="space-y-5">
              {DIGITAL_CARD_SOCIAL_GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {group.label}
                  </p>
                  {group.id === "pay" ? (
                    <DigitalCardPayGroup
                      socials={form.socials}
                      payQr={form.payQr}
                      accent="#0B8A83"
                      intro={
                        <p className="mb-3 text-xs text-slate-500">
                          Official wallet marks. Guests only see the wallets you fill. Number, cashtag, payment link, bank account, or a receive QR.
                        </p>
                      }
                      onAdd={(key) =>
                        setForm((f) => {
                          const current = f.socials[key as keyof typeof f.socials];
                          return {
                            ...f,
                            socials: { ...f.socials, [key]: current?.length ? current : [""] },
                          };
                        })
                      }
                      onRemove={(key) =>
                        setForm((f) => ({
                          ...f,
                          socials: { ...f.socials, [key]: [] },
                          payQr: writePayQrBrand(f.payQr, key, []),
                        }))
                      }
                    >
                      {(network) => (
                        <div className="space-y-2">
                          <Label className="inline-flex items-center gap-2">
                            <DigitalCardBrandMark id={network.key} className="h-10 w-10 rounded-[12px]" />
                            {network.label}
                          </Label>
                          <DigitalCardPayFields
                            brand={network.key}
                            values={form.socials[network.key] ?? []}
                            qrUrls={payQrListForBrand(form.payQr, network.key, form.socials[network.key])}
                            onChange={(next, qrUrls) =>
                              setForm((f) => ({
                                ...f,
                                socials: { ...f.socials, [network.key]: next },
                                payQr: writePayQrBrand(f.payQr, network.key, qrUrls),
                              }))
                            }
                            onRemoveWallet={() =>
                              setForm((f) => ({
                                ...f,
                                socials: { ...f.socials, [network.key]: [] },
                                payQr: writePayQrBrand(f.payQr, network.key, []),
                              }))
                            }
                            placeholder={network.placeholder}
                            addLabel={`Add another ${network.label}`}
                            inputClassName={studioInputClass}
                            addStyle={{ color: "#0B8A83" }}
                            onUploadFile={uploadPayQr}
                          />
                        </div>
                      )}
                    </DigitalCardPayGroup>
                  ) : (
                  <DigitalCardReachCatalog
                    groupId={group.id}
                    socials={form.socials}
                    payQr={form.payQr}
                    accent="#0B8A83"
                    intro={
                      group.id === "chat" ? (
                        <p className="mb-3 text-xs text-slate-500">
                          Number, username, group, or channel. Tagged so guests can choose.
                        </p>
                      ) : group.id === "social" ? (
                        <p className="mb-3 text-xs text-slate-500">
                          Profiles, posts, and any page that is not in the list. Other links stay reserved at the bottom.
                        </p>
                      ) : null
                    }
                    onAdd={(key, seed) =>
                      setForm((f) => {
                        const current = f.socials[key as keyof typeof f.socials] ?? [];
                        const filled = current.filter((value) => value.trim());
                        const next = filled.length
                          ? seed
                            ? [...filled, seed]
                            : current
                          : [seed ?? ""];
                        return {
                          ...f,
                          socials: { ...f.socials, [key]: next },
                        };
                      })
                    }
                    onRemove={(key) =>
                      setForm((f) => ({
                        ...f,
                        socials: { ...f.socials, [key]: [] },
                        payQr: writePayQrBrand(f.payQr, key, []),
                        linkKinds: { ...f.linkKinds, [key]: [] },
                      }))
                    }
                  >
                    {(network) => (
                      <div className="space-y-2 pr-8">
                        <Label className="inline-flex items-center gap-2">
                          <DigitalCardBrandMark id={network.key} className="h-7 w-7 rounded-[9px]" />
                          {network.label}
                        </Label>
                        {network.key === "other" ? (
                          <DigitalCardOtherFields
                            values={form.socials[network.key] ?? []}
                            onChange={(next) =>
                              setForm((f) => ({
                                ...f,
                                socials: { ...f.socials, [network.key]: next },
                              }))
                            }
                            inputClassName={studioInputClass}
                            addStyle={{ color: "#0B8A83" }}
                          />
                        ) : (
                          <DigitalCardRepeatFields
                            brand={network.key}
                            values={form.socials[network.key] ?? []}
                            showChatKinds={usesChatLinkKinds(network.key)}
                            chatKinds={form.linkKinds[network.key]}
                            onChatKindsChange={(kinds) =>
                              setForm((f) => ({ ...f, linkKinds: { ...f.linkKinds, [network.key]: kinds } }))
                            }
                            tagAccent="#0B8A83"
                            onChange={(next) =>
                              setForm((f) => ({
                                ...f,
                                socials: { ...f.socials, [network.key]: next },
                              }))
                            }
                            qrUrls={payQrListForBrand(form.payQr, network.key, form.socials[network.key])}
                            onQrUrlsChange={(qrUrls) =>
                              setForm((f) => ({
                                ...f,
                                payQr: writePayQrBrand(f.payQr, network.key, qrUrls),
                              }))
                            }
                            onUploadFile={uploadPayQr}
                            placeholder={network.placeholder}
                            addLabel={`Add another ${network.label}`}
                            inputClassName={studioInputClass}
                            addStyle={{ color: "#0B8A83" }}
                          />
                        )}
                      </div>
                    )}
                  </DigitalCardReachCatalog>
                  )}
                </div>
              ))}
              <DigitalCardOtherReservation
                values={form.socials.other ?? []}
                onChange={(next) =>
                  setForm((f) => ({
                    ...f,
                    socials: { ...f.socials, other: next },
                  }))
                }
                accent="#0B8A83"
                inputClassName={studioInputClass}
              />
            </div>
            </StudioPanel>

            <DigitalCardPrivacyDesk
              items={reachPreview}
              visibility={form.reachVisibility}
              onVisibilityChange={(reachVisibility) => setForm((f) => ({ ...f, reachVisibility }))}
              cardId={activeId}
            />

            <StudioPanel
              id="studio-arrange"
              title="Guest page arrangement"
              hint="Drag to set the order guests see. Empty fields stay off the public page."
            >
              <DigitalCardReachOrderEditor
                items={reachPreview}
                onChange={({ stackOrder, dockOrder }) => setForm((f) => ({ ...f, stackOrder, dockOrder }))}
              />
            </StudioPanel>

            <DigitalCardConnectionInbox cardId={activeId} />
            <DigitalCardConnectAutomations cardId={activeId} />
          </div>

          <aside id="studio-preview" className="celecard-studio-preview space-y-4">
            <section id="studio-live" className="celecard-studio-live scroll-mt-16" aria-label="Live sharing">
              <div className="celecard-studio-live-row">
                <label htmlFor="studio-live-published" className="min-w-0 flex-1 cursor-pointer">
                  <span className="celecard-studio-live-title">Published</span>
                  <span className="celecard-studio-live-hint">Guests can open this CeleYou</span>
                </label>
                <input
                  id="studio-live-published"
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                />
              </div>
              <div className="celecard-studio-live-row">
                <div className="min-w-0 flex-1">
                  <label htmlFor="studio-live-nfc" className="celecard-studio-live-title cursor-pointer">
                    <Nfc className="h-3.5 w-3.5" aria-hidden />
                    NFC ready
                  </label>
                  {activeId ? (
                    <Link href={nfcStudioPath(activeId)} className="celecard-studio-live-link">
                      Manage cards
                    </Link>
                  ) : (
                    <span className="celecard-studio-live-hint">Save first, then program a card</span>
                  )}
                </div>
                <input
                  id="studio-live-nfc"
                  type="checkbox"
                  checked={form.nfcEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, nfcEnabled: e.target.checked }))}
                />
              </div>
            </section>

            <DigitalCardStudioPreview
              status={saveStatus}
              stageBackground={previewTheme.stageBackground}
              plate={
                <DigitalCardFace
                  themeId={form.themeId}
                  displayName={form.displayName || "Your name"}
                  title={form.title || "Your title"}
                  company={form.company || "Company"}
                  avatarUrl={form.avatarUrl}
                  qrSrc={qrSrc}
                  qrHref={form.slug ? digitalCardIdentityUrl(form.slug) : null}
                  compact
                  portraitFrame={form.portraitFrame}
                  companyLogo
                  companyLogoUrl={form.companyLogoUrl}
                  design={form.design}
                />
              }
              guest={
                guestPreviewReach.length ? (
                  <DigitalCardReachGrid
                    items={guestPreviewReach}
                    theme={DIGITAL_CARD_THEMES.find((t) => t.id === form.themeId) ?? DIGITAL_CARD_THEMES[0]}
                    compact
                    slug={form.slug || undefined}
                    ownerName={form.displayName}
                  />
                ) : (
                  <p className="text-[11px] text-slate-500">Add contact details to preview the guest page.</p>
                )
              }
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              {form.slug ? (
                <DigitalCardShareDesk
                  profileUrl={publicUrl || digitalCardIdentityUrl(form.slug)}
                  presentUrl={digitalCardPresentPath(form.slug, { immersive: true })}
                  shareUrl={shareUrl || publicUrl}
                  nfcUrl={nfcShareUrl || publicUrl}
                  cardId={activeId || undefined}
                  proximityDiscoverable={form.proximityDiscoverable}
                  onProximityChange={(value) => setForm((f) => ({ ...f, proximityDiscoverable: value }))}
                  displayName={form.displayName || "CeleYou"}
                  vcard={
                    {
                      id: activeId || "",
                      slug: form.slug,
                      publicToken: active?.publicToken || "",
                      displayName: form.displayName || "CeleYou",
                      title: form.title || null,
                      company: form.company || null,
                      bio: form.bio || null,
                      email: form.emails[0] || null,
                      phone: form.phones[0] || null,
                      website: form.websites[0] || null,
                      socials: compactDigitalCardSocials(form.socials, form.payQr),
                      themeId: form.themeId,
                      avatarUrl: form.avatarUrl,
                      pronouns: null,
                      nfcEnabled: form.nfcEnabled,
                      connectBackEnabled: true,
                      defaultMode: "professional",
                      isLive: Boolean(active?.isLive),
                    } satisfies DigitalCardPublicPayload
                  }
                />
              ) : (
                <p className="text-xs text-slate-500">Save the card to show, share, and download QR files.</p>
              )}
            </div>
          </aside>
        </div>
        </>
      )}
    </div>
  );
}
