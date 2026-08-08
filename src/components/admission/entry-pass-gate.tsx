"use client";

import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Keyboard,
  Loader2,
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
import { AdmissionScanPrompt } from "@/components/admission/admission-scan-prompt";
import { cn } from "@/lib/utils";
import { formatAdmissionCode, normalizeAdmissionCode } from "@/lib/admission/pass-code";
import { classifyGateInput } from "@/lib/admission/gate-scan";
import { isMultiEntryPass } from "@/lib/vendor-pass/capacity";
import type { AdmissionDecision } from "@/lib/admission/pass-decision";
import { QR_SCAN_SAME_CODE_MS } from "@/lib/qr/qr-constants";
import {
  describeHeldSeats,
  type SeatingContinuity,
} from "@/lib/admission/seating-continuity";
import { seatDisplayName, tableDisplayName } from "@/lib/seating/seating-types";
import {
  downloadGatePack,
  notifyPackChanged,
  syncGateQueue,
  OFFLINE_PACK_EVENT,
} from "@/lib/admission/offline-gate";
import {
  clearPackage,
  enqueue,
  hashTokenInBrowser,
  listQueue,
  loadPackage,
  projectLocalState,
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
  kind?: "guest_pass" | "vendor_team_pass";
  accessZones?: string[];
  entryMode?: string;
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
  /**
   * Off when the page already owns a single code/token entry box, so hosts
   * never face two places to type the same admission code.
   */
  showManualEntry?: boolean;
  /** Fires after a real admit so the page can refresh its scan log and stats. */
  onAdmitted?: () => void;
  /**
   * Off when the page renders the shared "Offline gate pack" card, so download
   * and sync live in exactly one place.
   */
  showPackControls?: boolean;
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
  showManualEntry = true,
  onAdmitted,
  showPackControls = true,
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
  /** Full-screen organiser prompt after every scan outcome. */
  const [promptOpen, setPromptOpen] = useState(false);

  const [online, setOnline] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [pkg, setPkg] = useState<OfflinePackage | null>(null);
  const [queue, setQueue] = useState<QueuedAdmission[]>([]);
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

  /** Persist first, then tell the rest of the page — the queue is the receipt. */
  const queueAdmission = useCallback(
    async (record: QueuedAdmission) => {
      await enqueue(record);
      try {
        setQueue(await listQueue(eventId));
      } catch {
        /* storage unavailable, the gate still works online */
      }
      notifyPackChanged(eventId);
    },
    [eventId]
  );

  const reloadLocalState = useCallback(async () => {
    try {
      setPkg(await loadPackage(eventId));
    } catch {
      /* no package yet */
    }
    await refreshQueue();
  }, [eventId, refreshQueue]);

  useEffect(() => {
    void reloadLocalState();
    // The shared pack card may download, sync or clear on our behalf.
    const onPackChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ eventId?: string }>).detail;
      if (!detail?.eventId || detail.eventId === eventId) void reloadLocalState();
    };
    window.addEventListener(OFFLINE_PACK_EVENT, onPackChanged);
    return () => window.removeEventListener(OFFLINE_PACK_EVENT, onPackChanged);
  }, [eventId, reloadLocalState]);

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
      const next = await downloadGatePack(eventId);
      setPkg(next);
      setSyncMessage(
        `Offline list ready, ${next.passes.length} passes and ${
          next.vendorTeamPasses?.length ?? 0
        } vendor access cards cached.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Offline download failed");
    } finally {
      setBusy(false);
    }
  }, [eventId]);

  const syncQueue = useCallback(async () => {
    setBusy(true);
    try {
      const result = await syncGateQueue(eventId);
      await refreshQueue();
      setSyncMessage(
        result.applied + result.duplicates + result.conflicts === 0
          ? "Nothing to sync."
          : `Synced ${result.applied} · ${result.conflicts} need review · ${result.duplicates} already recorded`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }, [eventId, refreshQueue]);

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
        setPromptOpen(true);
        return result;
      };

      const tokenHash = input.token ? await hashTokenInBrowser(input.token) : null;
      const code = input.code ? normalizeAdmissionCode(input.code) : null;
      const hash =
        tokenHash ?? (code ? pkg.passes.find((p) => p.c === code)?.h ?? null : null);
      const pass = hash ? localState.get(hash) : null;

      if (!pass || !hash) {
        // Capacity-tracked vendor/team pass in the offline package.
        const vendorRows = pkg.vendorTeamPasses ?? [];
        const vendor =
          (tokenHash ? vendorRows.find((row) => row.tokenHash === tokenHash) : null) ??
          (code ? vendorRows.find((row) => row.admissionCode === code) : null);

        if (!vendor) {
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
            kind: "guest_pass",
          });
        }

        const queuedQty = queue
          .filter((q) => q.tokenHash === vendor.tokenHash || q.code === vendor.admissionCode)
          .reduce((sum, q) => sum + Math.max(1, q.quantity), 0);
        const capacity = vendor.teamCapacity;
        // Access cards keep working after the team is in: wrap the queued
        // headcount into the current cycle instead of blocking the scan.
        const multiEntry = vendor.multiEntry ?? isMultiEntryPass(vendor);
        const admitted = multiEntry
          ? (vendor.admittedCount + queuedQty) % Math.max(1, capacity)
          : vendor.admittedCount + queuedQty;
        const remainingVendor = multiEntry
          ? Math.max(1, capacity - admitted)
          : Math.max(0, capacity - admitted);

        if (remainingVendor <= 0) {
          playScanFeedback(false);
          return show({
            decision: {
              outcome: "ALREADY_ADMITTED",
              tone: "amber",
              reason: "ALREADY_ADMITTED",
              message: "Team capacity reached.",
              admitQuantity: 0,
              resultingAdmittedCount: admitted,
              resultingStatus: "ADMITTED",
              requiresConfirmation: false,
              allowance: capacity,
              remaining: 0,
              requiresQuantityConfirmation: false,
            },
            passCode: vendor.admissionCode,
            displayName: `${vendor.title} · ${vendor.vendorName}`,
            partySize: capacity,
            admittedCount: admitted,
            party: [],
            seating: null,
            offline: true,
            kind: "vendor_team_pass",
            accessZones: vendor.accessZones,
            entryMode: vendor.entryMode,
          });
        }

        if (input.preview && remainingVendor > 1 && input.quantity == null) {
          const needsQty = vendor.entryMode === "SELECT_QUANTITY";
          return show({
            decision: {
              outcome: "REVIEW",
              tone: "amber",
              reason: "NEEDS_REVIEW",
              message: needsQty
                ? `${vendor.title}: ${admitted} of ${capacity} admitted. Select quantity.`
                : `Ready to admit for ${vendor.title}. ${remainingVendor} remaining.`,
              admitQuantity: needsQty ? 0 : 1,
              resultingAdmittedCount: admitted,
              resultingStatus: admitted > 0 ? "PARTIALLY_ADMITTED" : "ACTIVE",
              requiresConfirmation: !needsQty,
              allowance: capacity,
              remaining: remainingVendor,
              requiresQuantityConfirmation: needsQty,
            },
            passCode: vendor.admissionCode,
            displayName: `${vendor.title} · ${vendor.vendorName}`,
            partySize: capacity,
            admittedCount: admitted,
            party: [],
            seating: null,
            offline: true,
            kind: "vendor_team_pass",
            accessZones: vendor.accessZones,
            entryMode: vendor.entryMode,
          });
        }

        const qty = Math.min(
          remainingVendor,
          Math.max(1, input.quantity ?? (vendor.entryMode === "ADMIT_FULL_TEAM" ? remainingVendor : 1))
        );
        const record: QueuedAdmission = {
          clientRecordId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          eventId,
          tokenHash: vendor.tokenHash,
          code: vendor.admissionCode,
          quantity: qty,
          capturedAt: new Date().toISOString(),
          usedManualCode: Boolean(code && !input.token),
          displayName: vendor.title,
        };
        await queueAdmission(record);
        const resulting = admitted + qty;
        playScanFeedback(true);
        return show({
          decision: {
            outcome: resulting >= capacity ? "ADMIT" : "PARTIAL_ADMIT",
            tone: "green",
            reason: resulting >= capacity ? "OK" : "OK_PARTIAL",
            message: `Admitted ${qty}. ${resulting} of ${capacity} in. Queued for sync.`,
            admitQuantity: qty,
            resultingAdmittedCount: resulting,
            resultingStatus: resulting >= capacity ? "ADMITTED" : "PARTIALLY_ADMITTED",
            requiresConfirmation: false,
            allowance: capacity,
            remaining: Math.max(0, capacity - resulting),
            requiresQuantityConfirmation: false,
          },
          passCode: vendor.admissionCode,
          displayName: `${vendor.title} · ${vendor.vendorName}`,
          partySize: capacity,
          admittedCount: resulting,
          party: [],
          seating: null,
          offline: true,
          kind: "vendor_team_pass",
          accessZones: vendor.accessZones,
          entryMode: vendor.entryMode,
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
      await queueAdmission(record);

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
    [eventId, localState, pkg, queue, queueAdmission]
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
      vendorAdmitMode?: "one" | "quantity" | "full_team";
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
        const isVendor = data.kind === "vendor_team_pass";
        const next: GateResult = {
          decision: data.decision,
          passCode: data.pass?.code ?? data.pass?.admissionCode ?? null,
          displayName: data.pass?.displayName ?? data.pass?.title ?? null,
          partySize: data.pass?.partySize ?? data.pass?.teamCapacity ?? 0,
          admittedCount: data.pass?.admittedCount ?? 0,
          party: data.party ?? [],
          seating: data.seating ?? null,
          seatingContinuity: data.seatingContinuity ?? null,
          offline: false,
          kind: isVendor ? "vendor_team_pass" : "guest_pass",
          accessZones: data.pass?.accessZones,
          entryMode: data.pass?.entryMode,
        };
        setResult(next);
        setPromptOpen(true);
        // Only real admits change the ledger; previews must not spam refetches.
        if (!input.dryRun && data.decision.admitQuantity > 0) onAdmitted?.();
        return next;
      } catch {
        setError("Network problem. Switch on offline mode to keep admitting.");
        playScanFeedback(false);
        setPromptOpen(false);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [eventId, gate, onAdmitted]
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
      if (classified.kind === "pass_token" || classified.kind === "vendor_team_token") {
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
      setPromptOpen(false);
      setResult({
        decision: {
          outcome: "DENY",
          tone: "red",
          reason: "NOT_FOUND",
          message: "That QR isn't a Celeventic entry pass. Ask for the admission QR or 4/6-digit gate code.",
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
        offline: false,
      });
      setPromptOpen(true);
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
      const remainingHeads = result
        ? Math.max(0, result.partySize - result.admittedCount)
        : 0;
      const isVendor = result?.kind === "vendor_team_pass";
      let vendorAdmitMode: "one" | "quantity" | "full_team" | undefined;
      if (isVendor) {
        if (quantity != null && quantity >= remainingHeads && remainingHeads > 1) {
          vendorAdmitMode = "full_team";
        } else if (quantity != null && quantity > 1) {
          vendorAdmitMode = "quantity";
        } else {
          vendorAdmitMode = "one";
        }
      }

      if (usingOffline) {
        await admitOffline({ ...pendingScan, quantity, guestIds });
      } else {
        await admitOnline({
          ...pendingScan,
          quantity,
          guestIds,
          quantityConfirmed: true,
          vendorAdmitMode,
        });
      }
      setPendingScan(null);
      setSelectedMembers([]);
      setArrivingNow(1);
    },
    [admitOffline, admitOnline, pendingScan, selectedMembers, usingOffline, result]
  );

  const remaining = result ? Math.max(0, result.partySize - result.admittedCount) : 0;
  const awaitingQuantity =
    Boolean(pendingScan) && Boolean(result?.decision.requiresQuantityConfirmation);
  const awaitingConfirm =
    Boolean(pendingScan) &&
    result !== null &&
    result.decision.admitQuantity > 0 &&
    !result.decision.requiresQuantityConfirmation;

  const selectedHeads = useMemo(
    () =>
      result?.party
        .filter((m) => selectedMembers.includes(m.id))
        .reduce((sum, m) => sum + 1 + Math.max(0, m.plusOnes), 0) ?? 0,
    [result, selectedMembers]
  );

  const seatingLabel = result?.seating
    ? `${tableDisplayName(result.seating.tableNumber)}${
        result.seating.seatLabel ? ` · ${seatDisplayName(result.seating.seatLabel)}` : ""
      }`
    : null;

  return (
    <Card className={cn("border-slate-200", className)}>
      {result && (
        <AdmissionScanPrompt
          open={promptOpen}
          decision={result.decision}
          displayName={result.displayName}
          passCode={result.passCode}
          partySize={result.partySize}
          admittedCount={result.admittedCount}
          party={result.party}
          seatingLabel={seatingLabel}
          offline={result.offline}
          awaitingQuantity={awaitingQuantity}
          arrivingNow={arrivingNow}
          onArrivingNowChange={setArrivingNow}
          selectedMembers={selectedMembers}
          onSelectedMembersChange={setSelectedMembers}
          busy={busy}
          onAdmit={(quantity) => void confirmAdmission(quantity)}
          onAdmitAllRemaining={() => void confirmAdmission(remaining)}
          onDismiss={() => {
            setPromptOpen(false);
            if (awaitingQuantity || awaitingConfirm) {
              setPendingScan(null);
              setResult(null);
              setSelectedMembers([]);
              setArrivingNow(1);
            }
          }}
          awaitingConfirm={awaitingConfirm}
          onConfirmAdmit={() =>
            void confirmAdmission(selectedMembers.length ? undefined : remaining || undefined)
          }
          passKind={result.kind}
          accessZones={result.accessZones}
        />
      )}
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
          {showPackControls ? (
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
                    notifyPackChanged(eventId);
                  }}
                  disabled={busy || queue.length > 0}
                  title={queue.length > 0 ? "Sync queued admissions first" : undefined}
                >
                  Clear
                </Button>
              )}
            </div>
          ) : (
            <p className="ml-auto text-xs text-slate-500">
              {pkg
                ? `${pkg.passes.length} passes cached · manage the pack above`
                : "Download the offline gate pack above to admit without signal"}
            </p>
          )}
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
            Scan with the <span className="font-medium text-slate-800">camera above</span> or type
            into <span className="font-medium text-slate-800">Enter code manually</span> — guest
            passes, vendor access cards and legacy guest QR all admit through that one box.
          </p>
        ) : null}

        {showManualEntry && (
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
        )}

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
                      {tableDisplayName(result.seating.tableNumber)}
                      {result.seating.seatLabel
                        ? ` · ${seatDisplayName(result.seating.seatLabel)}`
                        : ""}
                    </Badge>
                  )}
                  {result.offline && <Badge variant="secondary">Queued offline</Badge>}
                </div>
                {result.seatingContinuity && (
                  <SeatingContinuityNote continuity={result.seatingContinuity} />
                )}
              </div>
            </div>

            {awaitingQuantity && !promptOpen && (
              <div className="mt-4 space-y-3 border-t border-black/10 pt-3">
                <p className="text-sm font-medium">
                  {remaining} place{remaining === 1 ? "" : "s"} still open — choose how many to admit.
                </p>
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

            {!awaitingQuantity && awaitingConfirm && !promptOpen && (
              <div className="mt-4 space-y-3 border-t border-black/10 pt-3">
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

            {!awaitingQuantity && !awaitingConfirm && !promptOpen && result.decision.tone === "green" && result.decision.admitQuantity > 0 && (
              <p className="mt-3 text-sm font-medium text-emerald-800">
                Organiser notified: admission recorded successfully.
              </p>
            )}
            {!awaitingQuantity && !awaitingConfirm && !promptOpen && result.decision.outcome === "ALREADY_ADMITTED" && (
              <p className="mt-3 text-sm font-medium text-amber-900">
                Already admitted — no additional entry was counted.
              </p>
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
              s.seatLabel
                ? `${s.guestName}, ${tableDisplayName(s.tableNumber)}, ${seatDisplayName(s.seatLabel)}`
                : `${s.guestName}, ${tableDisplayName(s.tableNumber)}`
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
