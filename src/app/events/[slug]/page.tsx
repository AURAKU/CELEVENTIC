"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Ticket, Phone } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  eventType: string;
  description: string | null;
  startDate: string;
  venueName: string | null;
  city: string | null;
  mapsLink: string | null;
  hostName: string;
  contactPhone: string | null;
  tickets: {
    id: string;
    name: string;
    type: string;
    price: number;
    soldCount: number;
    maxQuantity: number | null;
  }[];
}

export default function PublicEventPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState("");
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "", quantity: "1", promoCode: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/public/events/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setEvent(d.data);
          if (d.data.tickets.length > 0) setSelectedTicket(d.data.tickets[0].id);
        } else setError(d.error);
      });
  }, [slug]);

  async function purchaseTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !buyer.email) return;
    setLoading(true);
    setError("");

    const purchaseRes = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "purchase",
        ticketId: selectedTicket,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone || undefined,
        quantity: parseInt(buyer.quantity),
        promoCode: buyer.promoCode.trim() || undefined,
      }),
    });
    const purchaseData = await purchaseRes.json();
    if (!purchaseRes.ok) {
      setError(purchaseData.error || "Purchase failed");
      setLoading(false);
      return;
    }

    if (!purchaseData.data.requiresPayment) {
      setError("");
      alert("Ticket confirmed! Check your email for QR details.");
      setLoading(false);
      return;
    }

    const payRes = await fetch("/api/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: purchaseData.data.totalAmount,
        email: buyer.email,
        purpose: "TICKET_PURCHASE",
        ticketOrderId: purchaseData.data.order.id,
        metadata: { eventId: event?.id },
      }),
    });
    const payData = await payRes.json();
    if (payRes.ok && payData.data?.authorizationUrl) {
      window.location.href = payData.data.authorizationUrl;
    } else {
      setError(payData.error || "Payment initialization failed");
    }
    setLoading(false);
  }

  if (error && !event) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center p-6">
          <p className="text-slate-500">{error}</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">Loading...</main>
        <Footer />
      </>
    );
  }

  const saleTickets = event.tickets.filter((t) => {
    const remaining = t.maxQuantity == null || t.soldCount < t.maxQuantity;
    return remaining;
  });
  const selected = saleTickets.find((t) => t.id === selectedTicket);
  const lineTotal = selected ? selected.price * (parseInt(buyer.quantity, 10) || 1) : 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF8F4]">
        <section className="bg-[#0F172A] text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-[#0B8A83]/20 text-[#0B8A83] border-[#0B8A83]/30">
              {event.eventType.replace(/_/g, " ")}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold">{event.title}</h1>
            <p className="text-slate-400 mt-2">Hosted by {event.hostName}</p>
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-slate-300">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(event.startDate)}</span>
              {event.venueName && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{event.venueName}{event.city ? `, ${event.city}` : ""}</span>}
              {event.contactPhone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{event.contactPhone}</span>}
            </div>
            {event.mapsLink && (
              <a href={event.mapsLink} target="_blank" rel="noopener noreferrer" className="text-[#0B8A83] text-sm mt-3 inline-block">
                View on Maps →
              </a>
            )}
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
          {event.description && (
            <Card>
              <CardContent className="p-6">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </CardContent>
            </Card>
          )}

          {event.eventType === "FUNERAL" && (
            <Link href={`/memorial/${event.slug}`}>
              <Button className="w-full bg-[#0F172A]">View Memorial Page</Button>
            </Link>
          )}

          {saleTickets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5 text-[#0B8A83]" /> Get Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={purchaseTicket} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ticket Type</Label>
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={selectedTicket}
                      onChange={(e) => setSelectedTicket(e.target.value)}
                    >
                      {saleTickets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.price > 0 ? formatCurrency(t.price) : "Free"} ({t.soldCount}{t.maxQuantity ? `/${t.maxQuantity}` : ""} sold)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Full Name</Label><Input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} required /></div>
                    <div className="space-y-1"><Label>Email</Label><Input type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} required /></div>
                    <div className="space-y-1"><Label>Phone</Label><Input value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Quantity</Label><Input type="number" min="1" value={buyer.quantity} onChange={(e) => setBuyer({ ...buyer, quantity: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1">
                    <Label>Promo code (optional)</Label>
                    <Input
                      value={buyer.promoCode}
                      onChange={(e) => setBuyer({ ...buyer, promoCode: e.target.value.toUpperCase() })}
                      placeholder="SAVE10"
                    />
                  </div>
                  {selected && (
                    <p className="text-sm text-slate-600">
                      Subtotal: <strong>{lineTotal > 0 ? formatCurrency(lineTotal) : "Free"}</strong>
                      {buyer.promoCode && lineTotal > 0 && " · promo applied at checkout"}
                    </p>
                  )}
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" className="w-full bg-[#0B8A83] hover:bg-[#0B8A83]/90" disabled={loading}>
                    {loading ? "Processing..." : lineTotal > 0 ? "Buy Tickets" : "Get Free Tickets"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {saleTickets.length === 0 && event.tickets.length > 0 && (
            <Card>
              <CardContent className="p-4 text-sm text-slate-600 text-center">
                All tickets are currently sold out.
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
