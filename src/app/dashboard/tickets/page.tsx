"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket } from "lucide-react";
import { TICKET_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";

interface TicketItem {
  id: string;
  name: string;
  type: string;
  price: string;
  soldCount: number;
  maxQuantity?: number;
}

export default function TicketsPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [form, setForm] = useState({ name: "", type: "FREE", price: "0", maxQuantity: "" });
  const [error, setError] = useState("");

  async function loadTickets() {
    if (!eventId) return;
    const res = await fetch(`/api/tickets?eventId=${eventId}`);
    const data = await res.json();
    if (res.ok) setTickets(data.data);
  }

  useEffect(() => {
    if (eventId) loadTickets();
  }, [eventId]);

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
        maxQuantity: form.maxQuantity ? parseInt(form.maxQuantity) : undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setForm({ name: "", type: "FREE", price: "0", maxQuantity: "" });
      loadTickets();
    } else {
      setError(data.error || "Failed to create ticket");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ticketing</h1>
        <p className="page-subtitle">Create and manage event tickets with QR codes and payment integration.</p>
      </div>

      <Card><CardContent className="p-4"><EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} /></CardContent></Card>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Create Ticket Type</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createTicket} className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={!eventId} /></div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={!eventId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TICKET_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Price (GHS)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} disabled={!eventId} /></div>
              <div className="space-y-1"><Label>Max Quantity</Label><Input type="number" value={form.maxQuantity} onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })} disabled={!eventId} /></div>
              <Button type="submit" className="w-full" disabled={!eventId}>Create Ticket</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Ticket Types</CardTitle></CardHeader>
          <CardContent>
            {!eventId ? <p className="text-center text-slate-500 py-8">Select an event first.</p>
            : tickets.length === 0 ? <p className="text-center text-slate-500 py-8">No tickets yet. Create a ticket type.</p>
            : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div><p className="font-medium">{ticket.name}</p><p className="text-sm text-slate-500">{ticket.type}</p></div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(ticket.price)}</p>
                      <p className="text-xs text-slate-500">{ticket.soldCount} sold{ticket.maxQuantity ? ` / ${ticket.maxQuantity}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
