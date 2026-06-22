"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination";
import { formatCurrency } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";

interface OrderRow {
  id: string;
  status: string;
  productionStatus: string;
  eventTitle: string | null;
  templateSlug: string;
  packageSlug: string;
  totalAmountGhs: string | number;
  shareUrl: string | null;
  template: { name: string };
  package: { name: string };
  payment: { status: string; reference: string } | null;
}

export default function MyInvitationsPage() {
  const { page, setPage, appendToParams } = usePagination(10);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

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
          <h1 className="font-display text-2xl font-bold text-slate-900">My Invitations</h1>
          <p className="text-slate-500 mt-1">Track orders, payments, RSVP links, and production status.</p>
        </div>
        <Button asChild className="bg-[#0B8A83] hover:bg-[#097068]">
          <Link href="/invitations/catalogue"><Plus className="h-4 w-4" /> New Invitation</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-slate-500">No invitations yet.</p>
            <Button className="mt-4" asChild><Link href="/invitations">Create Your First Invitation</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{order.eventTitle ?? order.template.name}</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">{order.template.name} · {order.package.name}</p>
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
                  {order.status === "DRAFT" && (
                    <Button size="sm" asChild>
                      <Link href={`/invitations/create/${order.id}/details`}>Continue Editing</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
          <PaginationBar page={page} pages={pages} total={total} limit={10} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
