"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { QrCode, ScanLine, Wifi, WifiOff, Download, Upload } from "lucide-react";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
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

export default function QrAdmissionPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [mode, setMode] = useState<Mode>("online");
  const [token, setToken] = useState("");
  const [gate, setGate] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ result: string; guest?: { name: string }; ticket?: { name: string }; name?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [offlinePkg, setOfflinePkg] = useState<OfflinePackage | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (eventId) setOfflinePkg(getOfflinePackage(eventId));
  }, [eventId]);

  async function verifyQr(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    if (mode === "offline" && eventId) {
      const validation = validateOfflineToken(eventId, token);
      recordOfflineScan(eventId, {
        qrToken: token,
        result: validation.result,
        guestId: validation.guestId,
        ticketId: validation.ticketId,
        scannedAt: new Date().toISOString(),
      });
      setResult({ result: validation.result, name: validation.name });
      setLoading(false);
      return;
    }

    const res = await fetch("/api/qr/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, eventId: eventId || undefined, gate }),
    });

    const data = await res.json();
    if (res.ok) setResult(data.data);
    else setError(data.error || "Verification failed");
    setLoading(false);
  }

  async function downloadPackage() {
    if (!eventId) return;
    setLoading(true);
    const res = await fetch(`/api/qr/offline?eventId=${eventId}`);
    const d = await res.json();
    if (res.ok) {
      saveOfflinePackage(eventId, d.data);
      setOfflinePkg(d.data);
      setSyncStatus(`Package downloaded — ${d.data.guests.length} guests, ${d.data.tickets.length} tickets`);
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
      markScansSynced(eventId, pending.map((s) => s.id));
      setSyncStatus(`Synced ${d.data.synced} scans (${d.data.conflicts} conflicts)`);
    } else {
      setError(d.error);
    }
    setLoading(false);
  }

  const resultColor = (r: string) => {
    const map: Record<string, "success" | "destructive" | "warning" | "outline"> = {
      VALID: "success",
      INVALID: "destructive",
      ALREADY_USED: "warning",
      EXPIRED: "destructive",
      WRONG_EVENT: "destructive",
    };
    return map[r] ?? "outline";
  };

  const resultBg = (r: string) => {
    if (r === "VALID") return "border-green-400 bg-green-50";
    if (r === "ALREADY_USED") return "border-yellow-400 bg-yellow-50";
    return "border-red-300 bg-red-50";
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Offline QR Package</h1>
          <p className="page-subtitle">Download event data for offline gate validation when connectivity is limited.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/qr-admission">← Camera scanner</Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {isOnline ? (
          <Badge variant="success" className="gap-1"><Wifi className="h-3 w-3" /> Online</Badge>
        ) : (
          <Badge variant="warning" className="gap-1"><WifiOff className="h-3 w-3" /> Offline</Badge>
        )}
        <div className="flex rounded-lg border overflow-hidden ml-auto">
          <button type="button" onClick={() => setMode("online")} className={`px-4 py-2 text-sm ${mode === "online" ? "bg-brand-600 text-white" : "bg-white"}`}>Online</button>
          <button type="button" onClick={() => setMode("offline")} className={`px-4 py-2 text-sm ${mode === "offline" ? "bg-brand-600 text-white" : "bg-white"}`}>Offline</button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      {mode === "offline" && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" /> Offline Package</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">Download guest and ticket data before the event for instant offline validation.</p>
            <Button onClick={downloadPackage} disabled={!eventId || loading} className="w-full">
              <Download className="h-4 w-4" /> Download Event Package
            </Button>
            {offlinePkg && (
              <p className="text-xs text-slate-500">
                Cached: {offlinePkg.guests.length} guests, {offlinePkg.tickets.length} tickets · {new Date(offlinePkg.syncedAt).toLocaleString()}
              </p>
            )}
            <div className="pt-3 border-t space-y-2">
              <Label>Register Admission Device</Label>
              <div className="flex gap-2">
                <Input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Gate Tablet A" />
                <Button type="button" variant="outline" onClick={registerDevice} disabled={!eventId}>Register</Button>
              </div>
              {deviceId && (
                <Button onClick={syncOffline} disabled={loading} className="w-full">
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
            <ScanLine className="h-5 w-5 text-brand-600" /> {mode === "offline" ? "Offline Scan" : "Verify QR Code"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={verifyQr} className="space-y-4">
            <div className="space-y-2">
              <Label>QR Token *</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Scan or paste QR token" required />
            </div>
            {mode === "online" && (
              <div className="space-y-2">
                <Label>Gate</Label>
                <Input value={gate} onChange={(e) => setGate(e.target.value)} placeholder="Gate A, Main Entrance..." />
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !eventId || (mode === "offline" && !offlinePkg)}>
              <QrCode className="h-4 w-4" />
              {loading ? "Verifying..." : mode === "offline" ? "Validate Offline" : "Verify & Check In"}
            </Button>
            {mode === "offline" && !offlinePkg && eventId && (
              <p className="text-xs text-amber-600 text-center">Download offline package first.</p>
            )}
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className={resultBg(result.result)}>
          <CardContent className="p-8 text-center">
            <Badge variant={resultColor(result.result)} className="text-xl px-6 py-2">
              {result.result.replace(/_/g, " ")}
            </Badge>
            {result.guest && <p className="mt-4 text-lg font-medium">Guest: {result.guest.name}</p>}
            {result.ticket && <p className="mt-2">Ticket: {result.ticket.name}</p>}
            {result.name && !result.guest && !result.ticket && <p className="mt-4 text-lg font-medium">{result.name}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
