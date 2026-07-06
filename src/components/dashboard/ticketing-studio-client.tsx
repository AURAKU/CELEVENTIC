"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Ticket,
  BarChart3,
  ShoppingBag,
  Tag,
  QrCode,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  Loader2,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { TICKET_TYPES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";

interface TicketItem {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  price: string | number;
  soldCount: number;
  maxQuantity?: number | null;
  status: string;
}

interface TicketOrder {
  id: string;
  buyerName: string;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  quantity: number;
  totalAmount: number;
  status: string;
  promoCode?: string | null;
  createdAt: string;
  ticket: { name: string; type: string };
  payments?: { id: string; status: string; amount: number; provider: string }[];
}

interface TicketStats {
  ticketTypes: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  totalSold: number;
  totalCapacity: number | null;
  revenueGhs: number;
  tickets: { id: string; name: string; soldCount: number; maxQuantity: number | null; price: number }[];
}

interface TicketPromo {
  id: string;
  code: string;
  discountPercent: number;
  discountFixed?: number;
  maxUses?: number;
  usedCount: number;
  active: boolean;
}

export function TicketingStudioClient() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const { page: ordersPage, setPage: setOrdersPage, appendToParams: ordersPageParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [orders, setOrders] = useState<TicketOrder[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPages, setOrdersPages] = useState(1);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [promos, setPromos] = useState<TicketPromo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "FREE",
    price: "0",
    maxQuantity: "",
    description: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    type: "FREE",
    price: "0",
    maxQuantity: "",
    description: "",
  });

  const [promoForm, setPromoForm] = useState({
    code: "",
    discountPercent: "10",
    maxUses: "",
  });

  const selectedEvent = events.find((e) => e.id === eventId);

  const loadAll = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError("");
    try {
      const orderParams = ordersPageParams(new URLSearchParams({ eventId }));
      const [tRes, oRes, sRes, pRes] = await Promise.all([
        fetch(`/api/tickets?eventId=${eventId}`),
        fetch(`/api/tickets/orders?${orderParams}`),
        fetch(`/api/tickets/stats?eventId=${eventId}`),
        fetch(`/api/tickets/promos?eventId=${eventId}`),
      ]);
      const [tData, oData, sData, pData] = await Promise.all([
        tRes.json(),
        oRes.json(),
        sRes.json(),
        pRes.json(),
      ]);
      if (tRes.ok) setTickets(tData.data);
      if (oRes.ok) {
        setOrders(oData.data.items ?? []);
        setOrdersTotal(oData.data.total ?? 0);
        setOrdersPages(oData.data.pages ?? 1);
      }
      if (sRes.ok) setStats(sData.data);
      if (pRes.ok) setPromos(pData.data);
    } catch {
      setError("Failed to load ticketing data");
    } finally {
      setLoading(false);
    }
  }, [eventId, ordersPageParams]);

  useEffect(() => {
    if (eventId) void loadAll();
  }, [eventId, loadAll]);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        name: form.name,
        type: form.type,
        price: parseFloat(form.price),
        maxQuantity: form.maxQuantity ? parseInt(form.maxQuantity, 10) : undefined,
        description: form.description || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setForm({ name: "", type: "FREE", price: "0", maxQuantity: "", description: "" });
      void loadAll();
    } else {
      setError(data.error || "Failed to create ticket");
    }
  }

  function startEdit(ticket: TicketItem) {
    setEditingId(ticket.id);
    setEditForm({
      name: ticket.name,
      type: ticket.type,
      price: String(ticket.price),
      maxQuantity: ticket.maxQuantity ? String(ticket.maxQuantity) : "",
      description: ticket.description ?? "",
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    const res = await fetch(`/api/tickets/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        type: editForm.type,
        price: parseFloat(editForm.price),
        maxQuantity: editForm.maxQuantity ? parseInt(editForm.maxQuantity, 10) : null,
        description: editForm.description || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setEditingId(null);
      void loadAll();
    } else {
      setError(data.error || "Update failed");
    }
  }

  async function removeTicket(id: string, name: string) {
    if (!confirm(`Remove or deactivate "${name}"?`)) return;
    const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Delete failed");
    void loadAll();
  }

  async function createPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    const res = await fetch("/api/tickets/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        code: promoForm.code,
        discountPercent: parseFloat(promoForm.discountPercent),
        maxUses: promoForm.maxUses ? parseInt(promoForm.maxUses, 10) : undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setPromoForm({ code: "", discountPercent: "10", maxUses: "" });
      void loadAll();
    } else {
      setError(data.error || "Promo failed");
    }
  }

  async function deletePromo(id: string) {
    if (!eventId) return;
    await fetch(`/api/tickets/promos?eventId=${eventId}&id=${id}`, { method: "DELETE" });
    void loadAll();
  }

  async function togglePublish(ticket: TicketItem) {
    const action = ticket.status === "PAID" ? "unpublish" : "publish";
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Publish toggle failed");
    void loadAll();
  }

  function exportOrdersCsv() {
    if (!orders.length) return;
    const header = ["Buyer", "Email", "Phone", "Ticket", "Qty", "Total", "Promo", "Status", "Payment", "Date"];
    const rows = orders.map((o) => [
      o.buyerName,
      o.buyerEmail ?? "",
      o.buyerPhone ?? "",
      o.ticket.name,
      String(o.quantity),
      String(o.totalAmount),
      o.promoCode ?? "",
      o.status,
      o.payments?.[0]?.status ?? "",
      o.createdAt,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-orders-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyPublicLink() {
    if (!selectedEvent?.slug) return;
    const url = `${window.location.origin}/events/${selectedEvent.slug}`;
    void navigator.clipboard.writeText(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ticketing Studio</h1>
          <p className="page-subtitle">
            Advanced ticket types, orders, promo codes, revenue analytics, and QR admission tools.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/qr-admission">
              <QrCode className="h-4 w-4 mr-1" /> QR Admission
            </Link>
          </Button>
          {selectedEvent?.slug && (
            <Button variant="outline" size="sm" onClick={copyPublicLink}>
              <Copy className="h-4 w-4 mr-1" /> Copy sales link
            </Button>
          )}
          {selectedEvent?.slug && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/events/${selectedEvent.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-1" /> Public page
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {!eventId ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">Select an event to manage ticketing.</CardContent>
        </Card>
      ) : (
        <>
          {stats && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Revenue</p>
                  <p className="text-2xl font-bold text-[#0B8A83]">{formatCurrency(stats.revenueGhs)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Tickets sold</p>
                  <p className="text-2xl font-bold">{stats.totalSold}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Orders</p>
                  <p className="text-2xl font-bold">{stats.paidOrders} <span className="text-sm font-normal text-slate-400">paid</span></p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pendingOrders}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="types" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="types" className="gap-1.5"><Ticket className="h-3.5 w-3.5" /> Types</TabsTrigger>
              <TabsTrigger value="orders" className="gap-1.5"><ShoppingBag className="h-3.5 w-3.5" /> Orders</TabsTrigger>
              <TabsTrigger value="promos" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Promos</TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="types" className="space-y-4">
              <div className="grid lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Create ticket type</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={createTicket} className="space-y-3">
                      <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                      <div className="space-y-1">
                        <Label>Type</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TICKET_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label>Price (GHS)</Label><Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Max quantity</Label><Input type="number" min={1} value={form.maxQuantity} onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })} placeholder="Unlimited" /></div>
                      <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
                      <Button type="submit" className="w-full">Create ticket</Button>
                      <p className="text-[11px] text-slate-400">New tickets start as Draft — publish with the eye icon to go live on your sales page.</p>
                    </form>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="h-5 w-5" /> Ticket types
                      {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tickets.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No ticket types yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {tickets.map((ticket) => (
                          <div key={ticket.id} className="rounded-lg border p-4">
                            {editingId === ticket.id ? (
                              <div className="space-y-3">
                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                                  <div>
                                    <Label>Type</Label>
                                    <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>{TICKET_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                                    </Select>
                                  </div>
                                  <div><Label>Price</Label><Input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} /></div>
                                  <div><Label>Max qty</Label><Input type="number" value={editForm.maxQuantity} onChange={(e) => setEditForm({ ...editForm, maxQuantity: e.target.value })} /></div>
                                </div>
                                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => void saveEdit()}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">{ticket.name}</p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    <Badge variant="outline">{ticket.type}</Badge>
                                    <Badge variant={ticket.status === "PAID" ? "success" : ticket.status === "PENDING" ? "warning" : "secondary"}>
                                      {ticket.status === "PAID" ? "Live" : ticket.status === "PENDING" ? "Draft" : ticket.status}
                                    </Badge>
                                  </div>
                                  {ticket.description && <p className="text-sm text-slate-500 mt-2">{ticket.description}</p>}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-bold">{formatCurrency(ticket.price)}</p>
                                  <p className="text-xs text-slate-500">{ticket.soldCount} sold{ticket.maxQuantity ? ` / ${ticket.maxQuantity}` : ""}</p>
                                  <div className="flex gap-1 mt-2 justify-end">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      title={ticket.status === "PAID" ? "Unpublish" : "Publish to sales page"}
                                      onClick={() => void togglePublish(ticket)}
                                    >
                                      {ticket.status === "PAID" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-[#0B8A83]" />}
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(ticket)}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => void removeTicket(ticket.id, ticket.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Ticket orders</CardTitle>
                  {orders.length > 0 && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={exportOrdersCsv}>
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {orders.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No orders yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="p-2">Buyer</th>
                          <th className="p-2">Ticket</th>
                          <th className="p-2">Qty</th>
                          <th className="p-2">Total</th>
                          <th className="p-2">Promo</th>
                          <th className="p-2">Payment</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr key={o.id} className="border-b last:border-0">
                            <td className="p-2">
                              <p className="font-medium">{o.buyerName}</p>
                              <p className="text-xs text-slate-400">{o.buyerEmail ?? o.buyerPhone ?? "—"}</p>
                            </td>
                            <td className="p-2">{o.ticket.name}</td>
                            <td className="p-2">{o.quantity}</td>
                            <td className="p-2 font-medium">{formatCurrency(o.totalAmount)}</td>
                            <td className="p-2 text-xs">{o.promoCode ?? "—"}</td>
                            <td className="p-2">
                              <Badge variant={o.payments?.[0]?.status === "SUCCESSFUL" ? "success" : "outline"}>
                                {o.payments?.[0]?.status ?? (o.totalAmount === 0 ? "FREE" : "—")}
                              </Badge>
                            </td>
                            <td className="p-2"><Badge variant={o.status === "PAID" ? "success" : "warning"}>{o.status}</Badge></td>
                            <td className="p-2 text-slate-500">{formatDate(o.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <PaginationBar page={ordersPage} pages={ordersPages} total={ordersTotal} limit={ADMIN_TABLE_LIMIT} onPageChange={setOrdersPage} className="px-4 pb-4" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="promos">
              <div className="grid lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Create promo code</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={createPromo} className="space-y-3">
                      <div><Label>Code</Label><Input value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} placeholder="SAVE10" required /></div>
                      <div><Label>Discount %</Label><Input type="number" min={0} max={100} value={promoForm.discountPercent} onChange={(e) => setPromoForm({ ...promoForm, discountPercent: e.target.value })} /></div>
                      <div><Label>Max uses (optional)</Label><Input type="number" min={1} value={promoForm.maxUses} onChange={(e) => setPromoForm({ ...promoForm, maxUses: e.target.value })} /></div>
                      <Button type="submit" className="w-full">Create promo</Button>
                    </form>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle className="text-base">Active promos</CardTitle></CardHeader>
                  <CardContent>
                    {promos.length === 0 ? (
                      <p className="text-slate-500 text-sm">No promo codes yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {promos.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="font-mono font-semibold">{p.code}</p>
                              <p className="text-xs text-slate-500">{p.discountPercent}% off · {p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ""} uses</p>
                            </div>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => void deletePromo(p.id)}>Remove</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader><CardTitle className="text-base">Sales breakdown</CardTitle></CardHeader>
                <CardContent>
                  {stats?.tickets.length ? (
                    <div className="space-y-4">
                      {stats.tickets.map((t) => {
                        const pct = t.maxQuantity ? Math.round((t.soldCount / t.maxQuantity) * 100) : null;
                        return (
                          <div key={t.id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{t.name}</span>
                              <span className="text-slate-500">{t.soldCount}{t.maxQuantity ? ` / ${t.maxQuantity}` : ""} · {formatCurrency(t.price)}</span>
                            </div>
                            {pct !== null && (
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#0B8A83] rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No ticket data yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
