"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { guideFontStyles } from "@/lib/event-guide/theme";
import { relativeLuminance } from "@/lib/event-guide/theme";
import { EVENT_GUIDE_TABS, type EventGuidePayload, type EventGuideTabKey } from "@/lib/event-guide/types";
import {
  clearChunkRecoveryFlag,
  installChunkErrorRecovery,
  loadGuidePayload,
  refreshGuidePayload,
  registerGuideWorker,
} from "@/lib/event-guide/offline-client";
import { OfflineBanner, type GuideConnection } from "./offline-banner";
import { GuideProgramme } from "./guide-programme";
import { GuideMenuPanel } from "./guide-menu";
import { GuideSeating } from "./guide-seating";
import { GuideGiftCard } from "./guide-gift-card";

export type EventGuideGiftPlacement = {
  giftUrl: string;
  title: string;
  teaser: string;
  ctaLabel: string;
};

const TAB_LABELS: Record<EventGuideTabKey, string> = {
  programme: "Programme",
  seating: "Seating",
  menu: "Menu",
};

/**
 * The ink on a filled button, from the payload when it carries one.
 *
 * `resolveGuideTheme` decides this now and the publish gate measures the
 * decision, so the page paints what was measured rather than deciding again —
 * a guide that passed the gate and then rendered a different pair would lose
 * the whole point of the gate. Payloads published before the token existed
 * fall back to the rule the page used at the time.
 */
function actionInk(theme: EventGuidePayload["theme"]): string {
  if (theme.onActionColor) return theme.onActionColor;
  const luminance = relativeLuminance(theme.colors.accent);
  return luminance !== null && luminance > 0.55 ? "#1f1a12" : "#ffffff";
}

