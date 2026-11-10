"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, QrCode, ScanLine, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getClientAppUrl } from "@/lib/app-url";
import { digitalCardQrImageSrc } from "@/lib/digital-business-card/types";
import { saveDigitalCardContact } from "@/lib/digital-business-card/save-contact";
import { detectTapCapability } from "@/lib/celeyou-proximity/capabilities";
import { parseTapJoinScan } from "@/lib/celeyou-proximity/join-code";
import {
  TAP_DISCOVERY_TIMEOUT_MS,
  TAP_POLL_MS,
  TAP_TO_CONNECT_CTA,
  TAP_TO_CONNECT_TAGLINE,
  tapJoinPath,
} from "@/lib/celeyou-proximity/product";
import { screenForProximityStatus, type ProximityStatus } from "@/lib/celeyou-proximity/state-machine";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import { CeleCardQrBadge } from "@/components/digital-business-card/celecard-qr-badge";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
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
};

type SessionView = {
  id: string;
  role: "host" | "peer";
  status: ProximityStatus;
  joinCode: string | null;
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
  const autoJoined = useRef(false);

  const card = cards.find((row) => row.id === cardId) ?? cards[0] ?? null;

  const loadCards = useCallback(async () => {
    const res = await fetch("/api/digital-business-cards");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not load your CeleYou.");
      return;
    }
    const list = (json.data || []) as CardOption[];
    setCards(list);
    setCardId((current) => current || initialCardId || list[0]?.id || "");
  }, [initialCardId]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  useEffect(() => {
    if (!card || !initialCode || session || autoJoined.current) return;
    autoJoined.current = true;
    void joinWithCode(initialCode);
  }, [card, initialCode, session]);

  const refreshSession = useCallback(async (id: string) => {
    const res = await fetch(`/api/digital-business-cards/proximity/sessions/${id}`);
    const json = await res.json();
    if (!res.ok) return;
    setSession(json.data as SessionView);
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

  async function startHost() {
    if (!card) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/digital-business-cards/proximity/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, transport: "qr" }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not open Tap Mode.");
      return;
    }
    setTimedOut(false);
    setSession(json.data as SessionView);
  }

  async function joinWithCode(code: string) {
    if (!card) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/digital-business-cards/proximity/sessions/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id, joinCode: code }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not join.");
      return;
    }
    setScanning(false);
    setSession(json.data as SessionView);
  }

  async function act(action: "request" | "approve" | "decline" | "cancel") {
    if (!session) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/digital-business-cards/proximity/sessions/${session.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "That action did not complete.");
      return;
    }
    setSession(json.data as SessionView);
  }

  const origin = getClientAppUrl();
  const joinUrl = session?.joinCode ? `${origin}${tapJoinPath(session.joinCode)}` : "";
  const qrSrc = joinUrl ? digitalCardQrImageSrc(joinUrl, { size: 720, format: "png" }) : "";
  const screen = session ? screenForProximityStatus(session.status, session.role) : "ready";

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[#062e2c] px-5 pb-10 pt-6 text-[#F4FFFD]">
      <div className="relative mx-auto min-h-[100dvh] max-w-lg overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_20%,rgba(11,138,131,0.45),transparent_52%)]" />
      <header className="relative z-10 flex items-center justify-between">
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

      <div className="relative z-10 mt-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7FF0E4]">{TAP_TO_CONNECT_CTA}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{TAP_TO_CONNECT_TAGLINE}</h1>
      </div>

      <ProximityOrbs aligned={screen === "success" || screen === "found"} />

      <div className="relative z-10 mt-2 flex flex-col items-center">
        <Portrait name={session?.self.displayName || card?.displayName || "You"} src={session?.self.avatarUrl || card?.avatarUrl} />
        <p className="mt-3 text-lg font-semibold">{session?.self.displayName || card?.displayName || "Your CeleYou"}</p>
        <p className="text-sm text-white/65">{card?.slug ? `@${card.slug}` : "Choose a live CeleYou"}</p>
      </div>

      <p className="relative z-10 mt-5 text-center text-sm leading-relaxed text-white/80">{statusCopy(screen, session)}</p>
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
          <button
            type="button"
            disabled={busy || !card || card.proximityDiscoverable === false}
            onClick={() => void startHost()}
            className="h-12 w-full rounded-full bg-[#0B8A83] text-sm font-semibold text-white disabled:opacity-50"
          >
            Ready to Connect
          </button>
          {card?.proximityDiscoverable === false ? (
            <p className="text-center text-xs text-amber-200">
              Tap-to-Connect is turned off on this CeleYou. Turn it on from Share on the studio.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 text-sm"
            >
              <ScanLine className="h-4 w-4" />
              Scan
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
        <div className="relative z-10 mt-6 space-y-4">
          {qrSrc ? (
            <div className="mx-auto w-fit rounded-[1.5rem] bg-white p-3">
              <CeleCardQrBadge
                qrSrc={qrSrc}
                theme={resolveDigitalCardTheme("gold-folio")}
                avatarUrl={card?.avatarUrl}
                displayName={card?.displayName || "CeleYou"}
                sizeClass="h-48 w-48"
                padClass="p-0"
              />
            </div>
          ) : null}
          <p className="text-center font-mono text-3xl tracking-[0.35em] text-white">{session.joinCode}</p>
          <p className="text-center text-xs text-white/55">
            Open Tap Mode on the other phone and scan this QR, or type the code. Nearby Bluetooth discovery needs the native CeleYou app.
          </p>
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
          <div className="flex gap-2">
            <button type="button" onClick={() => setScanning(true)} className="h-11 flex-1 rounded-full border border-white/15 text-sm">
              Scan instead
            </button>
            <Link href="/dashboard/business-card" className="grid h-11 flex-1 place-items-center rounded-full border border-white/15 text-sm">
              Share QR
            </Link>
          </div>
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
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void act("decline")} className="h-11 flex-1 rounded-full border border-white/15">
              Decline
            </button>
            <button type="button" disabled={busy} onClick={() => void act("approve")} className="h-11 flex-1 rounded-full bg-[#0B8A83]">
              Accept
            </button>
          </div>
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

      {scanning ? (
        <div className="relative z-20 mt-6 overflow-hidden rounded-3xl border border-white/15 bg-black/40 p-3">
          <QrCameraScanner
            active
            screenScanMode
            onScan={(text) => {
              const code = parseTapJoinScan(text);
              if (code) void joinWithCode(code);
            }}
            onError={(message) => setError(message)}
          />
          <button type="button" onClick={() => setScanning(false)} className="mt-3 w-full text-center text-xs uppercase tracking-[0.14em] text-white/70">
            Close camera
          </button>
        </div>
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
  );
}

function statusCopy(screen: ReturnType<typeof screenForProximityStatus>, session: SessionView | null) {
  if (screen === "ready") return "Open Tap Mode on the other phone and bring your devices close together.";
  if (screen === "searching") return "Looking for nearby CeleYou devices…";
  if (screen === "found") return session?.role === "host" ? "Someone is nearby" : "Confirm the matching code, then wait for Connect.";
  if (screen === "request") return "Approve only if this is the person in front of you.";
  if (screen === "success") return "Connected Successfully";
  return "Session closed";
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

function ProximityOrbs({ aligned }: { aligned: boolean }) {
  return (
    <div className="relative mx-auto mt-8 h-24 w-40" aria-hidden>
      <span
        className={cn(
          "absolute top-6 h-12 w-12 rounded-full border border-[#7FF0E4]/50 bg-[#0B8A83]/40 motion-safe:transition-transform motion-safe:duration-700",
          aligned ? "left-1/2 -translate-x-[calc(100%+4px)]" : "left-4"
        )}
      />
      <span
        className={cn(
          "absolute top-6 h-12 w-12 rounded-full border border-white/30 bg-white/10 motion-safe:transition-transform motion-safe:duration-700",
          aligned ? "left-1/2 translate-x-1" : "right-4 left-auto"
        )}
      />
      {aligned ? <span className="absolute left-1/2 top-8 h-8 w-8 -translate-x-1/2 rounded-full bg-[#7FF0E4]/30 motion-safe:animate-pulse" /> : null}
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
        <Link href={share.profilePath} className="grid h-11 place-items-center rounded-full bg-[#0B8A83] text-sm font-semibold">
          Open Profile
        </Link>
        <button
          type="button"
          onClick={() => void saveDigitalCardContact(payload, { source: "guest" })}
          className="h-11 rounded-full border border-white/15 text-sm"
        >
          Save Contact
        </button>
        <Link href="/dashboard/business-card" className="grid h-11 place-items-center text-sm text-white/70">
          Done
        </Link>
      </div>
    </div>
  );
}
