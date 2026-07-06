"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { PUBLIC_GRID_LIMIT } from "@/lib/pagination";

interface Venue {
  id: string;
  name: string;
  capacity: number;
  location: string;
  priceFrom: string;
  priceTo: string | null;
  mapsLink: string | null;
}

export default function VenuesPage() {
  const { page, setPage, appendToParams } = usePagination(PUBLIC_GRID_LIMIT);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [bookingVenue, setBookingVenue] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    const params = appendToParams(new URLSearchParams());
    fetch(`/api/venues?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setVenues(d.data.items ?? []);
          setTotal(d.data.total ?? 0);
          setPages(d.data.pages ?? 1);
        }
      });
  }, [appendToParams]);

  useEffect(() => { load(); }, [load]);

  async function requestBooking(venueId: string) {
    if (!eventDate) {
      setError("Please select an event date");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    const res = await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId, eventDate, notes }),
    });
    const d = await res.json();
    if (res.ok) {
      setMessage(`Booking request sent for ${venues.find((v) => v.id === venueId)?.name}!`);
      setBookingVenue(null);
      setEventDate("");
      setNotes("");
    } else {
      setError(d.error || "Booking request failed");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Venue Marketplace</h1>
        <p className="page-subtitle">Discover venues with capacity, pricing, and availability.</p>
      </div>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {venues.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No venues listed yet. Run database seed to load sample venues.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {venues.map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle className="text-base">{v.name}</CardTitle>
                <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{v.location}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" />{v.capacity} capacity</span>
                  <span>{formatCurrency(v.priceFrom)}{v.priceTo ? ` – ${formatCurrency(v.priceTo)}` : "+"}</span>
                </div>
                {bookingVenue === v.id ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label>Event Date *</Label>
                      <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Notes (optional)</Label>
                      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Guest count, setup needs..." />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => requestBooking(v.id)} disabled={loading}>
                        {loading ? "Sending..." : "Confirm"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setBookingVenue(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setBookingVenue(v.id)}>Request Booking</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <PaginationBar page={page} pages={pages} total={total} limit={PUBLIC_GRID_LIMIT} onPageChange={setPage} />
    </div>
  );
}
