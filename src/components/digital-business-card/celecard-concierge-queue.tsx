"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";

type Order = {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  displayName: string;
  totalGhs: number;
  includeSubscription: boolean;
  planId: string | null;
  cardId: string | null;
  paymentId: string | null;
  createdAt: string;
};

export function CeleCardConciergeQueue() {
  const { page, setPage, resetPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams());
    if (status !== "all") params.set("status", status);
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/celecard/concierge?${params}`);
    const payload = await res.json().catch(() => ({}));
    if (payload.success) {
      setOrders(payload.data.items);
      setTotal(payload.data.total);
      setPages(payload.data.pages);
    }
  }, [appendToParams, status, search]);

  useEffect(() => {
    resetPage();
  }, [status, search, resetPage]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  async function act(id: string, action: string) {
    const reason =
      action === "waive" || action === "cancel" ? window.prompt("Reason (required)") : undefined;
    if ((action === "waive" || action === "cancel") && (!reason || reason.trim().length < 8)) {
      alert("A reason is required.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/celecard/concierge/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(payload.error || "Action failed");
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Concierge queue"
        subtitle="Paid design requests. Fulfillment creates a real CeleYou and never invents a payment."
        count={total}
        search={search}
        onSearchChange={setSearch}
        onRefresh={load}
      >
        <select className="rounded-md border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="INTAKE">Intake</option>
          <option value="AWAITING_PAYMENT">Awaiting payment</option>
          <option value="PAID">Paid</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="READY">Ready</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </AdminToolbar>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Card name</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="px-4 py-3">
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-xs text-slate-500">{order.customerEmail}</p>
                </td>
                <td className="px-4 py-3">{order.displayName}</td>
                <td className="px-4 py-3">GH₵{order.totalGhs}{order.paymentId ? " · paid" : ""}</td>
                <td className="px-4 py-3">{order.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => act(order.id, "start")}>
                      Start
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => act(order.id, "fulfill")}>
                      Design and activate
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => act(order.id, "deliver")}>
                      Deliver
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/admin/celecard/new?orderId=${order.id}`}>Open wizard</Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!orders.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                  No concierge orders on this page.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} pages={pages} total={total} limit={ADMIN_TABLE_LIMIT} onPageChange={setPage} />
    </div>
  );
}
