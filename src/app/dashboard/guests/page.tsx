"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Upload } from "lucide-react";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { SmartGuestSearch } from "@/components/guest-search/smart-guest-search";
import { QuickCreateCard } from "@/components/guest-search/quick-create-card";
import type { SearchResultCard } from "@/lib/guest-search/types";

const CRM_STATUSES = ["INVITED", "OPENED", "ACCEPTED", "DECLINED", "MAYBE", "CHECKED_IN"] as const;

/**
 * Guest CRM — one create path, one list.
 *
 * Add Guest creates a personalised invitation. The same GuestResultCard list
 * (browse + search) is where organisers and admins edit or delete afterwards.
 */
export default function GuestsPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [stats, setStats] = useState({ counts: {} as Record<string, number>, total: 0, noResponse: 0 });
  const [filter, setFilter] = useState<string>("all");
  const [refreshToken, setRefreshToken] = useState(0);
  const [recentlyCreated, setRecentlyCreated] = useState<SearchResultCard[]>([]);

  const loadStats = useCallback(async () => {
    if (!eventId) {
      setStats({ counts: {}, total: 0, noResponse: 0 });
      return;
    }
    const res = await fetch(`/api/guests?eventId=${encodeURIComponent(eventId)}&limit=1`);
    const data = await res.json();
    if (res.ok && data.data?.stats) setStats(data.data.stats);
  }, [eventId]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    setRecentlyCreated([]);
    setFilter("all");
    setRefreshToken((token) => token + 1);
  }, [eventId]);

  const upsertRecent = useCallback((card: SearchResultCard) => {
    setRecentlyCreated((current) => {
      if (card.archivedAt) {
        return current.filter((existing) => existing.invitationId !== card.invitationId);
      }
      return [
        card,
        ...current.filter((existing) => existing.invitationId !== card.invitationId),
      ];
    });
  }, []);

  function bumpList() {
    setRefreshToken((token) => token + 1);
    void loadStats();
  }

  function handleCardChanged(card: SearchResultCard) {
    upsertRecent(card);
    bumpList();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Guest CRM</h1>
          <p className="page-subtitle">
          Add guests, tag relationships for seating (organizer-only), edit details, or archive — one list for all of it.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/guests/import">
            <Upload className="h-4 w-4" /> Bulk import
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {eventId && stats.total > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
              {[
                { key: "all", label: "All", count: stats.total },
                ...CRM_STATUSES.map((s) => ({
                  key: s,
                  label: s.replace("_", " "),
                  count: stats.counts[s] ?? 0,
                })),
                { key: "NO_RESPONSE", label: "No Response", count: stats.noResponse },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setFilter(s.key)}
                  className={`rounded-xl border p-3 text-center text-xs transition-colors ${
                    filter === s.key
                      ? "border-[#0B8A83] bg-[#0B8A83]/10"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-lg font-bold">{s.count}</p>
                  <p className="mt-0.5 capitalize text-slate-500">{s.label}</p>
                </button>
              ))}
            </div>
          )}

          <SmartGuestSearch
            eventId={eventId}
            recentlyCreated={recentlyCreated}
            statusFilter={filter}
            refreshToken={refreshToken}
            onCardChanged={handleCardChanged}
          />
        </div>

        <div className="lg:col-span-2">
          <QuickCreateCard
            eventId={eventId}
            onCreated={(card) => {
              upsertRecent(card);
              bumpList();
            }}
            onChanged={handleCardChanged}
          />
        </div>
      </div>
    </div>
  );
}
