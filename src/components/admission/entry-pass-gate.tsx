"use client";

import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Keyboard,
  Loader2,
  Minus,
  Plus,
  ShieldAlert,
  Users,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { playScanFeedback } from "@/components/qr/qr-camera-scanner";
import { cn } from "@/lib/utils";
import { formatAdmissionCode, normalizeAdmissionCode } from "@/lib/admission/pass-code";
import { classifyGateInput } from "@/lib/admission/gate-scan";
import type { AdmissionDecision } from "@/lib/admission/pass-decision";
import { QR_SCAN_SAME_CODE_MS } from "@/lib/qr/qr-constants";
import {
  describeHeldSeats,
  type SeatingContinuity,
} from "@/lib/admission/seating-continuity";
import {
  clearPackage,
  dequeue,
  enqueue,
  hashTokenInBrowser,
  listQueue,
  loadPackage,
  projectLocalState,
  savePackage,
  type QueuedAdmission,
} from "@/lib/admission/offline-store";
import type { OfflinePackage } from "@/services/admission/offline-admission.service";

interface PartyMember {
  id: string;
  name: string;
  plusOnes: number;
  admitted: boolean;
}

interface GateResult {
  decision: AdmissionDecision;
  passCode: string | null;
  displayName: string | null;
  partySize: number;
  admittedCount: number;
  party: PartyMember[];
  seating: { tableNumber: string; seatLabel: string | null } | null;
  seatingContinuity?: SeatingContinuity | null;
  offline: boolean;
}

interface EntryPassGateProps {
  eventId: string;
  eventTitle?: string;
  gate?: string;
  className?: string;
  /**
   * When true (default on the unified QR Admission page), this panel does not
   * mount its own camera, the parent scanner routes entry-pass QR payloads here.
   */
  hideCamera?: boolean;
  /** Parent registers a scan handler so one camera serves pass + legacy QR. */
  scanHandlerRef?: MutableRefObject<((text: string) => void) | null>;
  /**
   * When a typed/scanned 4/6-digit code is not a Guest Entry Pass code,
   * fall through to legacy guest `manualCode` check-in (same secure server path).
   */
  onUnresolvedCode?: (code: string) => void;
}

const TONE_STYLES: Record<AdmissionDecision["tone"], string> = {
  green: "border-emerald-300 bg-gradient-to-b from-emerald-50 to-white text-emerald-900",
  amber: "border-amber-300 bg-gradient-to-b from-amber-50 to-white text-amber-900",
  red: "border-rose-300 bg-gradient-to-b from-rose-50 to-white text-rose-900",
};

function ToneIcon({ tone }: { tone: AdmissionDecision["tone"] }) {
  if (tone === "green") return <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden />;
  if (tone === "amber") return <ShieldAlert className="h-7 w-7 text-amber-600" aria-hidden />;
  return <XCircle className="h-7 w-7 text-rose-600" aria-hidden />;
}

/**
 * Guest Entry Pass gate, party rosters, admission codes, offline queue.
 * Camera scanning lives on the parent QR Admission page (one scanner for all).
 */
