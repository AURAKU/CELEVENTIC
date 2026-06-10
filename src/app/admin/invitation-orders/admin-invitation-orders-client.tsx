"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Archive, Truck, MessageSquare, User, Package, CreditCard, ExternalLink,
} from "lucide-react";

interface Designer { id: string; name: string; email: string | null }
interface AdminOrder {
  id: string;
  status: string;
  productionStatus: string;
  workflowType?: string;
  workflowStage?: string;
  previewUrl?: string | null;
  eventTitle: string | null;
  eventType: string;
  templateSlug: string;
  packageSlug: string;
  totalAmountGhs: string | number;
  shareUrl: string | null;
  hostName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  addonSlugs: string[] | null;
  adminNotes: string | null;
  missingInfoRequest: string | null;
  revisionsUsed: number;
  createdAt: string;
  user: { id: string; name: string; email: string | null; phone: string | null };
  package: { name: string; revisions: number };
  payment: { status: string; reference: string; baseAmount?: string; displayCurrency?: string } | null;
  assignedDesigner: { id: string; name: string } | null;
}

const STATUSES = ["DRAFT", "PENDING_PAYMENT", "PAID", "IN_PRODUCTION", "REVISION_REQUESTED", "APPROVED", "PUBLISHED", "ARCHIVED"];
const PRODUCTION = ["NOT_STARTED", "ASSIGNED", "DESIGNING", "AWAITING_CUSTOMER_INFO", "AWAITING_APPROVAL", "REVISION", "APPROVED", "DELIVERED"];

function statusVariant(s: string) {
  if (["PUBLISHED", "PAID", "APPROVED", "DELIVERED"].includes(s)) return "success" as const;
  if (["PENDING_PAYMENT", "REVISION_REQUESTED", "AWAITING_CUSTOMER_INFO"].includes(s)) return "warning" as const;
  if (s === "ARCHIVED") return "outline" as const;
  return "default" as const;
}

export function AdminInvitationOrdersClient() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [productionFilter, setProductionFilter] = useState("");
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [missingInfo, setMissingInfo] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (productionFilter) params.set("productionStatus", productionFilter);
    const res = await fetch(`/api/admin/invitation-orders?${params}`);
    const d = await res.json();
    if (d.success) {
      setOrders(d.data.map((o: AdminOrder) => ({
        ...o,
        addonSlugs: Array.isArray(o.addonSlugs) ? o.addonSlugs : null,
      })));
      setDesigners(d.designers ?? []);
    }
  }, [search, statusFilter, productionFilter]);

  useEffect(() => { load(); }, [load]);

  async function patchOrder(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/invitation-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
    if (selected?.id === id) {
      const res = await fetch(`/api/admin/invitation-orders?search=${selected.eventTitle ?? ""}`);
      const d = await res.json();
      const updated = d.data?.find((o: AdminOrder) => o.id === id);
      if (updated) setSelected({ ...updated, addonSlugs: Array.isArray(updated.addonSlugs) ? updated.addonSlugs : null });
    }
  }

  async function productionAction(body: Record<string, unknown>) {
    if (!selected) return;
    await fetch(`/api/admin/invitation-orders/${selected.id}/production`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  function openDetail(order: AdminOrder) {
    setSelected(order);
    setMissingInfo(order.missingInfoRequest ?? "");
    setAdminNotes(order.adminNotes ?? "");
    setPreviewUrl(order.previewUrl ?? "");
  }

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Invitation Orders"
        subtitle="View, assign, produce, and deliver invitation orders"
        count={orders.length}
        search={search}
        onSearchChange={setSearch}
        onRefresh={load}
      >
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={productionFilter || "all"} onValueChange={(v) => setProductionFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Production" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All production</SelectItem>
            {PRODUCTION.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </AdminToolbar>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {orders.length === 0 ? (
            <p className="text-slate-500 py-8 text-center">No orders match your filters.</p>
          ) : orders.map((order) => (
            <Card
              key={order.id}
              className={`cursor-pointer transition-all hover:border-[#0B8A83]/50 ${selected?.id === order.id ? "border-[#0B8A83] ring-1 ring-[#0B8A83]/20" : ""}`}
              onClick={() => openDetail(order)}
            >
              <CardContent className="pt-5 flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-semibold">{order.eventTitle ?? "Untitled"}</p>
                  <p className="text-sm text-slate-500">{order.user.name} · {order.package.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                  <Badge variant="outline">{order.workflowStage ?? order.productionStatus}</Badge>
                  <span className="font-bold text-[#0B8A83]">{formatCurrency(Number(order.totalAmountGhs))}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          {selected ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selected.eventTitle ?? "Order Detail"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="overview">
                  <TabsList className="w-full">
                    <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                    <TabsTrigger value="actions" className="flex-1">Actions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-3 mt-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600"><User className="h-4 w-4" /> {selected.user.name}</div>
                    <p className="text-slate-500">{selected.user.email} · {selected.user.phone}</p>
                    <div className="flex items-center gap-2"><Package className="h-4 w-4" /> {selected.package.name} · {selected.templateSlug}</div>
                    {selected.addonSlugs && selected.addonSlugs.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selected.addonSlugs.map((a) => <Badge key={a} variant="outline">{a}</Badge>)}
                      </div>
                    )}
                    {selected.payment && (
                      <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> {selected.payment.reference} — {selected.payment.status}</div>
                    )}
                    <p>Workflow: {selected.workflowType?.replace(/_/g, " ") ?? "—"} · {selected.workflowStage?.replace(/_/g, " ") ?? selected.productionStatus}</p>
                    <p>Revisions: {selected.revisionsUsed} / {selected.package.revisions}</p>
                    {selected.shareUrl && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={selected.shareUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" /> View Published
                        </a>
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="actions" className="space-y-3 mt-4">
                    <div>
                      <Label className="text-xs">Assign Designer</Label>
                      <Select
                        value={selected.assignedDesigner?.id ?? "none"}
                        onValueChange={(v) => productionAction({
                          action: "assign_designer",
                          designerId: v === "none" ? undefined : v,
                        })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {designers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={selected.status} onValueChange={(v) => patchOrder(selected.id, { status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Production</Label>
                      <Select value={selected.productionStatus} onValueChange={(v) => patchOrder(selected.id, { productionStatus: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PRODUCTION.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Request Missing Info</Label>
                      <Textarea rows={2} value={missingInfo} onChange={(e) => setMissingInfo(e.target.value)} placeholder="What does the customer need to provide?" />
                      <Button size="sm" className="mt-2" variant="outline" onClick={() => productionAction({ action: "missing_info", notes: missingInfo })}>
                        <MessageSquare className="h-3 w-3" /> Send Request
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs">Preview URL</Label>
                      <Textarea rows={1} value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://..." />
                      <Button size="sm" className="mt-2" variant="outline" onClick={() => productionAction({ action: "upload_preview", previewUrl })}>
                        Upload Preview
                      </Button>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => productionAction({ action: "send_approval" })}>
                      Send for Customer Approval
                    </Button>
                    <div>
                      <Label className="text-xs">Admin Notes</Label>
                      <Textarea rows={2} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
                      <Button size="sm" className="mt-2" variant="outline" onClick={() => patchOrder(selected.id, { adminNotes })}>Save Notes</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" onClick={() => productionAction({ action: "deliver", shareUrl: selected.shareUrl ?? undefined })}>
                        <Truck className="h-3 w-3" /> Deliver Final Link
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => productionAction({ action: "archive" })}>
                        <Archive className="h-3 w-3" /> Archive
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="pt-6 text-center text-slate-500 text-sm">Select an order to view details and take action.</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
