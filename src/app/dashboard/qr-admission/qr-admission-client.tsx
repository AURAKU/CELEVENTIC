"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera, Upload, Keyboard, QrCode, CheckCircle2, XCircle, AlertTriangle,
  Clock, Download, Shield, Wifi, WifiOff, ImagePlus, RotateCcw,
  Search, Armchair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EventPicker } from "@/components/dashboard/event-picker";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { QrCameraScanner, QrFileReaderHost, scanQrFromFile, playScanFeedback, QrImageScanError } from "@/components/qr/qr-camera-scanner";
import { AdmissionScanFeedback, type AdmissionFeedbackStatus } from "@/components/qr/admission-scan-feedback";
import { EntryPassGate } from "@/components/admission/entry-pass-gate";
import { OfflineGatePack } from "@/components/admission/offline-gate-pack";
import { downloadGatePack } from "@/lib/admission/offline-gate";
import { AdmissionSettingsPanel } from "@/components/admission/admission-settings-panel";
import { PaginationBar } from "@/components/ui/pagination";
import { useEventContext } from "@/hooks/use-event-context";
import { useLocale } from "@/components/i18n/locale-provider";
import { useSession } from "next-auth/react";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { prefersEntryPassAdmit } from "@/lib/admission/gate-scan";
import { parseQrToken } from "@/lib/qr/parse-qr-payload";
import type { ScanLogRow } from "@/services/admission/scan-log.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getOfflinePackage,
  saveOfflinePackage,
  validateOfflineToken,
  recordOfflineScan,
  resetOfflineAdmissionLocal,
} from "@/lib/offline-qr-client";

type ScanStatus = AdmissionFeedbackStatus;

interface ScanResult {
  status: ScanStatus;
  guest?: { id?: string; name: string } | null;
  ticket?: { name: string } | null;
  event?: { title: string } | null;
  selectedEventTitle?: string | null;
  qrType?: string;
  admittedAt?: string | null;
  offline?: boolean;
  feedback?: string | null;
}

type RecentScan = ScanLogRow;

const SCAN_CHANNEL_LABELS: Record<string, string> = {
  qr: "QR scan",
  manual_code: "Typed code",
  dashboard: "Guest CRM",
  offline: "Offline gate",
};

function scanBadgeVariant(status: ScanLogRow["status"]) {
  if (status === "ADMITTED") return "success" as const;
  if (status === "RE_ENTRY") return "outline" as const;
  if (status === "DUPLICATE") return "warning" as const;
  if (status === "INFO") return "outline" as const;
  return "destructive" as const;
}

/** Full date and clock time — a gate log is worthless without the "when". */
function formatScanStamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface AdmissionStats {
  totalPasses: number;
  checkedIn: number;
  pending: number;
  invalidAttempts: number;
  checkInRate: number;
  lastScanned: { id: string; name: string; at: string; gate?: string | null }[];
  isAdmin?: boolean;
}

