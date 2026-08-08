"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { RotateCcw, Upload, QrCode, Shield } from "lucide-react";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { SmartGuestSearch } from "@/components/guest-search/smart-guest-search";
import { QuickCreateCard } from "@/components/guest-search/quick-create-card";
import { AdmissionIdentityAuditPanel } from "@/components/guest-search/admission-identity-audit-panel";
import { VendorTeamPassesPanel } from "@/components/vendor-pass/vendor-team-passes-panel";
import type { SearchResultCard } from "@/lib/guest-search/types";

const CRM_STATUSES = ["INVITED", "OPENED", "ACCEPTED", "DECLINED", "MAYBE", "CHECKED_IN"] as const;

/**
 * Guest CRM — one create path, one list.
 *
 * Add Guest creates a personalised invitation. The same GuestResultCard list
 * (browse + search) is where organisers and admins edit or delete afterwards.
 */
export default function GuestsPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 py-12 text-center">Loading guests…</p>}>
      <GuestsPageInner />
    </Suspense>
  );
}

function GuestsPageInner() {
  const searchParams = useSearchParams();
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [stats, setStats] = useState({ counts: {} as Record<string, number>, total: 0, noResponse: 0 });
  const [filter, setFilter] = useState<string>("all");
  const [refreshToken, setRefreshToken] = useState(0);
  const [recentlyCreated, setRecentlyCreated] = useState<SearchResultCard[]>([]);
  const [resettingAll, setResettingAll] = useState(false);
  const [resetError, setResetError] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [crmTab, setCrmTab] = useState<"guests" | "vendors">("guests");
  const [vendorCreateOpen, setVendorCreateOpen] = useState(false);

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus === "rsvp") {
      setFilter("NO_RESPONSE");
      setCrmTab("guests");
    }
  }, [searchParams]);

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
    const focus = searchParams.get("focus");
    setFilter(focus === "rsvp" ? "NO_RESPONSE" : "all");
    setResetError("");
    setRefreshToken((token) => token + 1);
  }, [eventId, searchParams]);

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

  async function resetAllAdmissions() {
    if (!eventId) return;
    const ok = window.confirm(
      "Reset ALL invitation admissions for this event?\n\nEveryone can be scanned again like first entry.\nEvent Companion locks for all until re-admit.\nInvite links start from the invitation intro again."
    );
    if (!ok) return;
    setResettingAll(true);
    setResetError("");
    try {
      const res = await fetch("/api/qr/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "event", eventId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error ?? "Could not reset all admissions.");
        return;
      }
      bumpList();
    } catch {
      setResetError("Could not reach the server.");
    } finally {
      setResettingAll(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Guest CRM</h1>
          <p className="page-subtitle mt-1 max-w-2xl text-sm sm:text-base">
            Select an event to manage only that celebration&apos;s guests — never mixed with another list.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          {eventId && (
            <Button
              type="button"
              className="w-full justify-center sm:w-auto"
              onClick={() => {
                setCrmTab("vendors");
                setVendorCreateOpen(true);
              }}
            >
              <Shield className="h-4 w-4 shrink-0" />
              Generate Vendor Pass
            </Button>
          )}
          {eventId && (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center sm:w-auto"
              onClick={() => setAuditOpen(true)}
            >
              <QrCode className="h-4 w-4 shrink-0" />
              Missing QR &amp; Codes
            </Button>
          )}
          {eventId && (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center border-amber-200 text-amber-900 hover:bg-amber-50 sm:w-auto"
              disabled={resettingAll}
              onClick={() => void resetAllAdmissions()}
            >
              <RotateCcw className="h-4 w-4 shrink-0" />
              {resettingAll ? "Resetting…" : "Reset all admissions"}
            </Button>
          )}
          <Button asChild variant="outline" className="w-full justify-center sm:w-auto">
            <Link href="/dashboard/guests/import">
              <Upload className="h-4 w-4 shrink-0" /> Bulk import
            </Link>
          </Button>
        </div>
      </div>

      {eventId ? (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={crmTab === "guests" ? "default" : "outline"}
            onClick={() => setCrmTab("guests")}
          >
            Guest invitations
          </Button>
          <Button
            type="button"
            size="sm"
            variant={crmTab === "vendors" ? "default" : "outline"}
            onClick={() => setCrmTab("vendors")}
          >
            Vendor &amp; Team Passes
          </Button>
        </div>
      ) : null}

      {eventId ? (
        <AdmissionIdentityAuditPanel
          eventId={eventId}
          open={auditOpen}
          onClose={() => setAuditOpen(false)}
          onChanged={bumpList}
        />
      ) : null}

      {resetError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {resetError}
        </div>
      )}

      <Card className="min-w-0 overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      {crmTab === "vendors" && eventId ? (
        <VendorTeamPassesPanel eventId={eventId} openCreateDefault={vendorCreateOpen} />
      ) : (
        <>
          <div className="min-w-0">
            <QuickCreateCard
              eventId={eventId}
              onCreated={(card) => {
                upsertRecent(card);
                bumpList();
              }}
              onChanged={handleCardChanged}
            />
          </div>

          <div className="min-w-0 space-y-4">
            {eventId && stats.total > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8">
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
                    title={
                      s.key === "all"
                        ? "Expected people including plus-ones / admission allowance"
                        : s.key === "CHECKED_IN"
                          ? "People admitted at the gate (including partial party arrivals)"
                          : undefined
                    }
                    className={`min-w-0 rounded-xl border p-2.5 text-center text-xs transition-colors sm:p-3 ${
                      filter === s.key
                        ? "border-[#0B8A83] bg-[#0B8A83]/10"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-base font-bold tabular-nums sm:text-lg">{s.count}</p>
                    <p className="mt-0.5 leading-tight capitalize text-slate-500">
                      {s.key === "all"
                        ? "All people"
                        : s.key === "CHECKED_IN"
                          ? "Checked in"
                          : s.label}
                    </p>
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
        </>
      )}
    </div>
  );
}