export function EntryPassGate({
  eventId,
  eventTitle,
  gate,
  className,
  hideCamera = true,
  scanHandlerRef,
  onUnresolvedCode,
}: EntryPassGateProps) {
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GateResult | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [pendingScan, setPendingScan] = useState<{
    token?: string;
    legacyToken?: string;
    code?: string;
  } | null>(null);
  /** Operator's answer to "how many are arriving now?". */
  const [arrivingNow, setArrivingNow] = useState(1);

  const [online, setOnline] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [pkg, setPkg] = useState<OfflinePackage | null>(null);
  const [queue, setQueue] = useState<QueuedAdmission[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState("");

  const lastScanRef = useRef<{ text: string; at: number } | null>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const refreshQueue = useCallback(async () => {
    try {
      setQueue(await listQueue(eventId));
    } catch {
      /* storage unavailable, the gate still works online */
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadPackage(eventId);
        if (!cancelled) setPkg(stored);
      } catch {
        /* no package yet */
      }
      await refreshQueue();
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, refreshQueue]);

  const localState = useMemo(
    () => (pkg ? projectLocalState(pkg, queue) : null),
    [pkg, queue]
  );

  const packageAgeMinutes = useMemo(() => {
    if (!pkg) return null;
    return Math.round((Date.now() - new Date(pkg.issuedAt).getTime()) / 60_000);
  }, [pkg]);

  const usingOffline = offlineMode || !online;

  const downloadPackage = useCallback(async () => {
    setBusy(true);
    setSyncMessage("");
    try {
      const [pkgRes, deviceRes] = await Promise.all([
        fetch(`/api/admission/offline?eventId=${encodeURIComponent(eventId)}`),
        fetch("/api/admission/offline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register",
            eventId,
            deviceName:
              typeof navigator !== "undefined"
                ? navigator.userAgent.slice(0, 60)
                : "gate-device",
          }),
        }),
      ]);
      const pkgJson = await pkgRes.json();
      const deviceJson = await deviceRes.json();
      if (!pkgJson.success) throw new Error(pkgJson.error ?? "Could not download guest list");
      if (deviceJson.success) setDeviceId(deviceJson.data.deviceId);

      await savePackage(pkgJson.data);
      setPkg(pkgJson.data);
      setSyncMessage(`Offline list ready, ${pkgJson.data.passes.length} passes cached.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Offline download failed");
    } finally {
      setBusy(false);
    }
  }, [eventId]);

  const syncQueue = useCallback(async () => {
    const pending = await listQueue(eventId);
    if (!pending.length) {
      setSyncMessage("Nothing to sync.");
      return;
    }
    if (!deviceId) {
      setError("Register this device (download the offline list) before syncing.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admission/offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          eventId,
          deviceId,
          records: pending.map((r) => ({
            clientRecordId: r.clientRecordId,
            tokenHash: r.tokenHash,
            code: r.code,
            quantity: r.quantity,
            guestIds: r.guestIds,
            capturedAt: r.capturedAt,
            usedManualCode: r.usedManualCode,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Sync failed");

      // Only clear records the server actually accounted for; anything it could
      // not resolve stays queued so nothing is quietly dropped.
      const settled = json.data.outcomes
        .filter((o: { state: string }) => o.state !== "rejected")
        .map((o: { clientRecordId: string }) => o.clientRecordId);
      await dequeue(settled);
      await refreshQueue();

      setSyncMessage(
        `Synced ${json.data.applied} · ${json.data.conflicts} need review · ${json.data.duplicates} already recorded`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }, [deviceId, eventId, refreshQueue]);

  const admitOffline = useCallback(
    async (input: {
      token?: string;
      legacyToken?: string;
      code?: string;
      quantity?: number;
      guestIds?: string[];
      /** Look the pass up and show the party, but queue nothing yet. */
      preview?: boolean;
    }): Promise<GateResult | null> => {
      if (!pkg || !localState) {
        setError("No offline guest list on this device. Download it while you have signal.");
        return null;
      }

      const show = (result: GateResult) => {
        setResult(result);
        return result;
      };

      const tokenHash = input.token ? await hashTokenInBrowser(input.token) : null;
      const code = input.code ? normalizeAdmissionCode(input.code) : null;
      const hash =
        tokenHash ?? (code ? pkg.passes.find((p) => p.c === code)?.h ?? null : null);
      const pass = hash ? localState.get(hash) : null;

      if (!pass || !hash) {
        playScanFeedback(false);
        return show({
          decision: {
            outcome: "DENY",
            tone: "red",
            reason: "NOT_FOUND",
            message: "No pass in the offline list matches this. Try again online.",
            admitQuantity: 0,
            resultingAdmittedCount: 0,
            resultingStatus: "ACTIVE",
            requiresConfirmation: false,
            allowance: 0,
            remaining: 0,
            requiresQuantityConfirmation: false,
          },
          passCode: null,
          displayName: null,
          partySize: 0,
          admittedCount: 0,
          party: [],
          seating: null,
          offline: true,
        });
      }

      const remaining = Math.max(0, pass.p - pass.a);

      if (remaining === 0) {
        playScanFeedback(false);
        return show({
          decision: {
            outcome: "ALREADY_ADMITTED",
            tone: pkg.settings.duplicatePolicy === "BLOCK" ? "red" : "amber",
            reason: "ALREADY_ADMITTED",
            message: `${pass.n} is already inside (${pass.a} of ${pass.p}).`,
            admitQuantity: 0,
            resultingAdmittedCount: pass.a,
            resultingStatus: "ADMITTED",
            requiresConfirmation: false,
            allowance: pass.p,
            remaining: 0,
            requiresQuantityConfirmation: false,
          },
          passCode: pass.c,
          displayName: pass.n,
          partySize: pass.p,
          admittedCount: pass.a,
          party: pass.members,
          seating: pass.table ? { tableNumber: pass.table, seatLabel: pass.seat } : null,
          offline: true,
        });
      }

      // Offline runs the same "how many now?" rule as the online gate, so a
      // party of three cannot be silently admitted in full at a dark gate.
      const promptForQuantity =
        input.preview === true &&
        remaining > 1 &&
        input.quantity == null &&
        !(input.guestIds?.length);

      if (promptForQuantity) {
        return show({
          decision: {
            outcome: "PARTIAL_ADMIT",
            tone: "amber",
            reason: "OK_PARTIAL",
            message: `This invitation admits ${pass.p}. ${remaining} places are still open, how many are arriving now?`,
            admitQuantity: 0,
            resultingAdmittedCount: pass.a,
            resultingStatus: pass.a > 0 ? "PARTIALLY_ADMITTED" : "ACTIVE",
            requiresConfirmation: true,
            allowance: pass.p,
            remaining,
            requiresQuantityConfirmation: true,
          },
          passCode: pass.c,
          displayName: pass.n,
          partySize: pass.p,
          admittedCount: pass.a,
          party: pass.members,
          seating: pass.table ? { tableNumber: pass.table, seatLabel: pass.seat } : null,
          offline: true,
        });
      }

      const requested = Math.max(1, input.quantity ?? remaining);

      if (requested > remaining) {
        playScanFeedback(false);
        return show({
          decision: {
            outcome: "DENY",
            tone: "amber",
            reason: "ALLOWANCE_EXCEEDED",
            message: `Only ${remaining} of ${pass.p} places remain on this pass.`,
            admitQuantity: 0,
            resultingAdmittedCount: pass.a,
            resultingStatus: "PARTIALLY_ADMITTED",
            requiresConfirmation: false,
            allowance: pass.p,
            remaining,
            requiresQuantityConfirmation: false,
          },
          passCode: pass.c,
          displayName: pass.n,
          partySize: pass.p,
          admittedCount: pass.a,
          party: pass.members,
          seating: null,
          offline: true,
        });
      }

      const record: QueuedAdmission = {
        clientRecordId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        eventId,
        tokenHash: hash,
        code,
        quantity: requested,
        guestIds: input.guestIds,
        capturedAt: new Date().toISOString(),
        usedManualCode: Boolean(code && !input.token),
        displayName: pass.n,
      };
      await enqueue(record);
      await refreshQueue();

      const resulting = pass.a + requested;
      playScanFeedback(true);
      return show({
        decision: {
          outcome: resulting >= pass.p ? "ADMIT" : "PARTIAL_ADMIT",
          tone: "green",
          reason: resulting >= pass.p ? "OK" : "OK_PARTIAL",
          message:
            resulting >= pass.p
              ? `Admitted ${requested} of ${pass.p}. Queued for sync.`
              : `Admitted ${requested} of ${pass.p}. ${pass.p - resulting} still to arrive. Queued for sync.`,
          admitQuantity: requested,
          resultingAdmittedCount: resulting,
          resultingStatus: resulting >= pass.p ? "ADMITTED" : "PARTIALLY_ADMITTED",
          requiresConfirmation: false,
          allowance: pass.p,
          remaining: Math.max(0, pass.p - resulting),
          requiresQuantityConfirmation: false,
        },
        passCode: pass.c,
        displayName: pass.n,
        partySize: pass.p,
        admittedCount: resulting,
        party: pass.members,
        seating: pass.table ? { tableNumber: pass.table, seatLabel: pass.seat } : null,
        offline: true,
      });
    },
    [eventId, localState, pkg, refreshQueue]
  );

  const admitOnline = useCallback(
    async (input: {
      token?: string;
      legacyToken?: string;
      code?: string;
      quantity?: number;
      guestIds?: string[];
      dryRun?: boolean;
      quantityConfirmed?: boolean;
    }): Promise<GateResult | null> => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/admission/admit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, gate, ...input }),
        });
        const json = await res.json();
        if (!json.data) {
          setError(json.error ?? "Admission failed");
          playScanFeedback(false);
          return null;
        }

        const data = json.data;
        // A pending quantity prompt is not a failure, stay quiet until the
        // operator answers rather than buzzing the gate twice per party.
        if (!data.decision.requiresQuantityConfirmation) {
          playScanFeedback(data.decision.tone === "green");
        }
        const next: GateResult = {
          decision: data.decision,
          passCode: data.pass?.code ?? null,
          displayName: data.pass?.displayName ?? null,
          partySize: data.pass?.partySize ?? 0,
          admittedCount: data.pass?.admittedCount ?? 0,
          party: data.party ?? [],
          seating: data.seating ?? null,
          seatingContinuity: data.seatingContinuity ?? null,
          offline: false,
        };
        setResult(next);
        return next;
      } catch {
        setError("Network problem. Switch on offline mode to keep admitting.");
        playScanFeedback(false);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [eventId, gate]
  );

  /**
   * One entry point for both the camera and the keypad.
   *
   * A single-guest pass admits on the spot, there is nothing to ask. Anything
   * larger is previewed first so the operator must say how many of the party
   * have actually turned up.
   */
  const beginAdmission = useCallback(
    async (source: { token?: string; legacyToken?: string; code?: string }) => {
      setArrivingNow(1);

      if (usingOffline) {
        if (source.legacyToken && onUnresolvedCode) {
          onUnresolvedCode(source.legacyToken);
          return;
        }
        const preview = await admitOffline({ ...source, preview: true });
        if (
          preview?.decision.reason === "NOT_FOUND" &&
          (source.code || source.legacyToken) &&
          onUnresolvedCode
        ) {
          setResult(null);
          setError("");
          onUnresolvedCode(source.code ?? source.legacyToken!);
          return;
        }
        if (preview?.decision.requiresQuantityConfirmation) {
          setPendingScan(source);
          setArrivingNow(Math.min(1, preview.decision.remaining) || 1);
        } else {
          setPendingScan(null);
        }
        return;
      }

      const preview = await admitOnline({ ...source, dryRun: true });
      if (!preview) return;

      if (
        preview.decision.reason === "NOT_FOUND" &&
        (source.code || source.legacyToken) &&
        onUnresolvedCode
      ) {
        setResult(null);
        setError("");
        onUnresolvedCode(source.code ?? source.legacyToken!);
        return;
      }

      if (preview.decision.requiresQuantityConfirmation) {
        setPendingScan(source);
        setArrivingNow(1);
        return;
      }

      // Single guest, or a remainder of one: no question worth asking.
      if (
        preview.decision.admitQuantity > 0 &&
        !preview.decision.requiresConfirmation &&
        preview.decision.remaining <= 1
      ) {
        await admitOnline({ ...source, quantityConfirmed: true });
        setPendingScan(null);
        return;
      }

      setPendingScan(source);
    },
    [admitOffline, admitOnline, onUnresolvedCode, usingOffline]
  );

  const handleScan = useCallback(
    async (text: string) => {
      if (busy) return;
      const now = Date.now();
      // Align with camera same-code window so the unified scanner does not double-fire.
      if (lastScanRef.current?.text === text && now - lastScanRef.current.at < QR_SCAN_SAME_CODE_MS) return;
      lastScanRef.current = { text, at: now };

      const classified = classifyGateInput(text);
      if (classified.kind === "pass_token") {
        setSelectedMembers([]);
        setError("");
        await beginAdmission({ token: classified.token });
        return;
      }
      if (classified.kind === "admission_code") {
        setSelectedMembers([]);
        setError("");
        await beginAdmission({ code: classified.code });
        return;
      }

      if (classified.raw) {
        setSelectedMembers([]);
        setError("");
        await beginAdmission({ legacyToken: classified.raw });
        return;
      }

      setError("That QR isn't a Celeventic entry pass.");
      playScanFeedback(false);
    },
    [beginAdmission, busy]
  );

  useEffect(() => {
    if (!scanHandlerRef) return;
    scanHandlerRef.current = (text: string) => {
      void handleScan(text);
    };
    return () => {
      scanHandlerRef.current = null;
    };
  }, [scanHandlerRef, handleScan]);

  const submitManualCode = useCallback(async () => {
    const code = normalizeAdmissionCode(manualCode);
    if (code.length !== 4 && code.length !== 6) {
      setError("Admission codes are 4 or 6 digits.");
      return;
    }
    setSelectedMembers([]);
    setError("");
    await beginAdmission({ code });
    setManualCode("");
  }, [beginAdmission, manualCode]);

  const confirmAdmission = useCallback(
    async (quantity?: number) => {
      if (!pendingScan) return;
      const guestIds = selectedMembers.length ? selectedMembers : undefined;
      if (usingOffline) {
        await admitOffline({ ...pendingScan, quantity, guestIds });
      } else {
        await admitOnline({ ...pendingScan, quantity, guestIds, quantityConfirmed: true });
      }
      setPendingScan(null);
      setSelectedMembers([]);
      setArrivingNow(1);
    },
    [admitOffline, admitOnline, pendingScan, selectedMembers, usingOffline]
  );

  const remaining = result ? Math.max(0, result.partySize - result.admittedCount) : 0;
  const awaitingQuantity =
    Boolean(pendingScan) && Boolean(result?.decision.requiresQuantityConfirmation);
  const awaitingConfirm =
    Boolean(pendingScan) && result !== null && result.decision.admitQuantity > 0;

  // Ticking named members off overrides the counter: their plus-ones are part
  // of the head count, so the two must never be added together.
  const selectedHeads = useMemo(
    () =>
      result?.party
        .filter((m) => selectedMembers.includes(m.id))
        .reduce((sum, m) => sum + 1 + Math.max(0, m.plusOnes), 0) ?? 0,
    [result, selectedMembers]
  );
  const namedUnadmitted = result?.party.filter((m) => !m.admitted).length ?? 0;
  /** Heads with no name on the guest list, admitted purely as a quantity. */
  const unnamedCompanions = Math.max(0, remaining - namedUnadmitted);

  return (
    <Card className={cn("border-slate-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" aria-hidden />
            Guest Entry Pass gate
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={online ? "outline" : "destructive"} className="gap-1">
              {online ? <Wifi className="h-3 w-3" aria-hidden /> : <WifiOff className="h-3 w-3" aria-hidden />}
              {online ? "Online" : "Offline"}
            </Badge>
            {queue.length > 0 && (
              <Badge variant="secondary">{queue.length} queued</Badge>
            )}
          </div>
        </div>
        {eventTitle && <p className="text-xs text-slate-500">{eventTitle}</p>}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <p className="text-xs font-medium text-slate-700">
            Multi-person passes always confirm the arriving headcount.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={offlineMode}
              onCheckedChange={setOfflineMode}
              aria-label="Force offline mode"
              disabled={!pkg}
            />
            <span className="font-medium text-slate-700">Offline mode</span>
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={downloadPackage} disabled={busy}>
              <CloudDownload className="mr-1 h-3.5 w-3.5" aria-hidden />
              {pkg ? "Refresh list" : "Download list"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={syncQueue}
              disabled={busy || !queue.length}
            >
              <CloudUpload className="mr-1 h-3.5 w-3.5" aria-hidden />
              Sync {queue.length > 0 ? `(${queue.length})` : ""}
            </Button>
            {pkg && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await clearPackage(eventId);
                  setPkg(null);
                  setOfflineMode(false);
                }}
                disabled={busy || queue.length > 0}
                title={queue.length > 0 ? "Sync queued admissions first" : undefined}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {pkg && (
          <p className="text-xs text-slate-500">
            Offline list cached {packageAgeMinutes ?? 0} min ago · {pkg.passes.length} passes ·
            expires after {pkg.settings.offlinePackageTtlMinutes} min
          </p>
        )}
        {syncMessage && <p className="text-xs text-emerald-700">{syncMessage}</p>}

        {hideCamera ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
            Use the <span className="font-medium text-slate-800">single camera above</span> to scan
            Guest Entry Pass QR codes. Pass tokens are admitted here automatically; legacy guest QR
            codes still use the check-in panel.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="entry-pass-code" className="text-xs">
            Admission code (4 or 6 digits)
          </Label>
          <div className="flex gap-2">
            <Input
              id="entry-pass-code"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0000"
              value={manualCode}
              maxLength={7}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitManualCode();
              }}
              className="font-mono text-lg tracking-[0.25em]"
            />
            <Button onClick={() => void submitManualCode()} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Keyboard className="h-4 w-4" aria-hidden />
              )}
              <span className="ml-1.5">Look up</span>
            </Button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        {result && (
          <div
            role="status"
            aria-live="polite"
            className={cn("rounded-2xl border p-4", TONE_STYLES[result.decision.tone])}
          >
            <div className="flex items-start gap-3">
              <ToneIcon tone={result.decision.tone} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold leading-tight">
                  {result.displayName ?? "Unknown pass"}
                </p>
                <p className="mt-0.5 text-sm">{result.decision.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {result.passCode && (
                    <Badge variant="outline" className="font-mono">
                      {formatAdmissionCode(result.passCode)}
                    </Badge>
                  )}
                  {result.partySize > 0 && (
                    <Badge variant="outline">
                      {result.admittedCount} of {result.partySize} admitted
                    </Badge>
                  )}
                  {result.seating && (
                    <Badge variant="outline">
                      Table {result.seating.tableNumber}
                      {result.seating.seatLabel ? ` · Seat ${result.seating.seatLabel}` : ""}
                    </Badge>
                  )}
                  {result.offline && <Badge variant="secondary">Queued offline</Badge>}
                </div>
                {result.seatingContinuity && (
                  <SeatingContinuityNote continuity={result.seatingContinuity} />
                )}
              </div>
            </div>

            {awaitingQuantity && (
              <div className="mt-4 space-y-3 border-t border-black/10 pt-3">
                <fieldset>
                  <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide">
                    How many are arriving now?
                  </legend>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label="One fewer guest"
                      disabled={arrivingNow <= 1 || selectedMembers.length > 0}
                      onClick={() => setArrivingNow((n) => Math.max(1, n - 1))}
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </Button>
                    <output
                      aria-live="polite"
                      className="min-w-[3.5rem] rounded-lg border border-black/10 bg-white px-3 py-1.5 text-center text-xl font-semibold tabular-nums"
                    >
                      {selectedMembers.length ? selectedHeads : arrivingNow}
                    </output>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label="One more guest"
                      disabled={arrivingNow >= remaining || selectedMembers.length > 0}
                      onClick={() => setArrivingNow((n) => Math.min(remaining, n + 1))}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </Button>
                    <span className="text-xs opacity-80">of {remaining} still to arrive</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Array.from({ length: Math.min(remaining, 8) }, (_, i) => i + 1).map((n) => (
                      <Button
                        key={n}
                        type="button"
                        size="sm"
                        variant={!selectedMembers.length && arrivingNow === n ? "default" : "outline"}
                        disabled={selectedMembers.length > 0}
                        onClick={() => setArrivingNow(n)}
                        className="min-w-[2.25rem] px-2"
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </fieldset>

                {namedUnadmitted > 0 && result.party.length > 1 && (
                  <fieldset>
                    <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide">
                      Or tick who has arrived
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {result.party.map((member) => (
                        <label
                          key={member.id}
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs",
                            member.admitted
                              ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700"
                              : selectedMembers.includes(member.id)
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300 bg-white text-slate-700"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            disabled={member.admitted}
                            checked={selectedMembers.includes(member.id)}
                            onChange={(e) =>
                              setSelectedMembers((prev) =>
                                e.target.checked
                                  ? [...prev, member.id]
                                  : prev.filter((id) => id !== member.id)
                              )
                            }
                          />
                          {member.name}
                          {member.plusOnes > 0 && ` +${member.plusOnes}`}
                          {member.admitted && " ✓"}
                        </label>
                      ))}
                    </div>
                    {unnamedCompanions > 0 && (
                      <p className="mt-2 text-xs opacity-80">
                        {unnamedCompanions} companion{unnamedCompanions === 1 ? "" : "s"} on this
                        pass {unnamedCompanions === 1 ? "is" : "are"} not named, use the counter
                        above for {unnamedCompanions === 1 ? "them" : "those"}.
                      </p>
                    )}
                  </fieldset>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      void confirmAdmission(selectedMembers.length ? undefined : arrivingNow)
                    }
                    disabled={busy}
                  >
                    Admit {selectedMembers.length ? selectedHeads : arrivingNow}
                  </Button>
                  {remaining > 1 && !selectedMembers.length && (
                    <Button
                      variant="outline"
                      onClick={() => void confirmAdmission(remaining)}
                      disabled={busy}
                    >
                      Admit all {remaining}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPendingScan(null);
                      setResult(null);
                      setSelectedMembers([]);
                      setArrivingNow(1);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!awaitingQuantity && awaitingConfirm && (
              <div className="mt-4 space-y-3 border-t border-black/10 pt-3">
                {result.party.length > 1 && (
                  <fieldset>
                    <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide">
                      Who has arrived?
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {result.party.map((member) => (
                        <label
                          key={member.id}
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs",
                            member.admitted
                              ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700"
                              : selectedMembers.includes(member.id)
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300 bg-white text-slate-700"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            disabled={member.admitted}
                            checked={selectedMembers.includes(member.id)}
                            onChange={(e) =>
                              setSelectedMembers((prev) =>
                                e.target.checked
                                  ? [...prev, member.id]
                                  : prev.filter((id) => id !== member.id)
                              )
                            }
                          />
                          {member.name}
                          {member.plusOnes > 0 && ` +${member.plusOnes}`}
                          {member.admitted && " ✓"}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void confirmAdmission()} disabled={busy}>
                    Admit {selectedMembers.length ? "selected" : `all ${remaining}`}
                  </Button>
                  {remaining > 1 && !selectedMembers.length && (
                    <Button variant="outline" onClick={() => void confirmAdmission(1)} disabled={busy}>
                      Admit 1 only
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPendingScan(null);
                      setResult(null);
                      setSelectedMembers([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * What the gate tells an operator about a part-arrived party's seats: which
 * seats are live now, and what is still being held for the ones still to come.
 */
function SeatingContinuityNote({ continuity }: { continuity: SeatingContinuity }) {
  const held = describeHeldSeats(continuity);
  if (!continuity.revealed.length && !held) return null;

  return (
    <div className="mt-2 space-y-1 text-xs">
      {continuity.revealed.length > 0 && (
        <p>
          <span className="font-semibold">Seat now:</span>{" "}
          {continuity.revealed
            .map((s) =>
              s.seatLabel ? `${s.guestName}, Table ${s.tableNumber}, Seat ${s.seatLabel}` : `${s.guestName}, Table ${s.tableNumber}`
            )
            .join(" · ")}
        </p>
      )}
      {held && <p className="opacity-80">{held}</p>}
      {continuity.unseatedCount > 0 && (
        <p className="opacity-80">
          {continuity.unseatedCount} of this party {continuity.unseatedCount === 1 ? "has" : "have"}{" "}
          no seat assigned, seat them at the host desk.
        </p>
      )}
    </div>
  );
}
