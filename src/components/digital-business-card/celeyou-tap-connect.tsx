"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Link2, Nfc, QrCode, ScanLine, Share2, X } from "lucide-react";
import { getClientAppUrl } from "@/lib/app-url";
import { digitalCardIdentityUrl, digitalCardQrImageSrc } from "@/lib/digital-business-card/types";
import { saveDigitalCardContact } from "@/lib/digital-business-card/save-contact";
import { celeCardShareImageUrls, celeCardShareMessage, celeCardShareTitle } from "@/lib/digital-business-card/share";
import { shareCeleYouProfile } from "@/lib/celeyou-share/engine";
import { nfcStudioPath } from "@/lib/digital-business-card/nfc-device";
import { detectTapCapability, detectTapPlatform } from "@/lib/celeyou-proximity/capabilities";
import { parseTapJoinScan } from "@/lib/celeyou-proximity/join-code";
import {
  CeleYouProximityEngine,
  nearbySignalHint,
  rssiIsPhysicalTouchProof,
  type NearbyPeer,
  type NativeDiscoverReason,
} from "@/lib/celeyou-proximity/native-engine";
import {
  TAP_DISCOVERY_TIMEOUT_MS,
  TAP_POLL_MS,
  TAP_MODE_HEADING,
  TAP_MODE_SUPPORT,
  TAP_TO_CONNECT_CTA,
  TAP_TO_CONNECT_NATIVE_REQUIREMENT,
  TAP_TO_OPEN_NAME,
} from "@/lib/celeyou-proximity/product";
import {
  SCAN_TO_CONNECT_CTA,
  SHARE_LINK_CTA,
  TAP_TO_SHARE_CTA,
  UNIVERSAL_CONNECT_KICKER,
  UNIVERSAL_CONNECT_SUPPORT,
  copyTapSession,
  shareTapSession,
  tapSessionJoinUrl,
  tapSessionSecretFromView,
  universalConnectActionOrder,
  universalConnectHint,
  type UniversalConnectActionId,
} from "@/lib/celeyou-proximity/universal-connect";
import { SHARE_MY_CARD_CTA } from "@/lib/celeyou-share/engine";
import { screenForProximityStatus, type ProximityStatus } from "@/lib/celeyou-proximity/state-machine";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import { CeleCardQrBadge } from "@/components/digital-business-card/celecard-qr-badge";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { usePersistLivePlateSnapshot } from "@/lib/digital-business-card/capture-live-plate";
import { useCelecardSilentHold } from "@/components/digital-business-card/use-celecard-silent-hold";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import type { DigitalCardSocials } from "@/lib/digital-business-card/socials";
import { QrCameraScanner } from "@/components/qr/qr-camera-scanner";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";

type CardOption = {
  id: string;
  slug: string;
  displayName: string;
  title: string | null;
  company: string | null;
  avatarUrl: string | null;
  themeId?: string;
  isLive?: boolean;
  proximityDiscoverable?: boolean;
  socials?: DigitalCardSocials | null;
};

type SessionView = {
  id: string;
  role: "host" | "peer";
  status: ProximityStatus;
  joinCode: string | null;
  pairingToken: string | null;
  discoveryId: string;
  verifyCode: string | null;
  expiresAt: string;
  peer: { displayName: string; title: string | null; company: string | null; avatarUrl: string | null } | null;
  self: { displayName: string; title: string | null; company: string | null; avatarUrl: string | null };
  share: {
    token: string;
    profilePath: string;
    vcardPath: string;
    preview: { displayName: string; title: string | null; company: string | null; avatarUrl: string | null };
  } | null;
  phoneToPhoneClaim: string;
  guestReceipt: { name: string; at: string } | null;
};

