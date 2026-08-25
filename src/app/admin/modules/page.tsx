"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Wallet, QrCode, Heart, Archive } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination";
import type { PaginatedResult } from "@/lib/pagination";

type AiRequestRow = {
  module: string;
  provider: string;
  createdAt: string;
  user: { name: string };
};

type DeviceRow = {
  id: string;
  deviceName: string;
  isAuthorized: boolean;
  user: { name: string };
  event: { title: string };
};

type TributeRow = {
  id: string;
  userName: string;
  message: string;
  event: { title: string; slug: string };
};

type ScanRow = {
  result: string;
  createdAt: string;
  event: { title: string };
};

type SyncLogRow = {
  records: number;
  conflicts: number;
  createdAt: string;
  device: { deviceName: string };
};

interface ModulesData {
  aiPlanner: {
    totalRequests: number;
    activeProvider: string;
    recent: PaginatedResult<AiRequestRow>;
  };
  wallet: { totalWallets: number; totalRevenue: number; totalExpenses: number; totalBalance: number };
  offlineQr: {
    devices: number;
    checkins: number;
    deviceList: PaginatedResult<DeviceRow>;
    syncLogs: PaginatedResult<SyncLogRow>;
  };
  funeral: {
    profiles: number;
    pendingTributes: number;
    tributeList: PaginatedResult<TributeRow>;
  };
  memory: { vaults: number; items: number };
  recentScans: PaginatedResult<ScanRow>;
}

const AI_LIMIT = 15;
const DEVICE_LIMIT = 20;
const TRIBUTE_LIMIT = 20;
const SCAN_LIMIT = 20;
const SYNC_LIMIT = 10;

