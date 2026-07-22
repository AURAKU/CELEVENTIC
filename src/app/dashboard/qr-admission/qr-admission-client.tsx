"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera, Upload, Keyboard, QrCode, CheckCircle2, XCircle, AlertTriangle,
  Clock, Download, Shield, Wifi, WifiOff, ImagePlus, CloudDownload, RotateCcw,
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
import { PaginationBar } from "@/components/ui/pagination";
import { useEventContext } from "@/hooks/use-event-context";
import { useLocale } from "@/components/i18n/locale-provider";
import { useSession } from "next-auth/react";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
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
  getPendingOfflineScans,
  type OfflinePackage,
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

interface RecentScan {
  id: string;
  status: string;
  result: string;
  guestId?: string | null;
  guestName?: string;
  invitationName?: string;
  ticketName?: string;
  displayName?: string;
  seatNumber?: string | null;
  scannerName?: string;
  gate?: string;
  createdAt: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [screenScanMode, setScreenScanMode] = useState(true);
  const [offlinePkg, setOfflinePkg] = useState<OfflinePackage | null>(null);
  const [offlineMsg, setOfflineMsg] = useState("");
  const [resetting, setResetting] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [lastImageName, setLastImageName] = useState("");

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
        fetch(`/api/qr/history?eventId=${eventId}&page=${page}&limit=20${q}`),
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
    if (!eventId) {
      setOfflinePkg(null);
      return;
    }
    setOfflinePkg(getOfflinePackage(eventId));
  }, [eventId]);

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

  const downloadOfflinePackage = useCallback(async () => {
    if (!eventId || !isOnline) return;
    setOfflineMsg("");
    try {
      const res = await fetch(`/api/qr/offline?eventId=${eventId}`);
      const d = await res.json();
      if (!res.ok) {
        setOfflineMsg(d.error ?? "Could not download offline package");
        return;
      }
      saveOfflinePackage(eventId, d.data);
      setOfflinePkg(d.data);
      setOfflineMsg(
        `Offline ready — ${d.data.guests.length} guests, ${d.data.tickets.length} tickets (incl. 4-digit codes)`
      );
    } catch {
      setOfflineMsg("Could not download offline package");
    }
  }, [eventId, isOnline]);

  // Prefetch offline package when event is selected online (gate can keep working if net drops)
  useEffect(() => {
    if (!eventId || !isOnline) return;
    if (getOfflinePackage(eventId)) {
      setOfflinePkg(getOfflinePackage(eventId));
      return;
    }
    void downloadOfflinePackage();
  }, [eventId, isOnline, downloadOfflinePackage]);

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
      setOfflinePkg(getOfflinePackage(eventId));
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
        // Network failure mid-request — fall back to offline admit
        if (getOfflinePackage(eventId)) {
          setError("Network failed — admitting from offline package.");
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

  async function resetAdmission(scope: "guest" | "event", guestId?: string) {
    if (!eventId) return;
    if (scope === "event") {
      const ok = window.confirm(
        "Reset ALL guest admissions for this event? Every QR and 4-digit code can be scanned again."
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
      setOfflinePkg(getOfflinePackage(eventId));
      setResult(null);
      if (isOnline) await loadEventData(historyPage);
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
      await performCheckIn(text);
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
      <div id="celeventic-qr-file-reader" className="hidden" aria-hidden />

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
        {eventId && offlinePkg && (
          <Badge variant="outline" className="gap-1 text-xs">
            Offline pack · {offlinePkg.guests.length} guests · synced{" "}
            {new Date(offlinePkg.syncedAt).toLocaleString()}
          </Badge>
        )}
        {eventId && !offlinePkg && !isOnline && (
          <Badge variant="destructive" className="text-xs">
            No offline pack — connect once to download
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
            <div className="flex flex-col sm:flex-row gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <CloudDownload className="h-4 w-4 text-brand-600 shrink-0" />
                  Offline gate pack
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download guest QR tokens + 4-digit codes so scanning still works without internet.
                </p>
                {offlineMsg && <p className="text-xs text-brand-700 mt-1">{offlineMsg}</p>}
                {!isOnline && getPendingOfflineScans(eventId).length > 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    {getPendingOfflineScans(eventId).length} offline admits waiting to sync when back online.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!isOnline || processing}
                  onClick={() => void downloadOfflinePackage()}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  {offlinePkg ? "Refresh pack" : "Download pack"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!eventId || resetting}
                  onClick={() => void resetAdmission("event")}
                  className="gap-1.5 text-amber-800 border-amber-200 hover:bg-amber-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset all admits
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      <div className="grid lg:grid-cols-2 gap-6">
        <QrFileReaderHost />
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              className="flex-1 min-h-[52px] gap-2 touch-manipulation"
              disabled={!eventId || processing}
              onClick={() => {
                setCameraError("");
                setCameraOpen((v) => !v);
              }}
            >
              <Camera className="h-5 w-5" />
              {cameraOpen ? "Close camera" : t("qr_admission.open_camera")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 min-h-[52px] gap-2 touch-manipulation"
              disabled={!eventId || processing || scanningImage}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5" />
              {scanningImage ? "Reading QR…" : t("qr_admission.upload_image")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
              className="hidden"
              onChange={(e) => void handleFileUpload(e)}
            />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void processUploadedFile(file);
            }}
            role="button"
            tabIndex={eventId ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors touch-manipulation",
              dragOver ? "border-brand-500 bg-brand-50/50" : "border-slate-200 bg-slate-50/50",
              scanningImage && "border-brand-400 bg-brand-50/40",
              (!eventId || processing || scanningImage) && "opacity-50 pointer-events-none"
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
            screenScanMode={screenScanMode}
            onScreenScanModeChange={setScreenScanMode}
            onScan={(text) => void performCheckIn(text)}
            onError={(msg) => {
              setCameraError(msg);
              setCameraOpen(false);
            }}
          />

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
                placeholder="4-digit code, token, or verify URL"
                disabled={processing}
              />
              <p className="text-xs text-slate-500">
                Each guest pass has a unique 4-digit code for manual admit when scanning isn’t practical.
              </p>
              <Button
                className="w-full min-h-[44px] touch-manipulation"
                disabled={!eventId || !manualToken.trim() || processing}
                onClick={() => void performCheckIn(manualToken)}
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
                  const name =
                    scan.displayName ||
                    scan.guestName ||
                    scan.invitationName ||
                    scan.ticketName ||
                    "Unknown guest";
                  const subtitle = [
                    scan.guestName && scan.invitationName && scan.guestName !== scan.invitationName
                      ? scan.invitationName
                      : null,
                    scan.gate || null,
                    new Date(scan.createdAt).toLocaleString(),
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <li
                      key={scan.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate">{name}</p>
                        {scan.seatNumber && (
                          <p className="text-xs font-medium text-brand-700 flex items-center gap-1 mt-0.5">
                            <Armchair className="h-3 w-3 shrink-0" />
                            <span className="truncate">{scan.seatNumber}</span>
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
                      </div>
                      <Badge
                        variant={
                          scan.result === "VALID" || scan.status === "checked_in" || scan.status === "valid"
                            ? "success"
                            : scan.result === "ALREADY_USED" || scan.status === "duplicate_scan"
                              ? "warning"
                              : "destructive"
                        }
                        className="shrink-0 text-[10px]"
                      >
                        {(scan.result ?? scan.status ?? "unknown").replace(/_/g, " ")}
                      </Badge>
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
