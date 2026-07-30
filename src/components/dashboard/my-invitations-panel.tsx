"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Copy, Check, ExternalLink, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination";
import { formatCurrency } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { isStudioUnlocked, isLiveInvitation } from "@/lib/invitation/studio-access";

interface OrderRow {
  id: string;
  status: string;
  productionStatus: string;
  eventTitle: string | null;
  templateSlug: string;
  packageSlug: string;
  totalAmountGhs: string | number;
  shareUrl: string | null;
  template: { name: string } | null;
  package: { name: string } | null;
  payment: { status: string; reference: string } | null;
}

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function MyInvitationsPanel() {
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user?.role);
  const { page, setPage, appendToParams } = usePagination(10);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = appendToParams(new URLSearchParams());
    const res = await fetch(`/api/invitation-orders?${params}`);
    const d = await res.json();
    if (d.success) {
      setOrders(d.data.items ?? []);
      setTotal(d.data.total ?? 0);
      setPages(d.data.pages ?? 1);
    }
    setLoading(false);
  }, [appendToParams]);

  useEffect(() => {
    load();
  }, [load]);

  async function copyUrl(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleDelete(order: OrderRow) {
    if (!isAdmin) return;
    const label = order.eventTitle ?? order.template?.name ?? "this invitation";
    const liveNote = isLiveInvitation(order)
      ? " This removes the live guest link and published Studio invitation."
      : "";
    if (
      !window.confirm(
        `Permanently delete "${label}" from the Invitation Store?${liveNote} This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(order.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/invitation-orders/${encodeURIComponent(order.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete invitation order");
      }

      setOrders((prev) => prev.filter((row) => row.id !== order.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setFeedback({ type: "ok", message: `"${label}" permanently deleted.` });

      // Reload when the current page may be empty after the removal.
      if (orders.length <= 1 && page > 1) {
        setPage(page - 1);
      } else {
        void load();
      }
    } catch (err) {
      setFeedback({
        type: "err",
        message: err instanceof Error ? err.message : "Delete failed",
      });
    } finally {
      setDeletingId(null);
    }
  }

  const statusColor = (s: string) => {
    if (s === "PUBLISHED") return "success";
    if (s === "PAID" || s === "IN_PRODUCTION") return "secondary";
    if (s === "PENDING_PAYMENT") return "outline";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Invitation Store</h2>
          <p className="text-slate-500 mt-1 text-sm">Track orders, payments, RSVP links, and production status.</p>
        </div>
        <Button asChild className="bg-[#0B8A83] hover:bg-[#097068]">
          <Link href="/invitations/catalogue"><Plus className="h-4 w-4" /> New Invitation</Link>
        </Button>
      </div>

      {feedback && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            feedback.type === "ok"
              ? "bg-brand-50 text-brand-800 border border-brand-200/60"
              : "bg-red-50 text-red-700 border border-red-200/60"
          }`}
          role="status"
        >
          {feedback.message}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-slate-500">No invitation orders yet.</p>
            <Button className="mt-4" asChild><Link href="/invitations">Browse Invitation Store</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {orders.map((order) => {
              const deleting = deletingId === order.id;
              return (
                <Card key={order.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{order.eventTitle ?? order.template?.name ?? "Your Invitation"}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">{order.template?.name ?? ", "} · {order.package?.name ?? ", "}</p>
                    </div>
                    <Badge variant={statusColor(order.status) as "success" | "secondary" | "outline"}>{order.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <span>Production: <strong>{order.productionStatus}</strong></span>
                      <span>Total: <strong>{formatCurrency(Number(order.totalAmountGhs))}</strong></span>
                      {order.payment && <span>Payment: <strong>{order.payment.status}</strong></span>}
                    </div>
                    {order.shareUrl && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyUrl(order.shareUrl!, order.id)}>
                          {copied === order.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          Copy Link
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={order.shareUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" /> View
                          </a>
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/my-invitations/${order.id}`}>Production Tracker</Link>
                      </Button>
                      {isStudioUnlocked(order.status) ? (
                        <>
                          <Button size="sm" asChild>
                            <Link href={`/invitations/create/${order.id}/studio`}>
                              {isLiveInvitation(order) ? "Edit Live Invitation" : "Open Studio"}
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/invitations/create/${order.id}/details`}>Edit Details</Link>
                          </Button>
                        </>
                      ) : (
                        order.status === "DRAFT" && (
                          <Button size="sm" asChild>
                            <Link href={`/invitations/create/${order.id}/details`}>Continue Editing</Link>
                          </Button>
                        )
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                          disabled={deleting}
                          onClick={() => void handleDelete(order)}
                        >
                          {deleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          {deleting ? "Deleting…" : "Delete"}
                        </Button>
                      )}
                    </div>
                    {isLiveInvitation(order) && (
                      <p className="text-xs text-slate-500">
                        Published, saved changes appear on the guest link right away.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <PaginationBar page={page} pages={pages} total={total} limit={10} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
