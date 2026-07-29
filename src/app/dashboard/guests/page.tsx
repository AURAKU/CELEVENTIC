"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination";
import Link from "next/link";
import { Users, Plus, MessageCircle, ExternalLink, Upload } from "lucide-react";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { usePagination } from "@/hooks/use-pagination";
import { SmartGuestSearch } from "@/components/guest-search/smart-guest-search";
import { QuickCreateCard } from "@/components/guest-search/quick-create-card";
import type { SearchResultCard } from "@/lib/guest-search/types";
import { getClientAppUrl, sanitizePublicUrl } from "@/lib/app-url";

interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
  qrToken: string;
  inviteOpenedAt?: string | null;
  invitation?: { uniqueLink: string } | null;
}

const CRM_STATUSES = ["INVITED", "OPENED", "ACCEPTED", "DECLINED", "MAYBE", "CHECKED_IN"] as const;

export default function GuestsPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const { page, setPage, resetPage, appendToParams } = usePagination(20);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState({ counts: {} as Record<string, number>, total: 0, noResponse: 0 });
  const [defaultInviteUniqueLink, setDefaultInviteUniqueLink] = useState<string | null>(null);
  const [newGuest, setNewGuest] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState<string>("all");
  // Invitations created in this session, pinned above search results so the
  // organiser can hand over a link without hunting for it again.
  const [recentlyCreated, setRecentlyCreated] = useState<SearchResultCard[]>([]);

  const loadGuests = useCallback(async () => {
    if (!eventId) return;
    const params = appendToParams(new URLSearchParams({ eventId }));
    if (filter !== "all") params.set("status", filter);
    const res = await fetch(`/api/guests?${params}`);
    const data = await res.json();
    if (res.ok) {
      setGuests(data.data.items ?? []);
      setTotal(data.data.total ?? 0);
      setPages(data.data.pages ?? 1);
      if (data.data.stats) setStats(data.data.stats);
      setDefaultInviteUniqueLink(data.data.defaultInviteUniqueLink ?? null);
    } else setError(data.error);
  }, [eventId, filter, appendToParams]);

  useEffect(() => {
    if (eventId) loadGuests();
  }, [eventId, loadGuests]);

  useEffect(() => {
    resetPage();
  }, [filter, eventId, resetPage]);

  useEffect(() => {
    setRecentlyCreated([]);
  }, [eventId]);

  const upsertRecent = useCallback((card: SearchResultCard) => {
    setRecentlyCreated((current) => [
      card,
      ...current.filter((existing) => existing.invitationId !== card.invitationId),
    ]);
  }, []);

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId) return;
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ...newGuest }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewGuest({ name: "", email: "", phone: "" });
      setSuccess(`${data.data.guest.name} added with QR code`);
      loadGuests();
    } else {
      setError(data.error || "Failed to add guest");
    }
    setLoading(false);
  }

  function guestInviteLink(guest: Guest) {
    const uniqueLink = guest.invitation?.uniqueLink || defaultInviteUniqueLink;
    if (!uniqueLink) return "";
    const raw = `${getClientAppUrl()}/invite/${uniqueLink}?guest=${guest.qrToken}`;
    return sanitizePublicUrl(raw);
  }

  function whatsAppUrl(guest: Guest) {
    const link = guestInviteLink(guest);
    if (!link) return "";
    const text = `Dear ${guest.name},\n\nYou are personally invited. Open your Celeventic invitation:\n${link}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  const statusVariant = (status: string) => {
    const map: Record<string, "success" | "destructive" | "warning" | "outline" | "default"> = {
      ACCEPTED: "success", DECLINED: "destructive", MAYBE: "warning", CHECKED_IN: "default", OPENED: "default",
    };
    return map[status] ?? "outline";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Guest CRM</h1>
          <p className="page-subtitle">Track invited, opened, RSVP, check-in, share via WhatsApp with one tap.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/guests/import">
            <Upload className="h-4 w-4" /> Bulk import
          </Link>
        </Button>
      </div>

      <Card><CardContent className="p-4"><EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} /></CardContent></Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <SmartGuestSearch
            eventId={eventId}
            recentlyCreated={recentlyCreated}
            onCardChanged={(card) => {
              upsertRecent(card);
              loadGuests();
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <QuickCreateCard
            eventId={eventId}
            onCreated={(card) => {
              upsertRecent(card);
              loadGuests();
            }}
          />
        </div>
      </div>

      {eventId && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { key: "all", label: "All", count: stats.total },
            ...CRM_STATUSES.map((s) => ({ key: s, label: s.replace("_", " "), count: stats.counts[s] ?? 0 })),
            { key: "NO_RESPONSE", label: "No Response", count: stats.noResponse },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setFilter(s.key)}
              className={`rounded-xl border p-3 text-center text-xs transition-colors ${
                filter === s.key ? "border-[#0B8A83] bg-[#0B8A83]/10" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className="text-lg font-bold">{s.count}</p>
              <p className="text-slate-500 capitalize mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">{success}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" /> Add Guest</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addGuest} className="space-y-3">
              <div className="space-y-1"><Label>Name *</Label><Input value={newGuest.name} onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })} required disabled={!eventId} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={newGuest.email} onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })} disabled={!eventId} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={newGuest.phone} onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })} disabled={!eventId} /></div>
              <Button type="submit" className="w-full" disabled={loading || !eventId}>{loading ? "Adding..." : "Add Guest"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Guest List ({total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!eventId ? (
              <p className="text-center text-slate-500 py-8">Select an event to manage guests.</p>
            ) : guests.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No guests match this filter.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {guests.map((guest) => (
                    <div key={guest.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{guest.name}</p>
                        <p className="text-xs text-slate-500">{guest.email || guest.phone || "No contact"}</p>
                        {guest.inviteOpenedAt && (
                          <p className="text-xs text-blue-500 mt-0.5">Opened {new Date(guest.inviteOpenedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={statusVariant(guest.status)}>{guest.status}</Badge>
                        {guestInviteLink(guest) ? (
                          <>
                            <Button size="sm" variant="outline" asChild>
                              <a href={whatsAppUrl(guest)} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                              </a>
                            </Button>
                            <Button size="sm" variant="ghost" asChild>
                              <a href={guestInviteLink(guest)} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500">Use Quick Invite to create a shareable link</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationBar page={page} pages={pages} total={total} limit={20} onPageChange={setPage} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
