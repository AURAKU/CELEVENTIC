"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  QrCode,
  ScanLine,
  Wifi,
  WifiOff,
  Download,
  Upload,
  Hash,
  Keyboard,
  Camera,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { AdmissionScanFeedback, type AdmissionFeedbackStatus } from "@/components/qr/admission-scan-feedback";
import { isManualAdmissionCode } from "@/lib/qr/manual-code-pattern";
import {
  saveOfflinePackage,
  getOfflinePackage,
  validateOfflineToken,
  recordOfflineScan,
  getPendingOfflineScans,
  markScansSynced,
  type OfflinePackage,
} from "@/lib/offline-qr-client";

type Mode = "online" | "offline";

interface VerifyResult {
  status: AdmissionFeedbackStatus;
  guest?: { id?: string; name: string } | null;
  ticket?: { name: string } | null;
  event?: { title: string } | null;
  selectedEventTitle?: string | null;
  admittedAt?: string | null;
  offline?: boolean;
  feedback?: string | null;
}

function statusLabel(status: AdmissionFeedbackStatus, result?: VerifyResult | null) {
  if (status === "valid") {
    if (result?.ticket) return "Ticket admitted";
    if (result?.guest) return "Guest admitted";
    return "Admitted successfully";
  }
  if (status === "already_checked_in") {
    if (result?.guest) return "Guest already admitted";
    if (result?.ticket) return "Ticket already admitted";
    return "Already admitted";
  }
  const map: Record<string, string> = {
    invalid: "Invalid code",
    expired: "Pass expired",
    not_found: "Code not found",
    wrong_event: "Wrong event — pass not valid here",
    wrong_pass: "Not an admission pass",
    revoked: "Revoked",
    refunded: "Refunded",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

export default function QrVerifyPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [mode, setMode] = useState<Mode>("online");
  const [token, setToken] = useState("");
  const [gate, setGate] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [offlinePkg, setOfflinePkg] = useState<OfflinePackage | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  const selectedEventTitle = useMemo(
    () => events.find((e) => e.id === eventId)?.title ?? null,
    [events, eventId]
  );

  const isFourDigit = isManualAdmissionCode(token.trim());

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
    if (eventId) setOfflinePkg(getOfflinePackage(eventId));
    else setOfflinePkg(null);
  }, [eventId]);

  // Prefer offline mode automatically when the network drops and a pack exists
  useEffect(() => {
    if (!isOnline && eventId && getOfflinePackage(eventId)) setMode("offline");
  }, [isOnline, eventId]);

  function normalizeTokenInput(raw: string) {
    const v = raw.trim();
    // Fast path for gate staff typing the guest’s 4-digit code
    if (/^\d{0,4}$/.test(v)) return v.replace(/\D/g, "").slice(0, 4);
    return v;
  }

  async function verifyQr(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) {
      setError("Select an event first — 4-digit codes are unique per event.");
      return;
    }

    const trimmed = token.trim();
    if (!trimmed) {
      setError("Enter the guest’s 4-digit gate code, or paste a QR token / verify URL.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const useOffline = mode === "offline" || !isOnline;

    if (useOffline) {
      const pkg = getOfflinePackage(eventId);
      if (!pkg) {
        setError("No offline package for this event. Connect once and download the pack.");
        setLoading(false);
        return;
      }

      const validation = validateOfflineToken(eventId, trimmed);
      recordOfflineScan(eventId, {
        qrToken: validation.syncToken ?? trimmed,
        result: validation.result,
        guestId: validation.guestId,
        ticketId: validation.ticketId,
        scannedAt: new Date().toISOString(),
      });

      const status: AdmissionFeedbackStatus =
        validation.result === "VALID"
          ? "valid"
          : validation.result === "ALREADY_USED"
            ? "already_checked_in"
            : "invalid";

      const name = validation.name;
      const feedback =
        status === "valid"
          ? name
            ? `Welcome, ${name}! You are admitted to ${selectedEventTitle ?? "this event"}. Enjoy the celebration.`
            : `Welcome! You are admitted to ${selectedEventTitle ?? "this event"}.`
          : status === "already_checked_in"
            ? `${name ?? "This guest"} was already admitted. This scan was not counted again.`
            : isFourDigit
              ? "This 4-digit code is not in the offline pack for this event. Confirm the event, or refresh the pack online."
              : "No matching pass in the offline package for this event.";

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
      setLoading(false);
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
        }),
      });
      const data = await res.json();
      const payload = data.data as VerifyResult | undefined;

      if (!payload && !res.ok) {
        setError(data.error || "Verification failed");
        setLoading(false);
        return;
      }

      setResult({
        status: (data.status as AdmissionFeedbackStatus) ?? payload?.status ?? "invalid",
        guest: payload?.guest ?? null,
        ticket: payload?.ticket ?? null,
        event: payload?.event ?? null,
        selectedEventTitle: payload?.selectedEventTitle ?? selectedEventTitle,
        admittedAt: payload?.admittedAt ?? null,
        feedback: payload?.feedback ?? (data.error || null),
      });
      if (!res.ok && data.error && !payload?.feedback) setError(data.error);
    } catch {
      if (getOfflinePackage(eventId)) {
        setMode("offline");
        setError("Network failed — switch to Offline and try again with the downloaded pack.");
      } else {
        setError("Check-in failed. Download an offline pack while online to keep the gate moving.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function downloadPackage() {
    if (!eventId) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/qr/offline?eventId=${eventId}`);
    const d = await res.json();
    if (res.ok) {
      saveOfflinePackage(eventId, d.data);
      setOfflinePkg(d.data);
      setSyncStatus(
        `Package ready — ${d.data.guests.length} guests (with 4-digit codes), ${d.data.tickets.length} tickets`
      );
    } else {
      setError(d.error);
    }
    setLoading(false);
  }

  async function registerDevice() {
    if (!eventId || !deviceName) return;
    const res = await fetch("/api/qr/offline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", eventId, deviceName }),
    });
    const d = await res.json();
    if (res.ok) {
      setDeviceId(d.data.id);
      setSyncStatus(`Device registered: ${d.data.deviceName}`);
    } else {
      setError(d.error);
    }
  }

  async function syncOffline() {
    if (!deviceId || !eventId) return;
    const pending = getPendingOfflineScans(eventId);
    if (pending.length === 0) {
      setSyncStatus("No pending scans to sync");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/qr/offline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk_checkin",
        deviceId,
        checkins: pending.map((s) => ({
          qrToken: s.qrToken,
          result: s.result as "VALID" | "INVALID" | "ALREADY_USED",
          guestId: s.guestId,
          ticketId: s.ticketId,
        })),
      }),
    });
    const d = await res.json();
    if (res.ok) {
      markScansSynced(
        eventId,
        pending.map((s) => s.id)
      );
      setSyncStatus(`Synced ${d.data.synced} scans (${d.data.conflicts} conflicts)`);
    } else {
      setError(d.error);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Gate verify & offline pack</h1>
          <p className="page-subtitle">
            Admit with each guest’s unique 4-digit gate code, QR token, or offline package when the network drops.
          </p>
        </div>
        <Link
          href="/dashboard/qr-admission"
          className="group relative inline-flex shrink-0 items-center gap-3 overflow-hidden rounded-2xl bg-brand-600 px-4 py-3 text-white shadow-lg shadow-brand-600/25 transition-all duration-200 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 transition-transform duration-200 group-hover:scale-105">
            <Camera className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-left leading-tight pr-1">
            <span className="block text-sm font-semibold tracking-tight">Scan guest here</span>
            <span className="block text-[11px] font-medium text-white/80">Admit their pass at the gate</span>
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 opacity-80 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>

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
        <div className="flex rounded-lg border overflow-hidden ml-auto">
          <button
            type="button"
            onClick={() => setMode("online")}
            className={`px-4 py-2 text-sm ${mode === "online" ? "bg-brand-600 text-white" : "bg-white"}`}
          >
            Online
          </button>
          <button
            type="button"
            onClick={() => setMode("offline")}
            className={`px-4 py-2 text-sm ${mode === "offline" ? "bg-brand-600 text-white" : "bg-white"}`}
          >
            Offline
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
          <p className="text-xs text-slate-500 mt-2">
            Event is required — each celebration has its own set of 4-digit gate codes.
          </p>
        </CardContent>
      </Card>

      {mode === "offline" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" /> Offline Package
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Download guest admission tokens and 4-digit codes before the event for instant offline validation.
            </p>
            <Button onClick={() => void downloadPackage()} disabled={!eventId || loading} className="w-full">
              <Download className="h-4 w-4" /> Download Event Package
            </Button>
            {offlinePkg && (
              <p className="text-xs text-slate-500">
                Cached: {offlinePkg.guests.length} guests, {offlinePkg.tickets.length} tickets ·{" "}
                {new Date(offlinePkg.syncedAt).toLocaleString()}
              </p>
            )}
            <div className="pt-3 border-t space-y-2">
              <Label>Register Admission Device</Label>
              <div className="flex gap-2">
                <Input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Gate Tablet A"
                />
                <Button type="button" variant="outline" onClick={() => void registerDevice()} disabled={!eventId}>
                  Register
                </Button>
              </div>
              {deviceId && (
                <Button onClick={() => void syncOffline()} disabled={loading} className="w-full">
                  <Upload className="h-4 w-4" /> Sync Pending Scans
                </Button>
              )}
            </div>
            {syncStatus && <p className="text-sm text-brand-600">{syncStatus}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-brand-600" />
            {mode === "offline" ? "Offline admit" : "Verify gate code"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void verifyQr(e)} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-brand-600" />
                Gate code / QR token *
              </Label>
              <Input
                value={token}
                onChange={(e) => setToken(normalizeTokenInput(e.target.value))}
                placeholder="4-digit code (e.g. 4821) or paste QR token"
                inputMode={isFourDigit || token === "" ? "numeric" : "text"}
                autoComplete="one-time-code"
                maxLength={isFourDigit || /^\d*$/.test(token) ? 4 : 256}
                className={
                  isFourDigit
                    ? "font-mono text-2xl tracking-[0.35em] text-center h-14"
                    : undefined
                }
                required
              />
              <p className="text-xs text-slate-500 flex items-start gap-1.5">
                <Keyboard className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Guests see this unique 4-digit code under their invitation. Enter it here when scanning isn’t
                practical — works online and offline.
              </p>
            </div>
            {mode === "online" && (
              <div className="space-y-2">
                <Label>Gate</Label>
                <Input
                  value={gate}
                  onChange={(e) => setGate(e.target.value)}
                  placeholder="Gate A, Main Entrance..."
                />
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              type="submit"
              className="w-full min-h-[48px]"
              disabled={loading || !eventId || (mode === "offline" && !offlinePkg)}
            >
              <QrCode className="h-4 w-4" />
              {loading
                ? "Verifying…"
                : mode === "offline"
                  ? "Validate & admit offline"
                  : "Verify & Check In"}
            </Button>
            {mode === "offline" && !offlinePkg && eventId && (
              <p className="text-xs text-amber-600 text-center">Download offline package first.</p>
            )}
          </form>
        </CardContent>
      </Card>

      {result && (
        <AdmissionScanFeedback result={result} statusLabel={statusLabel(result.status, result)} />
      )}
    </div>
  );
}
