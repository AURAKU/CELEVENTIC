"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CreditCard,
  Loader2,
  Nfc,
  Plus,
  Save,
  Smartphone,
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
import { applyCeleCardDesign, compactCeleCardDesign, type CeleCardDesign } from "@/lib/digital-business-card/design";
import {
  compactMeetingDesk,
  defaultMeetingDesk,
  persistMeetingDesk,
  type CeleCardMeetingDesk,
} from "@/lib/digital-business-card/meetings";
import { celecardTypeVoice } from "@/lib/digital-business-card/type-voice";
import { SMARTCARD_PLANS, type SmartCardPlan, type SmartCardPlanId } from "@/lib/digital-business-card/plans";
import { smartCardNfcUrl, smartCardShortUrl } from "@/lib/digital-business-card/product";
import {
  DIGITAL_CARD_TRIAL_DAYS,
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
  chatKindsForBrand,
  compactAlignedChatKinds,
  compactAlignedTags,
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
import { DigitalCardOtherFields } from "@/components/digital-business-card/digital-card-other-fields";
import { DigitalCardMeetingDesk } from "@/components/digital-business-card/digital-card-meeting-desk";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";
import { DigitalCardReachOrderEditor } from "@/components/digital-business-card/digital-card-reach-order";
import { DigitalCardReachGrid } from "@/components/digital-business-card/digital-card-reach-grid";
import { DigitalCardPortraitField } from "@/components/digital-business-card/digital-card-portrait-field";
import { DigitalCardCompanyLogoField } from "@/components/digital-business-card/digital-card-company-logo-field";
import { DigitalCardSlugField } from "@/components/digital-business-card/digital-card-slug-field";
import { DigitalCardLiveTermRibbon } from "@/components/digital-business-card/digital-card-subscription-countdown";
import { DigitalCardPrivacyDesk } from "@/components/digital-business-card/digital-card-privacy-desk";
import { DigitalCardDesignVault } from "@/components/digital-business-card/digital-card-design-vault";
import { DigitalCardConnectionInbox } from "@/components/digital-business-card/digital-card-connection-inbox";
import { DigitalCardShareDesk } from "@/components/digital-business-card/digital-card-share-desk";
import { DigitalCardAnalyticsPanel } from "@/components/digital-business-card/digital-card-analytics-panel";
import { celeCardCheckoutUi } from "@/lib/digital-business-card/checkout-outcome";
import { applyReachVisibilityPreview, type ReachVisibility } from "@/lib/digital-business-card/privacy-preview";
import {
  celecardPortraitFrame,
  resolveCeleCardPortraitFrame,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import { digitalCardPresentPath } from "@/lib/digital-business-card/share";
import { TAP_TO_CONNECT_CTA, tapStudioPath } from "@/lib/celeyou-proximity/product";
import { nfcStudioPath } from "@/lib/digital-business-card/nfc-device";
import { getCeleYouShareOrigin } from "@/lib/app-url";
import { celeCardHouseAvatarId, celeCardHouseAvatarMeta } from "@/lib/digital-business-card/portraits";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";

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
  viewCount: number;
  isLive: boolean;
  guestShareable?: boolean;
  publicToken?: string;
  nfcPublicToken?: string | null;
  lifecycleState?: string;
  canRenew?: boolean;
};

const studioInputClass =
  "flex h-11 w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-base outline-none ring-offset-white focus-visible:ring-2 focus-visible:ring-slate-400 sm:h-10 sm:text-sm";

function StudioPanel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

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
  themeId: "elegant-frost" as DigitalCardThemeId,
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
};

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
  const themeFromQuery = useRef<DigitalCardThemeId | null>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

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
    const socials = normalizeSocials(card.socials);
    const emails = collectCardEmails({ email: card.email, socials });
    const phones = collectCardPhones({ phone: card.phone, socials });
    const websites = collectCardWebsites({ website: card.website, socials });
    const emailTags = collectTaggedEmails({ email: card.email, socials }).map((item) => item.tag ?? "");
    const phoneTags = collectTaggedPhones({ phone: card.phone, socials }).map((item) => item.tag ?? "");
    setForm({
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
      themeId: (card.themeId as DigitalCardThemeId) || "elegant-frost",
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
        resolveDigitalCardTheme((card.themeId as DigitalCardThemeId) || "elegant-frost"),
        socials.portraitFrame
      ),
      companyLogoUrl: socials.companyLogoUrl ?? null,
      design: compactCeleCardDesign(socials.design) ?? {},
      meeting: compactMeetingDesk(socials.meeting) ?? defaultMeetingDesk(),
      linkKinds: {
        whatsapp: chatKindsForBrand(socials, "whatsapp"),
        telegram: chatKindsForBrand(socials, "telegram"),
      },
    });
  }

  const active = useMemo(() => cards.find((c) => c.id === activeId) ?? null, [cards, activeId]);
  const publicUrl = form.slug ? digitalCardIdentityUrl(form.slug, origin) : "";
  const shareUrl =
    active?.publicToken && origin
      ? smartCardShortUrl(active.publicToken, origin)
      : publicUrl.startsWith("http")
        ? publicUrl
        : "";
  const nfcShareUrl =
    active?.nfcPublicToken && origin
      ? smartCardNfcUrl(active.nfcPublicToken, origin)
      : shareUrl;
  const qrSrc = shareUrl.startsWith("http") ? digitalCardQrImageSrc(shareUrl) : null;
  const previewTheme = applyCeleCardDesign(resolveDigitalCardTheme(form.themeId), form.design);
  const previewVoice = celecardTypeVoice(previewTheme);
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
          linkKinds: {
            whatsapp: compactAlignedChatKinds(form.socials.whatsapp, form.linkKinds.whatsapp, "whatsapp"),
            telegram: compactAlignedChatKinds(form.socials.telegram, form.linkKinds.telegram, "telegram"),
          },
          stackOrder: form.stackOrder,
          dockOrder: form.dockOrder,
          meeting: persistMeetingDesk(form.meeting),
        },
      }),
    [form]
  );
  const guestPreviewReach = useMemo(
    () => applyReachVisibilityPreview(reachPreview, form.reachVisibility),
    [reachPreview, form.reachVisibility]
  );

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
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
      linkKinds: {
        whatsapp: compactAlignedChatKinds(form.socials.whatsapp, form.linkKinds.whatsapp, "whatsapp"),
        telegram: compactAlignedChatKinds(form.socials.telegram, form.linkKinds.telegram, "telegram"),
      },
      ...(form.stackOrder.length ? { stackOrder: form.stackOrder } : {}),
      ...(form.dockOrder.length ? { dockOrder: form.dockOrder } : {}),
      portraitFrame: form.portraitFrame,
    };
    const design = compactCeleCardDesign(form.design);
    if (design) socials.design = design;
    else delete socials.design;
    const companyLogoUrl = persistCompanyLogoUrl(form.companyLogoUrl);
    if (companyLogoUrl) socials.companyLogoUrl = companyLogoUrl;
    else delete socials.companyLogoUrl;
    const meeting = persistMeetingDesk(form.meeting);
    if (meeting) socials.meeting = meeting;
    else delete socials.meeting;
    if (Object.keys(form.reachVisibility).length) {
      socials.reachVisibility = form.reachVisibility;
    } else {
      delete socials.reachVisibility;
    }

    const payload = {
      displayName: form.displayName.trim(),
      title: form.title.trim() || null,
      company: form.company.trim() || null,
      bio: form.bio.trim() || null,
      email: emails[0] || null,
      phone: phones[0] || null,
      website: websites[0] || null,
      socials,
      themeId: form.themeId,
      slug: form.slug.trim() || undefined,
      isPublished: form.isPublished,
      nfcEnabled: form.nfcEnabled,
      proximityDiscoverable: form.proximityDiscoverable,
      avatarUrl: form.avatarUrl,
    };

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
      setMessage(
        activeId
          ? "Card updated."
          : `Card saved. Design for ${DIGITAL_CARD_TRIAL_DAYS} days. Pay a plan to go live.`
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
        setMessage("This card now uses your current subscription. It has its own QR, link, and NFC.");
        await load();
        return;
      }
      if (json.data?.free) {
        setMessage("Plan activated. Your CeleYou is live.");
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
    setMessage(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <CeleYouBrandMark variant="chip" tone="light" className="mb-3" markClassName="h-8 w-8" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            One link for every contact
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Use the same design tools as every house template. Layout, atmosphere, ornament, and a
            background that blends into the plate. Then share via QR, NFC card, Nearby Share, or link.
            Recipients open your profile in any browser with no app and no account. Extra cards you
            create stay on the same subscription, each with its own QR, link, and NFC.
          </p>
        </div>
        <div className="action-row">
          <Button asChild>
            <Link href={tapStudioPath(activeId || undefined)}>
              <Smartphone className="mr-2 h-4 w-4" />
              {TAP_TO_CONNECT_CTA}
            </Link>
          </Button>
          <Button type="button" variant="outline" onClick={startNew}>
            <Plus className="mr-2 h-4 w-4" />
            New card
          </Button>
          <Button type="button" onClick={save} disabled={saving || form.displayName.trim().length < 2}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        Studio design is open for {DIGITAL_CARD_TRIAL_DAYS} days.{" "}
        <strong>Publish to share. Recipients do not need CeleYou or an account.</strong> A paid plan
        keeps every card on this account live until the term ends. You can add more cards on that
        same subscription. Renewal opens only after expiry.
        {active ? (
          <span className="ml-2 inline-flex flex-wrap items-center gap-2">
            Status:{" "}
            <Badge variant="secondary" className="align-middle">
              {active.subscriptionStatus}
              {active.isLive ? " · live" : active.guestShareable ? " · shareable" : " · offline"}
            </Badge>
          </span>
        ) : null}
      </div>

      {active?.subscriptionExpiresAt ? (
        <DigitalCardLiveTermRibbon
          themeName={previewTheme.name}
          planLabel={(active.subscriptionStatus || "").toUpperCase() === "TRIAL" ? "Trial" : "Live"}
          endsAt={active.subscriptionExpiresAt}
          status={active.subscriptionStatus}
          viewCount={active.viewCount}
          nfcEnabled={active.nfcEnabled}
          qrLive={Boolean(active.publicToken)}
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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-[#0B8A83]">{message}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start xl:gap-8">
          <div className="order-1 min-w-0 space-y-6">
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
              title="Identity"
              hint="Portrait, name, and the line that sits on the plate."
            >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Portrait</Label>
                <DigitalCardPortraitField
                  value={form.avatarUrl}
                  onChange={(url) => {
                    setForm((f) => ({ ...f, avatarUrl: url }));
                    setMessage(
                      url && url.startsWith("house:")
                        ? `${celeCardHouseAvatarMeta(celeCardHouseAvatarId(url)).kind === "avatar" ? "Avatar" : "House mark"} selected. Save the card to keep it.`
                        : "Portrait cropped. Save the card to keep it on the guest page."
                    );
                  }}
                  theme={resolveDigitalCardTheme(form.themeId)}
                  displayName={form.displayName}
                  onError={setError}
                  mode="api"
                  portraitFrame={form.portraitFrame}
                  onPortraitFrameChange={(portraitFrame) => setForm((f) => ({ ...f, portraitFrame }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="displayName">Full name</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Ama Mensah"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title / role</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Founder & Creative Director"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <div className="flex items-start gap-3">
                  <DigitalCardCompanyLogoField
                    value={form.companyLogoUrl}
                    onChange={(url) => {
                      setForm((f) => ({ ...f, companyLogoUrl: url }));
                      setMessage(url ? "Company logo cropped. Save the card to keep it beside the house name." : null);
                    }}
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
                      Upload a square PNG or JPEG. It sits beside the company name on the card.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bio">About</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="One short line about what you do."
                  rows={3}
                />
              </div>
            </div>
            </StudioPanel>
          </div>

          <div className="order-3 min-w-0 space-y-6 xl:order-2">
              <DigitalCardDesignDesk
                  themeId={form.themeId}
                  design={form.design}
                  onThemeChange={(themeId) => {
                    const next = resolveDigitalCardTheme(themeId);
                    setForm((f) => ({
                      ...f,
                      themeId,
                      portraitFrame: celecardPortraitFrame(next),
                      design: {
                        ...f.design,
                        composition: next.composition,
                        atmosphere: next.atmosphere ?? "none",
                        ornament: next.ornament ?? "foil",
                      },
                    }));
                  }}
                  onDesignChange={(design) => setForm((f) => ({ ...f, design }))}
                  onError={setError}
                />
            <StudioPanel
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
                  Paste a Google Maps, Amap, Apple Maps, or other map link. A street address works too. Guests tap
                  Location to see the place, then open it in maps.
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
              </div>
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-2">
                  <DigitalCardBrandMark id="meeting" className="h-7 w-7 rounded-[9px]" />
                  Meetings
                </Label>
                <p className="text-xs leading-5 text-muted-foreground">
                  Guests pick a date and time on your card. You get a message in this studio, plus a notification.
                </p>
                <DigitalCardMeetingDesk
                  value={form.meeting}
                  onChange={(meeting) => setForm((f) => ({ ...f, meeting }))}
                  inputClassName={studioInputClass}
                />
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
              title="Reach"
              hint="Search or flip through a network, then add it. Missing apps become a page guests can open."
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
                      gridClassName="gap-4"
                      intro={
                        <p className="mb-3 text-xs text-slate-500">
                          Official wallet marks. Guests only see the wallets you fill, never blank ones. Number, cashtag, payment link, bank account, or a receive QR.
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
                    >
                      {(network) => (
                        <div className="space-y-2">
                          <Label className="inline-flex items-center gap-2">
                            <DigitalCardBrandMark id={network.key} className="h-10 w-10 rounded-[12px]" />
                            {network.label}
                          </Label>
                          <DigitalCardPayFields
                            brand={network.key}
                            values={form.socials[network.key]}
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
                          Number, username, share URL, group, or channel. Each one is tagged so guests can choose.
                        </p>
                      ) : group.id === "social" ? (
                        <p className="mb-3 text-xs text-slate-500">
                          Profiles, posts, and any page that is not in the list. Guests tap the name you give it.
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
                      <div className="space-y-2 pr-6">
                        <Label className="inline-flex items-center gap-2">
                          <DigitalCardBrandMark id={network.key} className="h-7 w-7 rounded-[9px]" />
                          {network.label}
                        </Label>
                        {network.key === "other" ? (
                          <DigitalCardOtherFields
                            values={form.socials[network.key]}
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
                            values={form.socials[network.key]}
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
            </div>
            </StudioPanel>

            <DigitalCardPrivacyDesk
              items={reachPreview}
              visibility={form.reachVisibility}
              onVisibilityChange={(reachVisibility) => setForm((f) => ({ ...f, reachVisibility }))}
              cardId={activeId}
            />

            <DigitalCardDesignVault cardId={activeId} />

            <DigitalCardConnectionInbox cardId={activeId} />

            <StudioPanel
              title="Guest page arrangement"
              hint="Reorder live taps. Empty fields never appear on the public page."
            >
              <DigitalCardReachOrderEditor
                items={reachPreview}
                onChange={({ stackOrder, dockOrder }) => setForm((f) => ({ ...f, stackOrder, dockOrder }))}
              />
              <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                />
                Published
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.nfcEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, nfcEnabled: e.target.checked }))}
                />
                <Nfc className="h-4 w-4 text-slate-500" />
                NFC ready
              </label>
              {activeId ? (
                <Link href={nfcStudioPath(activeId)} className="text-xs font-semibold text-[#0B8A83]">
                  Manage NFC cards
                </Link>
              ) : null}
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.proximityDiscoverable}
                  onChange={(e) => setForm((f) => ({ ...f, proximityDiscoverable: e.target.checked }))}
                />
                <Smartphone className="h-4 w-4 text-slate-500" />
                Tap-to-Connect
              </label>
            </div>
            </StudioPanel>
          </div>

          <aside className="order-2 min-w-0 space-y-4 xl:order-3 xl:sticky xl:top-6 xl:col-start-2 xl:row-span-full xl:self-start">
            <div
              className="rounded-2xl p-4"
              style={{
                background: DIGITAL_CARD_THEMES.find((t) => t.id === form.themeId)?.stageBackground,
              }}
            >
              <p
                className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: previewTheme.accent, fontFamily: previewVoice.origin }}
              >
                Live preview
              </p>
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
                companyLogoUrl={form.companyLogoUrl}
                design={form.design}
              />
              {guestPreviewReach.length ? (
                <div className="mt-4">
                  <DigitalCardReachGrid
                    items={guestPreviewReach}
                    theme={DIGITAL_CARD_THEMES.find((t) => t.id === form.themeId) ?? DIGITAL_CARD_THEMES[0]}
                    compact
                    slug={form.slug || undefined}
                    ownerName={form.displayName}
                  />
                </div>
              ) : null}
            </div>

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
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-900">Activation</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setPlanId(plan.id)}
                      className={`rounded-lg border px-2 py-1.5 text-left text-[11px] ${
                        planId === plan.id
                          ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      <span className="font-semibold">{plan.label}</span>
                      <span className="ml-1">₵{plan.priceGhs}</span>
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#0B8A83] hover:bg-[#097a74]"
                  onClick={subscribe}
                  disabled={!activeId || paying || active?.canRenew === false}
                >
                  {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  {active?.canRenew === false
                    ? "Paid through this term"
                    : `Activate ${plans.find((p) => p.id === planId)?.label} · ₵${plans.find((p) => p.id === planId)?.priceGhs}`}
                </Button>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {active?.canRenew === false
                    ? "Renewal opens after this term ends. New cards you save stay on this same subscription, each with a unique QR, link, and NFC."
                    : "Live activation uses Paystack. A paid term runs until expiry and cannot be cancelled. Extra cards share that term."}
                </p>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/business-card/billing">Manage billing</Link>
                </Button>
              </div>
              <DigitalCardAnalyticsPanel cardId={activeId} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
