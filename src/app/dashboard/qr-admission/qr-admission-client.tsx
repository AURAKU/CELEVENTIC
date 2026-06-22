"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera, Upload, Keyboard, QrCode, CheckCircle2, XCircle, AlertTriangle,
  Clock, Download, Shield, Wifi, WifiOff, ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EventPicker } from "@/components/dashboard/event-picker";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { QrCameraScanner, scanQrFromFile, playScanFeedback } from "@/components/qr/qr-camera-scanner";
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

type ScanStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "already_checked_in"
  | "not_found"
  | "wrong_event"
  | "revoked"
  | "refunded"
  | "cancelled";

interface ScanResult {
  status: ScanStatus;
  guest?: { name: string } | null;
  ticket?: { name: string } | null;
  event?: { title: string } | null;
  qrType?: string;
}

interface RecentScan {
  id: string;
  status: string;
  result: string;
  guestName?: string;
  ticketName?: string;
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
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [liveScanCount, setLiveScanCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [loadingScans, setLoadingScans] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const isAdmin = session?.user?.role && isAdminRole(session.user.role as UserRole);

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

  const loadEventData = useCallback(async (page: number) => {
    if (!eventId) {
      setRecentScans([]);
      setStats(null);
      setLiveScanCount(0);
      return;
    }
    setLoadingScans(true);
    try {
      const [scansRes, statsRes] = await Promise.all([
        fetch(`/api/qr/history?eventId=${eventId}&page=${page}&limit=20`),
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
  }, [eventId]);

  useEffect(() => {
    void loadEventData(historyPage);
  }, [loadEventData, historyPage]);

  useEffect(() => {
    if (!eventId) return;
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
  }, [eventId]);

  const performCheckIn = useCallback(
    async (raw: string) => {
      if (!eventId) {
        setError(t("qr_admission.no_event"));
        return;
      }
      if (!isOnline) {
        setError("You are offline. Connect to check in online.");
        return;
      }

      setProcessing(true);
      setError("");
      setResult(null);

      try {
        const res = await fetch("/api/qr/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: raw,
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
          qrType: data.data?.qrType,
        };
        setResult(scanResult);
        playScanFeedback(scanResult.status === "valid");
        if (!res.ok && data.error) setError(data.error);
        await loadEventData(historyPage);
      } catch {
        setError("Check-in failed. Please try again.");
        playScanFeedback(false);
      } finally {
        setProcessing(false);
      }
    },
    [eventId, gate, adminOverride, isAdmin, typeFilter, isOnline, loadEventData, historyPage, t]
  );

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
    e.target.value = "";
  }

  async function processUploadedFile(file: File) {
    setCameraError("");
    try {
      const text = await scanQrFromFile(file);
      await performCheckIn(text);
    } catch {
      setError("Could not read QR from image.");
      playScanFeedback(false);
    }
  }

  function statusLabel(status: ScanStatus) {
    const map: Record<ScanStatus, string> = {
      valid: t("qr_admission.result_valid"),
      invalid: t("qr_admission.result_invalid"),
      expired: t("qr_admission.result_expired"),
      already_checked_in: t("qr_admission.result_already"),
      not_found: t("qr_admission.result_not_found"),
      wrong_event: t("qr_admission.result_wrong_event"),
      revoked: "Revoked",
      refunded: "Refunded",
      cancelled: "Cancelled",
    };
    return map[status] ?? status;
  }

  function resultStyles(status: ScanStatus) {
    if (status === "valid") return "border-green-300 bg-green-50";
    if (status === "already_checked_in") return "border-amber-300 bg-amber-50";
    return "border-red-200 bg-red-50";
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
            <WifiOff className="h-3 w-3" /> Offline
          </Badge>
        )}
        <Link href="/dashboard/qr" className="text-xs text-slate-500 hover:text-brand-600 ml-auto">
          Offline package mode →
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
              disabled={!eventId || processing}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5" />
              {t("qr_admission.upload_image")}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFileUpload(e)} />
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
              "rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragOver ? "border-brand-500 bg-brand-50/50" : "border-slate-200 bg-slate-50/50",
              !eventId && "opacity-50 pointer-events-none"
            )}
          >
            <ImagePlus className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Drag & drop QR image here</p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG, or WebP</p>
          </div>

          {cameraError && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              {t("qr_admission.camera_denied")} ({cameraError})
            </p>
          )}

          <QrCameraScanner
            active={cameraOpen && !!eventId}
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
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste token or verification URL"
                disabled={processing}
              />
              <Button
                className="w-full min-h-[44px] touch-manipulation"
                disabled={!eventId || !manualToken.trim() || processing}
                onClick={() => void performCheckIn(manualToken)}
              >
                {processing ? "Checking in…" : "Verify & check in"}
              </Button>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {result && (
            <Card className={cn("border-2", resultStyles(result.status))}>
              <CardContent className="p-6 text-center space-y-3">
                {result.status === "valid" ? (
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                ) : result.status === "already_checked_in" ? (
                  <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                )}
                <Badge
                  variant={result.status === "valid" ? "success" : result.status === "already_checked_in" ? "warning" : "destructive"}
                  className="text-base px-4 py-1"
                >
                  {statusLabel(result.status)}
                </Badge>
                {result.guest && <p className="text-lg font-semibold text-slate-900">{result.guest.name}</p>}
                {result.ticket && <p className="text-sm text-slate-600">Ticket: {result.ticket.name}</p>}
                {result.event && <p className="text-xs text-slate-500">{result.event.title}</p>}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{t("qr_admission.recent_scans")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!eventId ? (
              <p className="text-sm text-slate-500 text-center py-8">{t("qr_admission.no_event")}</p>
            ) : loadingScans ? (
              <p className="text-sm text-slate-500 text-center py-8">Loading…</p>
            ) : recentScans.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">{t("qr_admission.no_scans")}</p>
            ) : (
              <ul className="space-y-2 max-h-[480px] overflow-y-auto">
                {recentScans.map((scan) => (
                  <li
                    key={scan.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {scan.guestName ?? scan.ticketName ?? "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {scan.gate ? `${scan.gate} · ` : ""}
                        {new Date(scan.createdAt).toLocaleString()}
                      </p>
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
                ))}
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