export default function AdminModulesPage() {
  const [data, setData] = useState<ModulesData | null>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("mock");
  const [aiPage, setAiPage] = useState(1);
  const [devicePage, setDevicePage] = useState(1);
  const [tributePage, setTributePage] = useState(1);
  const [scanPage, setScanPage] = useState(1);
  const [syncPage, setSyncPage] = useState(1);

  const load = useCallback(() => {
    const params = new URLSearchParams({
      aiPage: String(aiPage),
      aiLimit: String(AI_LIMIT),
      devicePage: String(devicePage),
      deviceLimit: String(DEVICE_LIMIT),
      tributePage: String(tributePage),
      tributeLimit: String(TRIBUTE_LIMIT),
      scanPage: String(scanPage),
      scanLimit: String(SCAN_LIMIT),
      syncPage: String(syncPage),
      syncLimit: String(SYNC_LIMIT),
    });
    fetch(`/api/admin/modules?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
          setProvider(d.data.aiPlanner.activeProvider);
        } else setError(d.error);
      });
  }, [aiPage, devicePage, tributePage, scanPage, syncPage]);

  useEffect(() => { load(); }, [load]);

  async function adminAction(body: Record<string, unknown>) {
    await fetch("/api/admin/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Loading module stats...</p>;

  const aiRecent = data.aiPlanner.recent;
  const devices = data.offlineQr.deviceList;
  const tributes = data.funeral.tributeList;
  const scans = data.recentScans;
  const syncLogs = data.offlineQr.syncLogs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">EventOS Modules</h1>
        <p className="page-subtitle">Monitor and manage Event Intelligence, Wallet, Offline QR, FuneralOS, and Memory Vault.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-gold-400" /> Event Intelligence</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.aiPlanner.totalRequests}</p>
            <p className="text-xs text-slate-500 mb-3">requests · provider: {data.aiPlanner.activeProvider}</p>
            <div className="flex gap-2">
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => adminAction({ action: "set_ai_provider", provider })}>Set</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Wallet</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.wallet.totalWallets}</p>
            <p className="text-xs text-slate-500">{formatCurrency(data.wallet.totalRevenue)} revenue · {formatCurrency(data.wallet.totalExpenses)} expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><QrCode className="h-4 w-4" /> Offline QR</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.offlineQr.devices}</p>
            <p className="text-xs text-slate-500">{data.offlineQr.checkins} offline check-ins</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4" /> FuneralOS</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.funeral.profiles}</p>
            <p className="text-xs text-slate-500">{data.funeral.pendingTributes} pending tributes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Archive className="h-4 w-4" /> Memory Vault</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.memory.vaults}</p>
            <p className="text-xs text-slate-500">{data.memory.items} archived items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Platform Balance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.wallet.totalBalance)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Admission Devices</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2 max-h-64 overflow-y-auto">
            {devices.items.length === 0 ? (
              <p className="text-sm text-slate-500">No devices registered.</p>
            ) : devices.items.map((d) => (
              <div key={d.id} className="flex justify-between items-center text-sm py-2 border-b gap-2">
                <div>
                  <p className="font-medium">{d.deviceName}</p>
                  <p className="text-xs text-slate-500">{d.event.title} · {d.user.name}</p>
                </div>
                {d.isAuthorized ? (
                  <Button size="sm" variant="outline" onClick={() => adminAction({ action: "revoke_device", deviceId: d.id })}>Revoke</Button>
                ) : (
                  <span className="text-xs text-red-500">Revoked</span>
                )}
              </div>
            ))}
            </div>
            <PaginationBar
              page={devices.page}
              pages={devices.pages}
              total={devices.total}
              limit={devices.limit}
              onPageChange={setDevicePage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pending Tributes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2 max-h-64 overflow-y-auto">
            {tributes.items.length === 0 ? (
              <p className="text-sm text-slate-500">No pending tributes.</p>
            ) : tributes.items.map((t) => (
              <div key={t.id} className="text-sm py-2 border-b">
                <p className="font-medium">{t.userName} · {t.event.title}</p>
                <p className="text-slate-600 truncate">{t.message}</p>
                <div className="flex gap-2 mt-1">
                  <Button size="sm" onClick={() => adminAction({ action: "moderate_tribute", tributeId: t.id, status: "APPROVED" })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => adminAction({ action: "moderate_tribute", tributeId: t.id, status: "REJECTED" })}>Reject</Button>
                </div>
              </div>
            ))}
            </div>
            <PaginationBar
              page={tributes.page}
              pages={tributes.pages}
              total={tributes.total}
              limit={tributes.limit}
              onPageChange={setTributePage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent QR Scans</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="space-y-1 max-h-64 overflow-y-auto">
            {scans.items.length === 0 ? (
              <p className="text-sm text-slate-500">No scans recorded.</p>
            ) : scans.items.map((s, i) => (
              <div key={`${s.createdAt}-${i}`} className="flex justify-between text-sm py-1 border-b">
                <span>{s.event.title} · {s.result}</span>
                <span className="text-slate-500 text-xs">{new Date(s.createdAt).toLocaleString()}</span>
              </div>
            ))}
            </div>
            <PaginationBar
              page={scans.page}
              pages={scans.pages}
              total={scans.total}
              limit={scans.limit}
              onPageChange={setScanPage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Intelligence Requests</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="space-y-1 max-h-64 overflow-y-auto">
            {aiRecent.items.length === 0 ? (
              <p className="text-sm text-slate-500">No AI requests yet.</p>
            ) : aiRecent.items.map((r, i) => (
              <div key={`${r.createdAt}-${i}`} className="flex justify-between text-sm py-1 border-b">
                <span>{r.user.name} · {r.provider}</span>
                <span className="text-slate-500 text-xs">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
            ))}
            </div>
            <PaginationBar
              page={aiRecent.page}
              pages={aiRecent.pages}
              total={aiRecent.total}
              limit={aiRecent.limit}
              onPageChange={setAiPage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Offline Sync Logs</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="space-y-1 max-h-64 overflow-y-auto">
            {syncLogs.items.length === 0 ? (
              <p className="text-sm text-slate-500">No sync logs yet.</p>
            ) : syncLogs.items.map((log, i) => (
              <div key={`${log.createdAt}-${i}`} className="flex justify-between text-sm py-1 border-b gap-2">
                <span className="min-w-0 truncate">{log.device.deviceName} · {log.records} records{log.conflicts > 0 ? ` · ${log.conflicts} conflicts` : ""}</span>
                <span className="text-slate-500 text-xs shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
            </div>
            <PaginationBar
              page={syncLogs.page}
              pages={syncLogs.pages}
              total={syncLogs.total}
              limit={syncLogs.limit}
              onPageChange={setSyncPage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
