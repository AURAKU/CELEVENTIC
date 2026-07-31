"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { VENDOR_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { PUBLIC_GRID_LIMIT } from "@/lib/pagination";

interface Vendor {
  id: string;
  businessName: string;
  category: string;
  location: string | null;
  rating: string;
  isVerified: boolean;
  services: { name: string; priceFrom: string }[];
}

export default function VendorsPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const { page, setPage, resetPage, appendToParams } = usePagination(PUBLIC_GRID_LIMIT);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [category, setCategory] = useState("");
  const [bookingVendor, setBookingVendor] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    const params = appendToParams(new URLSearchParams());
    if (category) params.set("category", category);
    fetch(`/api/vendors?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const list = Array.isArray(d.data)
          ? d.data
          : Array.isArray(d.data?.vendors)
            ? d.data.vendors
            : Array.isArray(d.data?.items)
              ? d.data.items
              : [];
        setVendors(list);
        setTotal(d.data?.total ?? list.length);
        setPages(d.data?.pages ?? 1);
      })
      .catch(() => {
        setVendors([]);
        setTotal(0);
        setPages(1);
      });
  }, [appendToParams, category]);

  useEffect(() => {
    load();
  }, [load]);

  function selectCategory(next: string) {
    setCategory(next);
    resetPage();
  }

  async function requestBooking(vendorId: string) {
    setError("");
    setMessage("");
    setLoading(true);
    const res = await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "book", vendorId, eventId: eventId || undefined, notes }),
    });
    const d = await res.json();
    if (res.ok) {
      setMessage(`Booking request sent to ${vendors.find((v) => v.id === vendorId)?.businessName}!`);
      setBookingVendor(null);
      setNotes("");
    } else {
      setError(d.error || "Booking request failed");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vendor Marketplace</h1>
        <p className="page-subtitle">Find and book caterers, DJs, photographers, and more.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} label="Link to Event (optional)" />
        </CardContent>
      </Card>

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button variant={!category ? "default" : "outline"} size="sm" onClick={() => selectCategory("")}>
          All
        </Button>
        {VENDOR_CATEGORIES.map((c) => (
          <Button
            key={c}
            variant={category === c ? "default" : "outline"}
            size="sm"
            onClick={() => selectCategory(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {vendors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No vendors found. Run database seed to load sample vendors.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <Card key={v.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{v.businessName}</CardTitle>
                    {v.isVerified && <Badge variant="success">Verified</Badge>}
                  </div>
                  <p className="text-sm text-slate-500">
                    {v.category}
                    {v.location ? ` · ${v.location}` : ""}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm mb-3">
                    <Star className="h-4 w-4 text-gold-400 fill-gold-400" />
                    <span>{Number(v.rating).toFixed(1)}</span>
                  </div>
                  {v.services?.[0] && (
                    <p className="text-sm text-slate-600">From {formatCurrency(v.services[0].priceFrom)}</p>
                  )}
                  {bookingVendor === v.id ? (
                    <div className="mt-3 space-y-2">
                      <div className="space-y-1">
                        <Label>Notes (optional)</Label>
                        <Input
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Date, requirements..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => requestBooking(v.id)} disabled={loading}>
                          {loading ? "Sending..." : "Confirm"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setBookingVendor(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => setBookingVendor(v.id)}
                    >
                      Request Booking
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <PaginationBar page={page} pages={pages} total={total} limit={PUBLIC_GRID_LIMIT} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