export function EventGuideExperience({
  publicToken,
  initialPayload,
  initialTab,
  gift = null,
}: {
  publicToken: string;
  initialPayload: EventGuidePayload;
  initialTab: EventGuideTabKey;
  /** Live gift CTA — resolved per request, never baked into the offline snapshot. */
  gift?: EventGuideGiftPlacement | null;
}) {
  const [payload, setPayload] = useState(initialPayload);
  const [tab, setTab] = useState<EventGuideTabKey>(initialTab);
  const [connection, setConnection] = useState<GuideConnection>("online");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const countedTabs = useRef(new Set<EventGuideTabKey>());

  const theme = payload.theme;
  const fonts = useMemo(() => guideFontStyles(theme.fonts), [theme.fonts]);
  const onAccent = useMemo(() => actionInk(theme), [theme]);

  const tabs = useMemo(
    () => EVENT_GUIDE_TABS.filter((key) => key !== "seating" || payload.seating.enabled),
    [payload.seating.enabled]
  );

  // A deep link to a tab the organizer turned off falls back to their default.
  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0] ?? "programme");
  }, [tabs, tab]);

  const sync = useCallback(
    async (mode: "initial" | "reconnect") => {
      const result = await refreshGuidePayload(publicToken);

      if (result.status === "revoked") {
        setRevoked(true);
        return;
      }
      if (result.payload) {
        setSyncedAt(result.syncedAt);
        if (result.status === "fresh") {
          setConnection("online");
          setPayload((current) =>
            result.payload!.version === current.version ? current : result.payload!
          );
        } else if (mode === "reconnect" || result.payload.version !== payload.version) {
          setConnection("offline");
          setPayload(result.payload);
        } else {
          setConnection("offline");
        }
        return;
      }
      setConnection(mode === "initial" ? "online" : "offline");
    },
    [publicToken, payload.version]
  );

  // Register the worker only now — this component renders exclusively for a
  // published guide that loaded successfully online.
  useEffect(() => {
    clearChunkRecoveryFlag();
    const teardown = installChunkErrorRecovery(publicToken);

    if (payload.offlineEnabled) {
      void registerGuideWorker(publicToken, payload.version);
      void loadGuidePayload(publicToken).then((stored) => {
        if (stored) setSyncedAt(stored.syncedAt);
      });
      void sync("initial");
    }

    return teardown;
    // Intentionally runs once per token: re-registering on every payload change
    // would thrash the worker during a live republish.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicToken, payload.offlineEnabled]);

  useEffect(() => {
    const goOffline = () => setConnection("offline");
    const goOnline = () => void sync("reconnect");
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void sync("reconnect");
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    document.addEventListener("visibilitychange", onVisible);
    if (typeof navigator !== "undefined" && !navigator.onLine) setConnection("offline");

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  // One aggregate count per tab per visit; nothing identifying is sent.
  useEffect(() => {
    if (countedTabs.current.has(tab)) return;
    countedTabs.current.add(tab);
    if (typeof navigator === "undefined" || !navigator.onLine) return;

    void fetch(`/api/public/event-guide/${encodeURIComponent(publicToken)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tab }),
      keepalive: true,
    }).catch(() => undefined);
  }, [tab, publicToken]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === tab) return;
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  }, [tab]);

  if (revoked) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#fbf8f3] px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-serif text-2xl text-[#2b2118]">This guide has been retired</h1>
          <p className="mt-3 text-sm text-[#5c5346]">
            The hosts have issued a new code. Please scan the sign displayed at the venue.
          </p>
        </div>
      </main>
    );
  }

  const header = payload.header;

  return (
    <main
      data-testid="event-guide"
      data-tab={tab}
      data-version={payload.version}
      className="min-h-dvh px-5 pb-16 pt-10"
      style={
        {
          "--guide-accent": theme.colors.accent,
          "--guide-on-accent": onAccent,
          "--guide-primary": theme.colors.primary,
          "--guide-secondary": theme.colors.secondary,
          // Small tracked labels use the derived readable shade; the raw
          // accent stays for rules and flourishes. Payloads published before
          // this token existed fall back to the accent itself.
          "--guide-label": theme.labelColor ?? theme.colors.secondary,
          "--guide-text": theme.colors.text,
          "--guide-paper": theme.paperWash,
          "--guide-hairline": theme.accentWash,
          background: theme.backgroundImageUrl
            ? `linear-gradient(${theme.paperWash}, ${theme.paperWash}), url(${theme.backgroundImageUrl}) center / cover no-repeat fixed`
            : theme.colors.background,
          color: theme.colors.text,
          fontFamily: fonts.body,
        } as React.CSSProperties
      }
    >
      <header className="mx-auto w-full max-w-xl text-center">
        <p
          className="text-[0.68rem] font-semibold uppercase tracking-[0.3em]"
          style={{ fontFamily: fonts.eyebrow, color: theme.labelColor ?? theme.colors.secondary }}
        >
          Event Guide
        </p>
        <h1
          className="mt-3 text-[1.9rem] leading-tight sm:text-[2.3rem]"
          style={{ fontFamily: fonts.heading, color: theme.colors.primary }}
        >
          {header.eventTitle}
        </h1>
        {header.celebrants ? (
          <p className="mt-2 text-lg" style={{ fontFamily: fonts.script }}>
            {header.celebrants}
          </p>
        ) : null}
        {header.dateLabel || header.venue ? (
          <p className="mt-3 text-[0.82rem] tracking-wide opacity-80">
            {[header.dateLabel, header.venue].filter(Boolean).join("  ·  ")}
          </p>
        ) : null}
        {header.welcome ? (
          <p className="mx-auto mt-5 max-w-md text-[0.92rem] leading-relaxed opacity-90">
            {header.welcome}
          </p>
        ) : null}
      </header>

      {gift?.giftUrl ? (
        <GuideGiftCard
          giftUrl={gift.giftUrl}
          title={gift.title}
          teaser={gift.teaser}
          ctaLabel={gift.ctaLabel}
          fonts={fonts}
          colors={theme.colors}
          accentWash={theme.accentWash}
          onAccent={onAccent}
        />
      ) : null}

      <nav
        aria-label="Event Guide sections"
        className="mx-auto mt-8 flex w-full max-w-xl gap-1 rounded-full p-1"
        style={{ background: theme.accentWash }}
      >
        {tabs.map((key) => {
          const active = key === tab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={active ? "page" : undefined}
              data-testid={`event-guide-tab-${key}`}
              className="flex-1 rounded-full px-3 py-2.5 text-[0.8rem] font-semibold tracking-wide transition-colors"
              style={{
                background: active ? theme.colors.accent : "transparent",
                color: active ? onAccent : theme.colors.text,
                fontFamily: fonts.eyebrow,
              }}
            >
              {TAB_LABELS[key]}
            </button>
          );
        })}
      </nav>

      <div className="mx-auto mt-6 w-full max-w-xl">
        <OfflineBanner
          connection={connection}
          syncedAt={syncedAt}
          onRefresh={() => window.location.reload()}
        />

        {tab === "programme" ? (
          <GuideProgramme items={payload.programme} attachments={payload.attachments} fonts={fonts} />
        ) : null}
        {tab === "menu" ? (
          <GuideMenuPanel menu={payload.menu} attachments={payload.attachments} fonts={fonts} />
        ) : null}
        {tab === "seating" ? (
          <GuideSeating
            publicToken={publicToken}
            config={payload.seating}
            offline={connection === "offline"}
            fonts={fonts}
          />
        ) : null}
      </div>
    </main>
  );
}
