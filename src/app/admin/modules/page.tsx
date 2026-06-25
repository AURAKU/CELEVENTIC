"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Wallet, QrCode, Heart, Archive } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ModulesData {
  aiPlanner: {
    totalRequests: number;
    activeProvider: string;
    recent: { module: string; provider: string; createdAt: string; user: { name: string } }[];
  };
  wallet: { totalWallets: number; totalRevenue: number; totalExpenses: number; totalBalance: number };
  offlineQr: {
    devices: number;
    checkins: number;
    deviceList: { id: string; deviceName: string; isAuthorized: boolean; user: { name: string }; event: { title: string } }[];
    syncLogs: { records: number; conflicts: number; createdAt: string; device: { deviceName: string } }[];
  };
  funeral: {
    profiles: number;
    pendingTributes: number;
    tributeList: { id: string; userName: string; message: string; event: { title: string; slug: string } }[];
  };
  memory: { vaults: number; items: number };
  recentScans: { result: string; createdAt: string; event: { title: string } }[];
}

export default function AdminModulesPage() {
  const [data, setData] = useState<ModulesData | null>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("mock");

  const load = useCallback(() => {
    fetch("/api/admin/modules")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
          setProvider(d.data.aiPlanner.activeProvider);
        } else setError(d.error);
      });
  }, []);

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
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {data.offlineQr.deviceList.length === 0 ? (
              <p className="text-sm text-slate-500">No devices registered.</p>
            ) : data.offlineQr.deviceList.map((d) => (
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pending Tributes</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {data.funeral.tributeList.length === 0 ? (
              <p className="text-sm text-slate-500">No pending tributes.</p>
            ) : data.funeral.tributeList.map((t) => (
              <div key={t.id} className="text-sm py-2 border-b">
                <p className="font-medium">{t.userName} · {t.event.title}</p>
                <p className="text-slate-600 truncate">{t.message}</p>
                <div className="flex gap-2 mt-1">
                  <Button size="sm" onClick={() => adminAction({ action: "moderate_tribute", tributeId: t.id, status: "APPROVED" })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => adminAction({ action: "moderate_tribute", tributeId: t.id, status: "REJECTED" })}>Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent QR Scans</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-64 overflow-y-auto">
            {data.recentScans.map((s, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b">
                <span>{s.event.title} · {s.result}</span>
                <span className="text-slate-500 text-xs">{new Date(s.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Intelligence Requests</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-64 overflow-y-auto">
            {data.aiPlanner.recent.map((r, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b">
                <span>{r.user.name} · {r.provider}</span>
                <span className="text-slate-500 text-xs">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
