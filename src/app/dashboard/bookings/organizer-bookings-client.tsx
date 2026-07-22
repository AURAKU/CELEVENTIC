"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { formatCurrency } from "@/lib/utils";

interface BookingRow {
  id: string;
  status: string;
  serviceName?: string | null;
  agreedAmount: unknown;
  depositAmount?: unknown;
  currency: string;
  eventDate?: string | null;
  vendor?: { businessName: string; slug: string };
}

export function OrganizerBookingsClient() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("booking");
  const reviewMode = searchParams.get("review") === "1";
  const { page, setPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [reviewBooking, setReviewBooking] = useState<string | null>(reviewMode ? highlight : null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/marketplace/bookings?${appendToParams(new URLSearchParams())}`);
    const json = await res.json();
    if (json.success) {
      setBookings(json.data.items);
      setTotal(json.data.total);
      setPages(json.data.pages ?? Math.ceil(json.data.total / ADMIN_TABLE_LIMIT));
    }
    setLoading(false);
  }, [appendToParams]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (highlight) setReviewBooking(reviewMode ? highlight : null);
  }, [highlight, reviewMode]);

  async function payBooking(id: string) {
    if (!email.includes("@")) {
      alert("Enter a valid email for payment receipt");
      return;
    }
    setPaying(id);
    const res = await fetch(`/api/marketplace/bookings/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setPaying(null);
    if (json.data?.authorizationUrl) {
      window.location.href = json.data.authorizationUrl;
      return;
    }
    alert(json.error ?? "Payment could not start");
  }

  async function confirmComplete(id: string) {
    const res = await fetch(`/api/marketplace/bookings/${id}/complete`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) alert(json.error ?? "Could not confirm");
    void load();
  }

  async function submitReview(id: string) {
    const res = await fetch(`/api/marketplace/bookings/${id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    const json = await res.json();
    if (!res.ok) alert(json.error ?? "Review failed");
    setReviewBooking(null);
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vendor Bookings</h1>
        <p className="text-slate-500 text-sm">Track payments, delivery, and verified reviews — all secured on Celeventic.</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <Label htmlFor="pay-email">Payment receipt email</Label>
          <Input id="pay-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 max-w-md" />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-slate-500">Loading bookings…</p>
      ) : bookings.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-slate-500">No bookings yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id} className={highlight === b.id ? "border-[#0B8A83]" : ""}>
              <CardContent className="py-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-medium">{b.vendor?.businessName ?? "Vendor"}</p>
                    <p className="text-sm text-slate-600">{b.serviceName ?? "Event service"}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(Number(b.agreedAmount))} {b.currency}</p>
                  </div>
                  <Badge variant="outline">{b.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["AWAITING_PAYMENT", "DEPOSIT_PAID"].includes(b.status) && (
                    <Button size="sm" disabled={paying === b.id} onClick={() => void payBooking(b.id)}>
                      {b.status === "DEPOSIT_PAID" ? "Pay balance" : "Pay deposit"}
                    </Button>
                  )}
                  {["IN_PROGRESS", "AWAITING_COMPLETION", "CONFIRMED", "DEPOSIT_PAID"].includes(b.status) && (
                    <Button size="sm" variant="outline" onClick={() => void confirmComplete(b.id)}>Confirm completion</Button>
                  )}
                  {b.status === "COMPLETED" && (
                    <Button size="sm" variant="outline" onClick={() => setReviewBooking(b.id)}>Leave review</Button>
                  )}
                  {b.vendor?.slug && (
                    <Button size="sm" variant="ghost" asChild><Link href={`/vendors/${b.vendor.slug}`}>Vendor profile</Link></Button>
                  )}
                </div>
                {reviewBooking === b.id && (
                  <div className="border-t pt-3 space-y-2">
                    <Label>Rating (1–5)</Label>
                    <Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="max-w-[120px]" />
                    <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your verified experience…" rows={3} />
                    <Button size="sm" onClick={() => void submitReview(b.id)}>Submit verified review</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationBar page={page} pages={pages} total={total} limit={ADMIN_TABLE_LIMIT} onPageChange={setPage} />
    </div>
  );
}