export function CeleYouTapConnect({
  initialCardId,
  initialCode,
}: {
  initialCardId?: string;
  initialCode?: string;
}) {
  const router = useRouter();
  const capability = useMemo(() => detectTapCapability(), []);
  const [cards, setCards] = useState<CardOption[]>([]);
  const [cardId, setCardId] = useState(initialCardId || "");
  const [session, setSession] = useState<SessionView | null>(null);
  const [codeInput, setCodeInput] = useState(initialCode?.toUpperCase() || "");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [showProfileQr, setShowProfileQr] = useState(false);
  const [copied, setCopied] = useState<"profile" | "session" | false>(false);
  const [sharePulse, setSharePulse] = useState<"shared" | "copied" | null>(null);
  const [nearby, setNearby] = useState<NearbyPeer[]>([]);
  const [discoverReason, setDiscoverReason] = useState<NativeDiscoverReason | null>(null);
  const [booting, setBooting] = useState(true);
  const [online, setOnline] = useState(true);
  const autoJoined = useRef(false);
  const redeeming = useRef(false);
  const silentHost = useRef(false);
  const engineRef = useRef<CeleYouProximityEngine | null>(null);

  const card = cards.find((row) => row.id === cardId) ?? cards[0] ?? null;
  usePersistLivePlateSnapshot(card?.id, [card?.themeId, card?.avatarUrl, card?.displayName].join("|"));
  const { hold, holdAxis, holdReady, setHoldIntent, onPlateActivate } = useCelecardSilentHold();
  const plateThemeId = card?.themeId || "teal-pulse";

  const loadCards = useCallback(async () => {
    try {
      const res = await fetch("/api/digital-business-cards");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not load your CeleYou.");
        return;
      }
      const list = (json.data || []) as CardOption[];
      setCards(list);
      setCardId((current) => current || initialCardId || list[0]?.id || "");
    } catch {
      setError("Could not load your CeleYou.");
    } finally {
      setBooting(false);
    }
  }, [initialCardId]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  useEffect(() => {
    const sync = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!card || !initialCode || session || autoJoined.current) return;
    autoJoined.current = true;
    void joinWithCode(initialCode);
  }, [card, initialCode, session]);

  const refreshSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/digital-business-cards/proximity/sessions/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setSession(json.data as SessionView);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!session?.id) return;
    if (session.status === "COMPLETED" || session.status === "DECLINED" || session.status === "CANCELLED" || session.status === "EXPIRED") {
      return;
    }
    const timer = window.setInterval(() => void refreshSession(session.id), TAP_POLL_MS);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.status, refreshSession]);

  useEffect(() => {
    if (!session || session.status !== "DISCOVERING") {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), TAP_DISCOVERY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (!session || session.status !== "DISCOVERING" || !session.discoveryId || !session.joinCode) {
      void engineRef.current?.stopDiscovering();
      engineRef.current = null;
      setNearby([]);
      setDiscoverReason(null);
      return;
    }
    const engine = new CeleYouProximityEngine();
    engineRef.current = engine;
    let cancelled = false;
    void engine
      .startDiscovering({
        v: 1,
        type: "hello",
        discoveryId: session.discoveryId,
        joinCode: session.joinCode,
      })
      .then((result) => {
        if (cancelled) return;
        setDiscoverReason(result.reason);
        setNearby(engine.listPeers());
      });
    const timer = window.setInterval(() => {
      if (!cancelled) setNearby(engine.listPeers());
    }, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      void engine.stopDiscovering();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [session?.id, session?.status, session?.discoveryId, session?.joinCode]);

  useEffect(() => {
    const token = session?.share?.token;
    if (!session || session.status !== "APPROVED" || !token || redeeming.current) return;
    redeeming.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/digital-business-cards/proximity/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof json.error === "string" ? json.error : "CeleYou could not verify this share.");
          return;
        }
        setSession((current) =>
          current
            ? {
                ...current,
                status: "COMPLETED",
                share: {
                  token: "",
                  profilePath: json.data?.profilePath || current.share?.profilePath || "",
                  vcardPath: json.data?.vcardPath || current.share?.vcardPath || "",
                  preview: json.data?.preview || current.share?.preview || current.self,
                },
              }
            : current
        );
      } catch {
        if (!cancelled) setError("CeleYou could not verify this share.");
      } finally {
        redeeming.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.status, session?.share?.token]);

  const startHost = useCallback(async (): Promise<SessionView | null> => {
    if (!card) return null;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/digital-business-cards/proximity/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, transport: "qr" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not open Tap Mode.");
        return null;
      }
      setTimedOut(false);
      const next = json.data as SessionView;
      setSession(next);
      return next;
    } catch {
      setError("Could not open Tap Mode.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [card]);

  useEffect(() => {
    if (!hold) {
      silentHost.current = false;
      return;
    }
    if (scanning) return;
    if (!card || session || busy || initialCode || silentHost.current) return;
    if (card.proximityDiscoverable === false) return;
    silentHost.current = true;
    void startHost();
  }, [hold, scanning, card, session, busy, initialCode, startHost]);

  useEffect(() => {
    if (scanning) setHoldIntent("closed");
  }, [scanning, setHoldIntent]);

  async function joinWithCode(code: string, transport: "code" | "ble" = "code") {
    if (!card) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/digital-business-cards/proximity/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, joinCode: code, transport }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not join.");
        return;
      }
      setScanning(false);
      setSession(json.data as SessionView);
    } catch {
      setError("Could not join.");
    } finally {
      setBusy(false);
    }
  }

  const origin = getClientAppUrl();
  const profileUrl = card?.slug ? digitalCardIdentityUrl(card.slug, origin) : "";
  const profileQrSrc = profileUrl ? digitalCardQrImageSrc(profileUrl, { size: 720, format: "png" }) : "";

  async function copyProfileLink() {
    if (!profileUrl) return;
    await navigator.clipboard.writeText(profileUrl);
    setCopied("profile");
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareProfile() {
    if (!profileUrl || !card) return;
    await shareCeleYouProfile({
      title: celeCardShareTitle({ displayName: card.displayName, title: card.title }),
      text: celeCardShareMessage({ displayName: card.displayName }, profileUrl),
      url: profileUrl,
      imageUrl: card.slug ? celeCardShareImageUrls(card.slug, card.id) : null,
      persistPlateCardId: card.id || null,
    });
  }

  async function act(action: "request" | "approve" | "decline" | "cancel") {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-business-cards/proximity/sessions/${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "That action did not complete.");
        return;
      }
      setSession(json.data as SessionView);
    } catch {
      setError("That action did not complete.");
    } finally {
      setBusy(false);
    }
  }

  const joinSecret = tapSessionSecretFromView(session);
  const joinUrl = joinSecret ? tapSessionJoinUrl(origin, joinSecret) : "";
  const qrSrc = joinUrl ? digitalCardQrImageSrc(joinUrl, { size: 720, format: "png" }) : "";
  const platform = detectTapPlatform();
  const connectActions = universalConnectActionOrder(platform);
  const displayName = card?.displayName || "CeleYou";
  const sessionLocked = busy || !card || card.proximityDiscoverable === false;

  function markShare(result: "shared" | "copied" | "cancelled" | "unavailable") {
    if (result === "cancelled" || result === "unavailable") return;
    setSharePulse(result);
    if (result === "copied") setCopied("session");
    window.setTimeout(() => {
      setSharePulse(null);
      setCopied(false);
    }, 1800);
  }

  async function ensureSession() {
    if (session && tapSessionSecretFromView(session)) return session;
    return startHost();
  }

  async function tapToShare() {
    const current = await ensureSession();
    const secret = tapSessionSecretFromView(current);
    if (!secret) return;
    const url = tapSessionJoinUrl(origin, secret);
    const result = await shareTapSession({ url, displayName });
    markShare(result);
  }

  async function shareSessionLink() {
    const current = await ensureSession();
    const secret = tapSessionSecretFromView(current);
    if (!secret) return;
    const url = tapSessionJoinUrl(origin, secret);
    const result = await copyTapSession(url);
    if (result === "copied") {
      markShare("copied");
      return;
    }
    markShare(await shareTapSession({ url, displayName }));
  }
  const screen = session ? screenForProximityStatus(session.status, session.role) : "ready";

  const plateQrSrc = qrSrc || profileQrSrc;

  return (
    <div
      className="celecard-stage min-h-app-viewport overflow-x-hidden overflow-y-auto bg-[#062e2c] text-[#F4FFFD]"
      data-celecard-hold={holdReady ? (hold ? "true" : "false") : undefined}
      data-celecard-hold-axis={hold ? holdAxis : undefined}
    >
      <div className="celecard-tap-shell relative mx-auto">
      <div className="celecard-atmo pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_20%,rgba(11,138,131,0.45),transparent_52%)]" />
      <header className="celecard-tap-chrome relative z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (session ? void act("cancel") : router.push("/dashboard/business-card"))}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5"
          aria-label={session ? "Cancel Tap Mode" : "Back to studio"}
        >
          {session ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </button>
        <CeleYouBrandMark variant="chip" tone="dark" markClassName="h-7 w-7" />
        <span className="w-10" />
      </header>

      <div className="celecard-tap-heading celecard-tap-chrome relative z-10 mt-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7FF0E4]">{TAP_TO_CONNECT_CTA}</p>
        <h1 className="celeyou-page-title mt-2 font-display font-semibold tracking-tight">{TAP_MODE_HEADING}</h1>
        <p className="celecard-tap-lead mt-2 text-white/70">{TAP_MODE_SUPPORT}</p>
      </div>

      {card ? (
        <div
          className="celecard-hold-frame celecard-enter relative z-10 mx-auto mt-8"
          role="button"
          tabIndex={0}
          aria-pressed={hold}
          aria-label="Hold this card up. Rotate the phone and the plate fills the screen."
          onClick={onPlateActivate}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onPlateActivate(event);
          }}
        >
          <div className="celecard-plate-motion">
            <DigitalCardFace
              themeId={plateThemeId}
              displayName={card.displayName}
              title={card.title}
              company={card.company}
              avatarUrl={card.avatarUrl}
              qrSrc={plateQrSrc}
              portraitFrame={card.socials?.portraitFrame}
              companyLogo
              companyLogoUrl={card.socials?.companyLogoUrl}
              design={card.socials?.design}
            />
          </div>
        </div>
      ) : null}

      <div className="celecard-tap-body celecard-tap-chrome">
      <p className="relative z-10 mt-5 text-center text-sm leading-relaxed text-white/80">
        {!online ? "Offline" : booting ? "Initializing" : statusCopy(screen, session)}
      </p>
      {card?.slug ? (
        <p className="relative z-10 mt-1 text-center text-xs uppercase tracking-[0.16em] text-white/45">@{card.slug}</p>
      ) : null}
      <p className="relative z-10 mt-2 text-center text-[11px] leading-relaxed text-white/50">{capability.guidance}</p>

      {!session ? (
        <div className="relative z-10 mt-6 space-y-4">
          {cards.length > 1 ? (
            <label className="block text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
              Share this CeleYou
              <select
                className="mt-2 h-11 w-full rounded-2xl border border-white/15 bg-white/5 px-3 text-sm text-white"
                value={card?.id || ""}
                onChange={(event) => setCardId(event.target.value)}
              >
                {cards.map((row) => (
                  <option key={row.id} value={row.id} className="text-slate-900">
                    {row.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7FF0E4]">
            {UNIVERSAL_CONNECT_KICKER}
          </p>
          <p className="text-center text-[11px] leading-relaxed text-white/55">{UNIVERSAL_CONNECT_SUPPORT}</p>
          <div className="celecard-universal-actions">
            {connectActions.map((action, index) => (
              <UniversalConnectButton
                key={action}
                action={action}
                primary={index === 0}
                disabled={sessionLocked}
                sharePulse={sharePulse}
                copied={copied === "session"}
                onTapShare={() => void tapToShare()}
                onScan={() => void startHost()}
                onShareLink={() => void shareSessionLink()}
              />
            ))}
          </div>
          <p className="text-center text-[11px] leading-relaxed text-white/45">
            {universalConnectHint(connectActions[0], platform)}
          </p>
          {card?.proximityDiscoverable === false ? (
            <p className="text-center text-xs text-amber-200">
              Tap-to-Connect is turned off on this CeleYou. Turn it on from Share on the studio.
            </p>
          ) : null}
          <div className="cta-phrase-grid gap-2">
            <button
              type="button"
              onClick={() => setShowProfileQr((open) => !open)}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/15 text-sm"
            >
              <QrCode className="h-4 w-4" />
              Share QR
            </button>
            <button
              type="button"
              disabled={!profileUrl}
              onClick={() => void copyProfileLink()}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/15 text-sm"
            >
              <Copy className="h-4 w-4 shrink-0" />
              {copied === "profile" ? "Copied" : "Copy Link"}
            </button>
            <button
              type="button"
              disabled={!profileUrl}
              onClick={() => void shareProfile()}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/15 text-sm"
            >
              <Share2 className="h-4 w-4 shrink-0" />
              {SHARE_MY_CARD_CTA}
            </button>
            <Link
              href={card ? nfcStudioPath(card.id) : "/dashboard/business-card/nfc"}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/15 text-sm"
            >
              <Nfc className="h-4 w-4" />
              NFC Card
            </Link>
          </div>
          {showProfileQr && profileQrSrc ? (
            <div className="celecard-tap-qr mx-auto rounded-[1.5rem] bg-white p-3">
              <CeleCardQrBadge
                qrSrc={profileQrSrc}
                theme={resolveDigitalCardTheme("gold-folio")}
                avatarUrl={card?.avatarUrl}
                displayName={card?.displayName || "CeleYou"}
                sizeClass="h-40 w-40"
                padClass="p-0"
              />
            </div>
          ) : null}
          <p className="text-center text-[11px] leading-relaxed text-white/45">{TAP_TO_CONNECT_NATIVE_REQUIREMENT}</p>
          <p className="text-center text-[11px] text-white/40">
            {TAP_TO_OPEN_NAME}: a physical NFC card still opens the public profile with no app.
          </p>
          <div className="cta-phrase-grid gap-2">
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/15 text-sm"
            >
              <ScanLine className="h-4 w-4" />
              Exchange Contacts
            </button>
            <form
              className="flex h-11 overflow-hidden rounded-full border border-white/15"
              onSubmit={(event) => {
                event.preventDefault();
                if (codeInput) void joinWithCode(codeInput);
              }}
            >
              <input
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                placeholder="Code"
                aria-label="Join code"
                className="min-w-0 flex-1 bg-transparent px-3 text-sm uppercase tracking-[0.18em] outline-none"
              />
              <button type="submit" className="px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#7FF0E4]">
                Join
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {session && screen === "searching" ? (
        <div className="celecard-tap-session relative z-10 mt-6 space-y-4">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7FF0E4]">
            {SCAN_TO_CONNECT_CTA}
          </p>
          {qrSrc ? (
            <div className="celecard-tap-qr mx-auto rounded-[1.5rem] bg-white p-3">
              <CeleCardQrBadge
                qrSrc={qrSrc}
                theme={resolveDigitalCardTheme("gold-folio")}
                avatarUrl={card?.avatarUrl}
                displayName={card?.displayName || "CeleYou"}
                sizeClass="h-full w-full"
                padClass="p-0"
              />
            </div>
          ) : null}
          <p className="text-center font-mono text-3xl tracking-[0.35em] text-white">{session.joinCode}</p>
          {session.guestReceipt ? (
            <div className="celecard-tap-receipt mx-auto max-w-sm rounded-[1.4rem] border border-[#7FF0E4]/35 bg-white/5 px-4 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7FF0E4]">Connection Received</p>
              <p className="mt-1 text-lg font-semibold">{session.guestReceipt.name}</p>
              <p className="text-xs text-white/55">
                {new Date(session.guestReceipt.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          ) : (
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7FF0E4]">
              Waiting for Scan
            </p>
          )}
          <p className="text-center text-xs text-white/55">
            {discoverCopy(discoverReason)}
          </p>
          {nearby.length ? (
            <ul className="space-y-2" aria-label="Nearby CeleYou devices">
              {nearby.map((peer) => (
                <li key={peer.discoveryId}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void joinWithCode(peer.joinCode, "ble")}
                    className="flex h-12 w-full items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 text-left text-sm"
                  >
                    <span>CeleYou nearby · {peer.discoveryId.slice(-4)}</span>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-white/50">
                      {rssiIsPhysicalTouchProof(peer.rssi) ? "Touch" : nearbyLabel(peer)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-[11px] text-white/45">
              No CeleYou app nearby yet. Use the QR or code. This list stays empty in a browser.
            </p>
          )}
          {timedOut ? (
            <div className="space-y-2 text-center">
              <p className="text-sm text-amber-200">No nearby CeleYou joined yet. Scan the QR again or start a fresh session.</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void startHost()}
                className="h-11 w-full rounded-full bg-[#0B8A83] text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          ) : null}
          <div className="celecard-tap-pair">
            <button
              type="button"
              disabled={busy}
              onClick={() => void startHost()}
              className="h-11 rounded-full border border-white/15 text-sm"
            >
              Refresh QR
            </button>
            <button type="button" onClick={() => setScanning(true)} className="h-11 rounded-full border border-white/15 text-sm">
              Scan instead
            </button>
          </div>
          <div className="celecard-universal-actions">
            <button
              type="button"
              disabled={!joinUrl || busy}
              onClick={() => void tapToShare()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0B8A83] text-sm font-semibold text-white disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              {sharePulse === "shared" ? "Shared" : TAP_TO_SHARE_CTA}
            </button>
            <button
              type="button"
              disabled={!joinUrl || busy}
              onClick={() => void shareSessionLink()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-semibold disabled:opacity-50"
            >
              <Copy className="h-4 w-4" aria-hidden />
              {copied === "session" ? "Link copied" : SHARE_LINK_CTA}
            </button>
          </div>
          <p className="text-center text-[11px] leading-relaxed text-white/45">{universalConnectHint("share-link", platform)}</p>
        </div>
      ) : null}

      {session && screen === "found" ? (
        <FoundPanel session={session} busy={busy} onConnect={() => void act("request")} onCancel={() => void act("cancel")} />
      ) : null}

      {session && screen === "request" ? (
        <div className="relative z-10 mt-6 space-y-3 text-center">
          <Portrait name={session.peer?.displayName || "Nearby"} src={session.peer?.avatarUrl} />
          <p className="text-base">
            {session.peer?.displayName || "Someone nearby"} wants to share their CeleYou profile.
          </p>
          {session.verifyCode ? (
            <p className="font-mono text-2xl tracking-[0.3em] text-[#7FF0E4]">{session.verifyCode}</p>
          ) : null}
          <p className="text-xs text-white/55">Confirm this code matches the other phone before you accept.</p>
          <div className="celecard-tap-pair">
            <button type="button" disabled={busy} onClick={() => void act("decline")} className="h-11 rounded-full border border-white/15">
              Decline
            </button>
            <button type="button" disabled={busy} onClick={() => void act("approve")} className="h-11 rounded-full bg-[#0B8A83]">
              Accept
            </button>
          </div>
        </div>
      ) : null}

      {session && screen === "verifying" ? (
        <div className="relative z-10 mt-6 space-y-3 text-center">
          <p className="text-base font-semibold">Confirming this share with CeleYou</p>
          <p className="text-sm text-white/65">
            Connected Successfully appears only after the one-time token is verified. Keep this screen open.
          </p>
        </div>
      ) : null}

      {session && screen === "success" && session.share ? (
        <SuccessPanel share={session.share} />
      ) : null}

      {session && screen === "ended" ? (
        <p className="relative z-10 mt-6 text-center text-sm text-white/70">
          {session.status === "DECLINED" ? "No profile was shared." : "This Tap session ended. Start again when both phones are ready."}
        </p>
      ) : null}

      {error ? <p className="relative z-10 mt-4 text-center text-sm text-amber-200">{error}</p> : null}

      <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
        <span className="inline-flex items-center gap-1">
          <QrCode className="h-3.5 w-3.5" />
          Session QR
        </span>
        <span>NFC card tap to open</span>
        <span>No phone to phone NFC</span>
      </div>
      </div>
      </div>
      {scanning ? (
        <div className="celecard-tap-scanner fixed inset-0 z-[60] flex flex-col bg-[#041c1a] px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7FF0E4]">Scan CeleYou QR</p>
            <button
              type="button"
              onClick={() => setScanning(false)}
              className="text-xs uppercase tracking-[0.14em] text-white/70"
            >
              Close camera
            </button>
          </div>
          <QrCameraScanner
            active
            screenScanMode
            showScreenScanToggle={false}
            viewfinderId="celeyou-tap-scan-viewfinder"
            onScan={(text) => {
              const code = parseTapJoinScan(text);
              if (code) void joinWithCode(code);
            }}
            onError={(message) => setError(message)}
          />
        </div>
      ) : null}
    </div>
  );
}

function statusCopy(screen: ReturnType<typeof screenForProximityStatus>, session: SessionView | null) {
  if (screen === "ready") return "Show the connection QR. Anyone can scan it with their camera. No app required.";
  if (screen === "searching") {
    if (session?.guestReceipt) return "Connection Received";
    return "Waiting for Scan";
  }
  if (screen === "found") return session?.role === "host" ? "Someone is nearby" : "Confirm the matching code, then wait for Connect.";
  if (screen === "request") return "Approve only if this is the person in front of you.";
  if (screen === "verifying") return "Awaiting Confirmation";
  if (screen === "success") return "Exchange Successful";
  if (session?.status === "EXPIRED") return "Session Expired";
  if (session?.status === "CANCELLED") return "Session Cancelled";
  if (session?.status === "FAILED" || session?.status === "DECLINED") return "Connection Failed";
  return "Session closed";
}

function discoverCopy(reason: NativeDiscoverReason | null) {
  if (reason === "bluetooth-off") {
    return "Turn on Bluetooth, then Retry. Or scan the session QR. This website cannot advertise Bluetooth.";
  }
  if (reason === "permission-denied") {
    return "Allow Bluetooth for CeleYou in Settings, keep Tap Mode open, then Retry. Or scan the session QR.";
  }
  return "Open Tap Mode on the other phone and scan this QR, or type the code. Nearby Bluetooth discovery needs the native CeleYou app.";
}

function nearbyLabel(peer: NearbyPeer) {
  const hint = nearbySignalHint(peer.rssi);
  if (hint === "closer") return "Closer signal";
  if (hint === "nearby") return "Nearby";
  return "Select";
}

function Portrait({ name, src }: { name: string; src?: string | null }) {
  return src ? (
    <img src={src} alt="" className="h-24 w-24 rounded-full object-cover ring-2 ring-[#7FF0E4]/70" />
  ) : (
    <div className="grid h-24 w-24 place-items-center rounded-full bg-white/10 text-2xl font-semibold ring-2 ring-[#7FF0E4]/40">
      {name.trim().charAt(0) || "C"}
    </div>
  );
}

function FoundPanel({
  session,
  busy,
  onConnect,
  onCancel,
}: {
  session: SessionView;
  busy: boolean;
  onConnect: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="relative z-10 mt-6 space-y-3 text-center">
      <Portrait name={session.peer?.displayName || "Nearby"} src={session.peer?.avatarUrl} />
      <p className="text-lg font-semibold">{session.peer?.displayName || "Someone is nearby"}</p>
      <p className="text-sm text-white/65">{[session.peer?.title, session.peer?.company].filter(Boolean).join(" · ")}</p>
      {session.verifyCode ? <p className="font-mono text-2xl tracking-[0.3em] text-[#7FF0E4]">{session.verifyCode}</p> : null}
      {session.role === "host" ? (
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className="h-11 flex-1 rounded-full border border-white/15">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={onConnect} className="h-11 flex-1 rounded-full bg-[#0B8A83]">
            Connect
          </button>
        </div>
      ) : (
        <p className="text-xs text-white/55">Waiting for the other person to tap Connect. Confirm the code matches.</p>
      )}
    </div>
  );
}

function SuccessPanel({
  share,
}: {
  share: NonNullable<SessionView["share"]>;
}) {
  const payload = {
    id: "",
    slug: share.profilePath.split("/").pop() || "",
    publicToken: "",
    displayName: share.preview.displayName,
    title: share.preview.title,
    company: share.preview.company,
    bio: null,
    email: null,
    phone: null,
    website: null,
    socials: {},
    themeId: "gold-folio",
    avatarUrl: share.preview.avatarUrl,
    pronouns: null,
    nfcEnabled: true,
    connectBackEnabled: true,
    defaultMode: "professional",
    isLive: true,
  } as DigitalCardPublicPayload;

  return (
    <div className="relative z-10 mt-6 space-y-3 text-center">
      <Portrait name={share.preview.displayName} src={share.preview.avatarUrl} />
      <p className="text-lg font-semibold">{share.preview.displayName}</p>
      <p className="text-sm text-white/65">{[share.preview.title, share.preview.company].filter(Boolean).join(" · ")}</p>
      <div className="flex flex-col gap-2">
        <Link href={share.profilePath} className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full bg-[#0B8A83] text-sm font-semibold">
          Open Profile
        </Link>
        <button
          type="button"
          onClick={() => void saveDigitalCardContact(payload, { source: "guest" })}
          className="h-11 whitespace-nowrap rounded-full border border-white/15 text-sm"
        >
          Save Contact
        </button>
        <Link href="/dashboard/business-card" className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap text-sm text-white/70">
          Done
        </Link>
      </div>
    </div>
  );
}

function UniversalConnectButton({
  action,
  primary,
  disabled,
  sharePulse,
  copied,
  onTapShare,
  onScan,
  onShareLink,
}: {
  action: UniversalConnectActionId;
  primary: boolean;
  disabled: boolean;
  sharePulse: "shared" | "copied" | null;
  copied: boolean;
  onTapShare: () => void;
  onScan: () => void;
  onShareLink: () => void;
}) {
  const className = primary
    ? "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0B8A83] text-sm font-semibold text-white disabled:opacity-50"
    : "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-semibold disabled:opacity-50";
  if (action === "tap-to-share") {
    return (
      <button type="button" disabled={disabled} onClick={onTapShare} className={className}>
        <Share2 className="h-4 w-4" aria-hidden />
        {sharePulse === "shared" ? "Shared" : sharePulse === "copied" ? "Link copied" : TAP_TO_SHARE_CTA}
      </button>
    );
  }
  if (action === "scan-to-connect") {
    return (
      <button type="button" disabled={disabled} onClick={onScan} className={className}>
        <QrCode className="h-4 w-4" aria-hidden />
        {SCAN_TO_CONNECT_CTA}
      </button>
    );
  }
  return (
    <button type="button" disabled={disabled} onClick={onShareLink} className={className}>
      <Link2 className="h-4 w-4" aria-hidden />
      {copied ? "Link copied" : SHARE_LINK_CTA}
    </button>
  );
}
