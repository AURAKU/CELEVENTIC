"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { PaginationBar } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";

interface LogRow {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; email: string | null } | null;
}

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "PAYMENT", "WEBHOOK", "QR_SCAN", "SUSPEND"];

export function AdminAuditClient({ initial, initialTotal }: { initial: LogRow[]; initialTotal: number }) {
  const { page, setPage, resetPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT * 2);
  const [logs, setLogs] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const [pages, setPages] = useState(Math.max(1, Math.ceil(initialTotal / (ADMIN_TABLE_LIMIT * 2))));
  const [action, setAction] = useState("");

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams());
    if (action) params.set("action", action);
    const res = await fetch(`/api/admin/audit-logs?${params}`);
    const d = await res.json();
    if (d.success) {
      setLogs(d.data.logs);
      setTotal(d.data.total);
      setPages(Math.max(1, Math.ceil(d.data.total / (d.data.limit || ADMIN_TABLE_LIMIT * 2))));
    }
  }, [action, appendToParams]);

  useEffect(() => {
    resetPage();
  }, [action, resetPage]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Audit Logs"
        subtitle="Full activity trail for admin actions, payments, and security events."
        count={total}
        onRefresh={load}
      >
        <Select value={action || "all"} onValueChange={(v) => setAction(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </AdminToolbar>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y max-h-[70vh] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="p-8 text-center text-slate-500">No audit logs</p>
            ) : logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{log.action}</Badge>
                    <span className="font-medium">{log.user?.name ?? "System"}</span>
                    {log.entity && <span className="text-slate-500">{log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""}</span>}
                  </div>
                  <span className="text-slate-400 text-xs">{formatDate(log.createdAt)}</span>
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <pre className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            limit={ADMIN_TABLE_LIMIT * 2}
            onPageChange={setPage}
            className="p-4 border-t"
          />
        </CardContent>
      </Card>
    </div>
  );
}
