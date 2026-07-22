"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { PaginationBar } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { Download, Webhook } from "lucide-react";

interface PaymentRow {
  id: string;
  reference: string;
  amount: string;
  provider: string;
  purpose: string;
  status: string;
  createdAt: string;
  user: { name: string; email: string | null } | null;
}

interface PaymentLogRow {
  id: string;
  action: string;
  payload: unknown;
  createdAt: string;
  payment: {
    reference: string;
    status: string;
    purpose: string;
    baseAmount: string | number | null;
    displayCurrency: string | null;
    user: { name: string; email: string | null } | null;
  } | null;
}

interface ApiProvider {
  provider: string;
  isEnabled: boolean;
  envConfigured: boolean;
}

export function AdminPaymentsClient({ initial, initialTotal }: { initial: PaymentRow[]; initialTotal: number }) {
  const { page, setPage, resetPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [payments, setPayments] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const [pages, setPages] = useState(Math.max(1, Math.ceil(initialTotal / ADMIN_TABLE_LIMIT)));
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState<PaymentLogRow[]>([]);
  const [providers, setProviders] = useState<ApiProvider[]>([]);

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams());
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/payments?${params}`);
    const d = await res.json();
    if (d.success) {
      setPayments(d.data.payments);
      setTotal(d.data.total);
      setPages(Math.max(1, Math.ceil(d.data.total / (d.data.limit || ADMIN_TABLE_LIMIT))));
    }
  }, [status, appendToParams]);

  async function loadLogs() {
    const res = await fetch("/api/admin/payments/logs");
    const d = await res.json();
    if (d.success) setLogs(d.data);
  }

  async function loadProviders() {
    const res = await fetch("/api/admin/api-settings");
    const d = await res.json();
    if (d.success) setProviders(d.data.filter((p: ApiProvider) => ["PAYSTACK", "FLUTTERWAVE", "HUBTEL"].includes(p.provider)));
  }

  useEffect(() => {
    resetPage();
  }, [status, resetPage]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadLogs(); loadProviders(); }, []);

  async function toggleProvider(provider: string, isEnabled: boolean) {
    await fetch("/api/admin/api-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, isEnabled }),
    });
    loadProviders();
  }

  const successful = payments.filter((p) => p.status === "SUCCESSFUL");
  const revenue = successful.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Payment Settings"
        subtitle="Paystack, payment logs, webhook logs, reconciliation, and exports"
        count={total}
        onRefresh={() => { load(); loadLogs(); }}
      >
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="SUCCESSFUL">Successful</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/admin/payments/export" download>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </Button>
      </AdminToolbar>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {providers.map((p) => (
          <Card key={p.provider}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{p.provider}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {p.envConfigured ? "Key configured (env)" : "Key not in .env"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={p.isEnabled ? "default" : "outline"}
                  onClick={() => toggleProvider(p.provider, !p.isEnabled)}
                  disabled={!p.envConfigured && !p.isEnabled}
                >
                  {p.isEnabled ? "On" : "Off"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{total}</p><p className="text-xs text-slate-500">Total payments</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{successful.length}</p><p className="text-xs text-slate-500">Successful</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{formatCurrency(revenue)}</p><p className="text-xs text-slate-500">Filtered revenue</p></CardContent></Card>
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Payment Logs</TabsTrigger>
          <TabsTrigger value="webhooks">Webhook Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-slate-500">
                    <th className="p-3">Reference</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{p.reference}</td>
                      <td className="p-3">{p.user?.name ?? "—"}</td>
                      <td className="p-3 font-medium">{formatCurrency(p.amount)}</td>
                      <td className="p-3">{p.provider}</td>
                      <td className="p-3">{p.purpose.replace(/_/g, " ")}</td>
                      <td className="p-3">
                        <Badge variant={p.status === "SUCCESSFUL" ? "success" : p.status === "FAILED" ? "destructive" : "warning"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-500">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationBar
                page={page}
                pages={pages}
                total={total}
                limit={ADMIN_TABLE_LIMIT}
                onPageChange={setPage}
                className="p-4 border-t"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4 space-y-3">
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhook events from payment providers. Secrets are encrypted at rest in Admin → Integrations.
          </p>
          {logs.length === 0 ? (
            <p className="text-slate-500">No webhook logs yet.</p>
          ) : logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="pt-5 flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{log.action}</p>
                  {log.payment && (
                    <p className="text-xs text-slate-500 font-mono mt-1">{log.payment.reference} · {log.payment.status}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{formatDate(log.createdAt)}</p>
                </div>
                {log.payment?.user && (
                  <p className="text-sm text-slate-600">{log.payment.user.name}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
