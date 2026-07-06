"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { CHANGE_CATEGORY_LABELS } from "@/lib/invitation-production/constants";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";

interface RevisionRow {
  id: string;
  revisionNumber: number;
  revisionType: string;
  changeCategory: string;
  status: string;
  notes: string | null;
  adminResponse: string | null;
  isExtraPaid: boolean;
  amountGhs: string | number | null;
  customerApproved: boolean;
  requestedAt: string;
  invitationOrder: {
    id: string;
    eventTitle: string | null;
    revisionsUsed: number;
    package: { name: string; revisions: number };
    user: { name: string; email: string | null };
  };
}

export function AdminRevisionsClient() {
  const { page, setPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [adminResponse, setAdminResponse] = useState("");
  const [chargeAmount, setChargeAmount] = useState(79);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams());
    const res = await fetch(`/api/admin/invitation-revisions?${params}`);
    const d = await res.json();
    if (d.success) {
      setRevisions(d.data.items ?? []);
      setTotal(d.data.total ?? 0);
      setPages(d.data.pages ?? 1);
    }
  }, [appendToParams]);

  useEffect(() => { load(); }, [load]);

  async function productionUpdate(orderId: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/invitation-orders/${orderId}/production`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <AdminToolbar title="Revision Management" subtitle="Track revisions, charge extras, and manage approvals" count={total} onRefresh={load} />

      <div className="space-y-3">
        {revisions.length === 0 ? (
          <p className="text-slate-500">No revision requests yet.</p>
        ) : revisions.map((r) => (
          <Card key={r.id} className={selectedId === r.id ? "border-[#0B8A83]" : ""}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="font-semibold">{r.invitationOrder.eventTitle ?? "Untitled"}</p>
                  <p className="text-sm text-slate-500">{r.invitationOrder.user.name} · Rev #{r.revisionNumber}</p>
                  <p className="text-xs text-slate-400">
                    {CHANGE_CATEGORY_LABELS[r.changeCategory]} · {r.revisionType} · Included: {r.invitationOrder.package.revisions} · Used: {r.invitationOrder.revisionsUsed}
                  </p>
                  {r.notes && <p className="text-sm mt-2 text-slate-600">{r.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge>{r.status}</Badge>
                  {r.isExtraPaid && r.amountGhs && <span className="text-sm font-bold">{formatCurrency(Number(r.amountGhs))}</span>}
                  {r.customerApproved && <Badge variant="success">Customer Approved</Badge>}
                </div>
              </div>

              {r.adminResponse && <p className="text-sm bg-slate-50 p-2 rounded-lg">Response: {r.adminResponse}</p>}

              {selectedId === r.id ? (
                <div className="border-t pt-3 space-y-2">
                  <div>
                    <Label className="text-xs">Admin Response</Label>
                    <Textarea rows={2} value={adminResponse} onChange={(e) => setAdminResponse(e.target.value)} />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div>
                      <Label className="text-xs">Charge (GHS)</Label>
                      <Input type="number" value={chargeAmount} onChange={(e) => setChargeAmount(parseFloat(e.target.value))} className="w-24" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status === "REQUESTED" && (
                      <Button size="sm" variant="outline" onClick={() => productionUpdate(r.invitationOrder.id, {
                        action: "update_revision", revisionId: r.id, revisionStatus: "IN_PROGRESS", adminResponse,
                      })}>Start Work</Button>
                    )}
                    {r.status === "IN_PROGRESS" && (
                      <Button size="sm" variant="outline" onClick={() => productionUpdate(r.invitationOrder.id, {
                        action: "update_revision", revisionId: r.id, revisionStatus: "AWAITING_APPROVAL", adminResponse,
                      })}>Send for Approval</Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => productionUpdate(r.invitationOrder.id, {
                      action: "update_revision", revisionId: r.id, chargeAmount, adminResponse,
                    })}>Charge Extra</Button>
                    <Button size="sm" onClick={() => productionUpdate(r.invitationOrder.id, {
                      action: "update_revision", revisionId: r.id, revisionStatus: "COMPLETED", adminResponse,
                    })}>Mark Complete</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setSelectedId(r.id); setAdminResponse(r.adminResponse ?? ""); }}>
                  Manage Revision
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <PaginationBar page={page} pages={pages} total={total} limit={ADMIN_TABLE_LIMIT} onPageChange={setPage} />
    </div>
  );
}