export function QrAdmissionClient() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [gate, setGate] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "guest" | "ticket">("all");
  const [adminOverride, setAdminOverride] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [scanSearch, setScanSearch] = useState("");
  const [scanSearchDebounced, setScanSearchDebounced] = useState("");
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [liveScanCount, setLiveScanCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [loadingScans, setLoadingScans] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Default off for printed passes; toggle on for phone-screen guest passes.
  /** Default ON, entrance queues are almost always phone-screen passes. */
  const [screenScanMode, setScreenScanMode] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [lastImageName, setLastImageName] = useState("");
  /** Routes Guest Entry Pass QR payloads into EntryPassGate (one camera for the page). */
  const entryPassScanRef = useRef<((text: string) => void) | null>(null);

  const isAdmin = session?.user?.role && isAdminRole(session.user.role as UserRole);
  const selectedEventTitle = events.find((e) => e.id === eventId)?.title ?? null;

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setScanSearchDebounced(scanSearch.trim()), 280);
    return () => window.clearTimeout(t);
  }, [scanSearch]);

  useEffect(() => {
    setHistoryPage(1);
  }, [eventId, scanSearchDebounced]);

  const loadEventData = useCallback(async (page: number) => {
    if (!eventId) {
      setRecentScans([]);
      setStats(null);
      setLiveScanCount(0);
      return;
    }
    setLoadingScans(true);
    try {
      const q = scanSearchDebounced
        ? `&q=${encodeURIComponent(scanSearchDebounced)}`
        : "";
      const [scansRes, statsRes] = await Promise.all([
        fetch(`/api/admission/scan-log?eventId=${eventId}&page=${page}&limit=20${q}`, {
          cache: "no-store",
        }),
        fetch(`/api/qr/stats?eventId=${eventId}`),
      ]);
      const scansData = await scansRes.json();
      const statsData = await statsRes.json();
      if (scansRes.ok && scansData.data?.items) {
        setRecentScans(scansData.data.items);
        setHistoryPage(scansData.data.page);
        setHistoryPages(scansData.data.pages);
        setHistoryTotal(scansData.data.total);
      }
      if (statsRes.ok) {
        setStats(statsData.data ?? null);
        setLiveScanCount(statsData.data?.validScans ?? statsData.data?.checkedIn ?? 0);
      }
    } catch {
      // non-blocking
    } finally {
      setLoadingScans(false);
    }
  }, [eventId, scanSearchDebounced]);

  useEffect(() => {
    void loadEventData(historyPage);
  }, [loadEventData, historyPage]);

  useEffect(() => {
    if (!eventId || !isOnline) return;
    const interval = setInterval(() => {
      void fetch(`/api/qr/stats?eventId=${eventId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.data) {
            setLiveScanCount(d.data.validScans ?? d.data.checkedIn ?? 0);
            setStats((prev) => (prev ? { ...prev, ...d.data } : d.data));
          }
        })
        .catch(() => undefined);
    }, 15000);
    return () => clearInterval(interval);
  }, [eventId, isOnline]);

  /**
   * Legacy QR fallback cache. The gate pack card owns the entry-pass package;
   * this one only keeps pre-Entry-Pass guest QR tokens scannable offline.
   */
  useEffect(() => {
    if (!eventId || !isOnline || getOfflinePackage(eventId)) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/qr/offline?eventId=${eventId}`);
        const d = await res.json();
        if (!cancelled && res.ok && d.data) saveOfflinePackage(eventId, d.data);
      } catch {
        /* the entry-pass gate pack is the primary offline path */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, isOnline]);

  const performOfflineCheckIn = useCallback(
    (raw: string) => {
      if (!eventId) return;
      const pkg = getOfflinePackage(eventId);
      if (!pkg) {
        setError("No offline package. Connect once to download guest passes for this event.");
        playScanFeedback(false);
        return;
      }

      const validation = validateOfflineToken(eventId, raw.trim());
      const syncToken = validation.syncToken ?? raw.trim();
      recordOfflineScan(eventId, {
        qrToken: syncToken,
        result: validation.result,
        guestId: validation.guestId,
        ticketId: validation.ticketId,
        scannedAt: new Date().toISOString(),
      });

      const status: ScanStatus =
        validation.result === "VALID"
          ? "valid"
          : validation.result === "ALREADY_USED"
            ? "already_checked_in"
            : "invalid";

      const eventTitle = selectedEventTitle ?? "this event";
      const name = validation.name;
      let feedback: string;
      if (status === "valid") {
        feedback = name
          ? `Welcome, ${name}! You are admitted to ${eventTitle}. Enjoy the celebration.`
          : `Welcome! You are admitted to ${eventTitle}.`;
      } else if (status === "already_checked_in") {
        feedback = name
          ? `${name} was already admitted. This scan was not counted again.`
          : "This guest was already admitted. This scan was not counted again.";
      } else {
        feedback =
          "No matching pass in the offline package for this event. Confirm the QR is for this celebration, or refresh the offline pack while online.";
      }

      setResult({
        status,
        guest: validation.guestId && name ? { id: validation.guestId, name } : null,
        ticket: validation.ticketId && name ? { name } : null,
        event: selectedEventTitle ? { title: selectedEventTitle } : null,
        selectedEventTitle,
        offline: true,
        feedback,
      });
      playScanFeedback(status === "valid" || status === "already_checked_in");
      if (status === "valid") {
        setLiveScanCount((c) => c + 1);
      }
    },
    [eventId, selectedEventTitle]
  );

  const performCheckIn = useCallback(
    async (raw: string) => {
      if (!eventId) {
        setError(t("qr_admission.no_event"));
        return;
      }

      setProcessing(true);
      setError("");
      setResult(null);

      const trimmed = raw.trim();

      if (!isOnline) {
        performOfflineCheckIn(trimmed);
        setProcessing(false);
        return;
      }

      try {
        const res = await fetch("/api/qr/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: trimmed,
            eventId,
            gate: gate || undefined,
            override: adminOverride && isAdmin,
            typeFilter,
          }),
        });
        const data = await res.json();
        const scanResult: ScanResult = {
          status: data.status ?? "invalid",
          guest: data.data?.guest,
          ticket: data.data?.ticket,
          event: data.data?.event,
          selectedEventTitle: data.data?.selectedEventTitle ?? selectedEventTitle,
          qrType: data.data?.qrType,
          admittedAt: data.data?.admittedAt ?? null,
          feedback: data.data?.feedback ?? null,
        };
        setResult(scanResult);
        playScanFeedback(scanResult.status === "valid" || scanResult.status === "already_checked_in");
        if (!res.ok && data.error) setError(data.error);
        await loadEventData(historyPage);
      } catch {
        // Network failure mid-request, fall back to offline admit
        if (getOfflinePackage(eventId)) {
          setError("Network failed, admitting from offline package.");
          performOfflineCheckIn(trimmed);
        } else {
          setError("Check-in failed. Download offline package while online to keep the gate moving.");
          playScanFeedback(false);
        }
      } finally {
        setProcessing(false);
      }
    },
    [
      eventId,
      gate,
      adminOverride,
      isAdmin,
      typeFilter,
      isOnline,
      loadEventData,
      historyPage,
      t,
      performOfflineCheckIn,
      selectedEventTitle,
    ]
  );

  /** One camera: Guest Entry Pass tokens/codes → EntryPassGate; everything else → legacy check-in. */
  const handleUnifiedScan = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const platformToken = parseQrToken(trimmed);
      // Client decode only routes — admit always happens server-side.
      // Existing guest QR credentials are bridged to their invitation's
      // GuestPass so old links/printouts get the same partial-arrival count.
      if ((prefersEntryPassAdmit(trimmed) || platformToken) && entryPassScanRef.current) {
        entryPassScanRef.current(prefersEntryPassAdmit(trimmed) ? trimmed : platformToken!);
        return;
      }
      // Reject unrelated consumer/payment/contact QRs locally. Legacy platform
      // tokens still proceed to the server, where event ownership and current
      // admission state are authoritative.
      if (!platformToken) {
        setResult({
          status: "invalid",
          selectedEventTitle,
          feedback: "This is not a Celeventic admission QR code.",
        });
        setError("This is not a Celeventic admission QR code.");
        playScanFeedback(false);
        return;
      }
      void performCheckIn(trimmed);
    },
    [performCheckIn, selectedEventTitle]
  );

  async function resetAdmission(scope: "guest" | "event", guestId?: string) {
    if (!eventId) return;
    if (scope === "event") {
      const ok = window.confirm(
        "Reset ALL guest admissions for this event?\n\nEveryone can be scanned again like first entry.\nEvent Companion locks for all until re-admit.\nInvite links start from the invitation intro again."
      );
      if (!ok) return;
    } else if (scope === "guest") {
      if (!guestId) return;
      const ok = window.confirm(
        "Reset this guest's admission?\n\nUse when they left and need to re-enter.\n• QR / code works again like first entry\n• Event Companion locks\n• Their invite link starts from the invitation intro"
      );
      if (!ok) return;
    }
    setResetting(true);
    setError("");
    try {
      if (isOnline) {
        const res = await fetch("/api/qr/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            scope === "guest" ? { scope: "guest", eventId, guestId } : { scope: "event", eventId }
          ),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Reset failed");
          return;
        }
      }
      resetOfflineAdmissionLocal(eventId, scope === "guest" ? { guestId } : { all: true });
      setResult(null);
      if (isOnline) {
        // A cached pack still believes everyone is admitted; pull the reset state
        // down so the next offline scan is not judged against stale counts.
        await downloadGatePack(eventId).catch(() => undefined);
        await loadEventData(historyPage);
      }
    } catch {
      setError("Reset failed");
    } finally {
      setResetting(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
    e.target.value = "";
  }

  async function processUploadedFile(file: File) {
    if (!eventId) {
      setError(t("qr_admission.no_event"));
      return;
    }
    setCameraError("");
    setError("");
    setResult(null);
    setScanningImage(true);
    setLastImageName(file.name || "QR image");
    try {
      const text = await scanQrFromFile(file);
      handleUnifiedScan(text);
    } catch (err) {
      const message =
        err instanceof QrImageScanError
          ? err.message
          : "Could not read a QR code from this image. Try a clearer photo or the 4-digit gate code.";
      setError(message);
      setResult({
        status: "not_found",
        feedback: message,
        selectedEventTitle,
      });
      playScanFeedback(false);
    } finally {
      setScanningImage(false);
    }
  }

  function statusLabel(status: ScanStatus, result?: ScanResult | null) {
    if (status === "valid") {
      if (result?.ticket) return t("qr_admission.result_ticket_admitted");
      if (result?.guest) return t("qr_admission.result_guest_admitted");
      return t("qr_admission.result_valid");
    }
    if (status === "already_checked_in") {
      if (result?.ticket) return t("qr_admission.result_already_ticket");
      if (result?.guest) return t("qr_admission.result_already_guest");
      return t("qr_admission.result_already");
    }
    if (status === "wrong_event") return t("qr_admission.result_wrong_event");
    if (status === "wrong_pass") return t("qr_admission.result_wrong_pass");
    const map: Record<
      Exclude<ScanStatus, "valid" | "already_checked_in" | "wrong_event" | "wrong_pass">,
      string
    > = {
      invalid: t("qr_admission.result_invalid"),
      expired: t("qr_admission.result_expired"),
      not_found: t("qr_admission.result_not_found"),
      revoked: "Revoked",
      refunded: "Refunded",
      cancelled: "Cancelled",
    };
    return (
      map[status as Exclude<ScanStatus, "valid" | "already_checked_in" | "wrong_event" | "wrong_pass">] ??
      status
    );
  }

  async function exportCsv() {
    if (!eventId) return;
    const res = await fetch(`/api/events/${eventId}/admission-stats`, { method: "POST" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admission-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardPageShell
      title={t("qr_admission.title")}
      description={t("qr_admission.description")}
      action={
        eventId ? (
          <Button variant="outline" size="sm" onClick={() => void exportCsv()} className="gap-2">
            <Download className="h-4 w-4" />
            {t("qr_admission.export_csv")}
          </Button>
        ) : undefined
      }
    >
      <QrFileReaderHost />

      {/* Gate analytics lead the page — the numbers an organiser checks first. */}
      {stats && eventId && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: t("qr_admission.stats_total"), value: stats.totalPasses, icon: QrCode },
            { label: t("qr_admission.stats_checked_in"), value: stats.checkedIn, icon: CheckCircle2 },
            { label: "Live scans", value: liveScanCount, icon: CheckCircle2 },
            { label: t("qr_admission.stats_pending"), value: stats.pending, icon: Clock },
            { label: t("qr_admission.stats_invalid"), value: stats.invalidAttempts, icon: XCircle },
            { label: t("qr_admission.stats_rate"), value: `${stats.checkInRate}%`, icon: AlertTriangle },
          ].map((item) => (
            <Card key={item.label} className="card-premium">
              <CardContent className="p-4">
                <item.icon className="h-4 w-4 text-brand-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {isOnline ? (
          <Badge variant="success" className="gap-1">
            <Wifi className="h-3 w-3" /> Online
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1">
            <WifiOff className="h-3 w-3" /> Offline admit active
          </Badge>
        )}
        <Link href="/dashboard/qr" className="text-xs text-slate-500 hover:text-brand-600 ml-auto">
          Offline package tools →
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gate / entrance</Label>
              <Input value={gate} onChange={(e) => setGate(e.target.value)} placeholder="Main entrance" />
            </div>
            <div className="space-y-1.5">
              <Label>Pass type</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("qr_admission.filter_all")}</SelectItem>
                  <SelectItem value="guest">{t("qr_admission.filter_guests")}</SelectItem>
                  <SelectItem value="ticket">{t("qr_admission.filter_tickets")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-amber-900">
                <Shield className="h-4 w-4 shrink-0" />
                {t("qr_admission.override_checkin")}
              </div>
              <Switch checked={adminOverride} onCheckedChange={setAdminOverride} />
            </div>
          )}

          {eventId && (
            <OfflineGatePack
              eventId={eventId}
              isOnline={isOnline}
              resetting={resetting}
              onResetAll={() => void resetAdmission("event")}
            />
          )}
        </CardContent>
      </Card>

      {eventId && <AdmissionSettingsPanel eventId={eventId} />}

      {/* Single camera for the whole gate, Entry Pass + legacy guest QR. */}
      {eventId && (
        <Card className="border-brand-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4 text-brand-600" />
              Admission scanner
            </CardTitle>
            <p className="text-xs text-slate-500">
              One camera for Guest Entry Pass QR codes and legacy guest QR / tickets. Toggle screen
              pass mode when scanning phones. Use torch in low light when your device supports it.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => setCameraOpen((v) => !v)}
                variant={cameraOpen ? "secondary" : "default"}
                className="gap-1.5"
              >
                <Camera className="h-4 w-4" />
                {cameraOpen ? "Stop camera" : "Open camera"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                disabled={!eventId || scanningImage}
                onClick={() => document.getElementById("qr-admission-file-input")?.click()}
              >
                <Upload className="h-4 w-4" />
                Upload QR image
              </Button>
              <input
                id="qr-admission-file-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => void handleFileUpload(e)}
              />
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void processUploadedFile(file);
              }}
              className={cn(
                "rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
                dragOver ? "border-brand-400 bg-brand-50/50" : "border-slate-200 bg-slate-50/50"
              )}
            >
              <ImagePlus
                className={cn(
                  "h-8 w-8 mx-auto mb-2",
                  scanningImage ? "text-brand-600 animate-pulse" : "text-slate-400"
                )}
              />
              <p className="text-sm font-medium text-slate-700">
                {scanningImage
                  ? `Scanning ${lastImageName || "image"}…`
                  : dragOver
                    ? "Drop to scan & admit"
                    : "Drag & drop QR image here"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                PNG, JPG, or WebP · validates against the selected event
              </p>
            </div>

            {cameraError && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                {t("qr_admission.camera_denied")} ({cameraError})
              </p>
            )}

            <QrCameraScanner
              active={cameraOpen && !!eventId}
              viewfinderId="celeventic-gate-unified-viewfinder"
              screenScanMode={screenScanMode}
              onScreenScanModeChange={setScreenScanMode}
              onScan={handleUnifiedScan}
              onError={(msg) => {
                setCameraError(msg);
                setCameraOpen(false);
              }}
            />
          </CardContent>
        </Card>
      )}

      {eventId && (
        <EntryPassGate
          eventId={eventId}
          eventTitle={selectedEventTitle ?? undefined}
          gate={gate || undefined}
          hideCamera
          showManualEntry={false}
          showPackControls={false}
          scanHandlerRef={entryPassScanRef}
          onUnresolvedCode={(code) => void performCheckIn(code)}
          onAdmitted={() => void loadEventData(historyPage)}
        />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                {t("qr_admission.manual_entry")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value.trim())}
                inputMode="numeric"
                placeholder="4/6-digit code, token, or verify URL"
                disabled={processing}
              />
              <p className="text-xs text-slate-500">
                Entry-pass codes and QR tokens admit through the secure gate first. Legacy guest
                4-digit codes and verify URLs fall through to the same server check-in path.
              </p>
              <Button
                className="w-full min-h-[44px] touch-manipulation"
                disabled={!eventId || !manualToken.trim() || processing}
                onClick={() => handleUnifiedScan(manualToken)}
              >
                {processing ? "Checking in…" : "Verify & check in"}
              </Button>
            </CardContent>
          </Card>

          {error && !result && <p className="text-sm text-red-600">{error}</p>}

          {result && (
            <AdmissionScanFeedback
              result={result}
              statusLabel={statusLabel(result.status, result)}
              resetting={resetting}
              onResetGuest={(guestId) => void resetAdmission("guest", guestId)}
              asPrompt
              onDismissPrompt={() => setResult(null)}
            />
          )}
        </div>

        <Card className="h-fit">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">{t("qr_admission.recent_scans")}</CardTitle>
            {eventId && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  className="pl-9 h-10"
                  placeholder={t("qr_admission.search_admitted")}
                  value={scanSearch}
                  onChange={(e) => setScanSearch(e.target.value)}
                  aria-label={t("qr_admission.search_admitted")}
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!eventId ? (
              <p className="text-sm text-slate-500 text-center py-8">{t("qr_admission.no_event")}</p>
            ) : loadingScans ? (
              <p className="text-sm text-slate-500 text-center py-8">Loading…</p>
            ) : recentScans.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                {scanSearchDebounced
                  ? t("qr_admission.no_search_results")
                  : t("qr_admission.no_scans")}
              </p>
            ) : (
              <ul className="space-y-2 max-h-[480px] overflow-y-auto">
                {recentScans.map((scan) => {
                  const meta = [
                    scan.passType,
                    scan.code ? `Code ${scan.code}` : null,
                    scan.gate,
                    scan.entryCycle && scan.entryCycle > 1 ? `Entry #${scan.entryCycle}` : null,
                    scan.quantity > 1 ? `${scan.quantity} people` : null,
                  ].filter(Boolean) as string[];
                  const trail = [
                    scan.scannerName ? `by ${scan.scannerName}` : null,
                    SCAN_CHANNEL_LABELS[scan.channel ?? ""] ?? scan.channel,
                    scan.offline ? "captured offline" : null,
                  ].filter(Boolean) as string[];

                  return (
                    <li
                      key={scan.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{scan.displayName}</p>
                        {(scan.seat || scan.table) && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-brand-700">
                            <Armchair className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {[scan.table, scan.seat].filter(Boolean).join(" · ")}
                            </span>
                          </p>
                        )}
                        <p className="mt-0.5 text-xs font-medium tabular-nums text-slate-700">
                          {formatScanStamp(scan.createdAt)}
                        </p>
                        {meta.length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {meta.join(" · ")}
                          </p>
                        )}
                        {trail.length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {trail.join(" · ")}
                          </p>
                        )}
                        {scan.detail && (
                          <p className="mt-0.5 text-xs text-rose-600">{scan.detail}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge variant={scanBadgeVariant(scan.status)} className="text-[10px]">
                          {scan.outcome}
                        </Badge>
                        {scan.guestId && scan.status !== "DENIED" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-amber-800 hover:bg-amber-50"
                            disabled={resetting}
                            onClick={() => void resetAdmission("guest", scan.guestId!)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reset admission
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {historyPages > 1 && (
              <PaginationBar
                page={historyPage}
                pages={historyPages}
                total={historyTotal}
                limit={20}
                onPageChange={setHistoryPage}
                className="mt-4"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
}
