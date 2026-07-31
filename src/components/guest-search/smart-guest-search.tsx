"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination";
import { GuestResultCard } from "./guest-result-card";
import {
  MIN_QUERY_LENGTH,
  highlightRanges,
  parseSearchQuery,
} from "@/lib/guest-search/query";
import type { SearchResponse, SearchResultCard } from "@/lib/guest-search/types";

/**
 * Smart Guest Search + guest list.
 *
 * One box. A name, a phone number, an email, an admission code or a table all
 * work. With an empty box the same surface browses the live guest list for the
 * selected event only — never mixed with another celebration — 15 at a time.
 */

const DEBOUNCE_MS = 220;
const BROWSE_LIMIT = 15;
const SEARCH_LIMIT = 20;

interface SmartGuestSearchProps {
  eventId: string | null;
  /** Invitations created this session, shown above search results. */
  recentlyCreated: SearchResultCard[];
  onCardChanged: (card: SearchResultCard) => void;
  /** Optional RSVP/status filter applied server-side so every page stays complete. */
  statusFilter?: string;
  /** Bump to reload browse/search results after a create/edit/delete. */
  refreshToken?: number;
}

export function SmartGuestSearch({
  eventId,
  recentlyCreated,
  onCardChanged,
  statusFilter = "all",
  refreshToken = 0,
}: SmartGuestSearchProps) {
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseSearchQuery(term), [term]);
  const searching = term.trim().length >= MIN_QUERY_LENGTH;

  const runSearch = useCallback(
    async (query: string, archived: boolean, nextPage: number, signal: AbortSignal) => {
      if (!eventId) return;
      const id = ++requestId.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          eventId,
          q: query,
          limit: String(searching ? SEARCH_LIMIT : BROWSE_LIMIT),
          // Always include general passes so organizers see every invitation for the event.
          includeGeneralPasses: "1",
        });
        if (!searching) params.set("page", String(nextPage));
        if (archived) params.set("includeArchived", "1");
        if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
        const res = await fetch(`/api/guest-search?${params}`, { signal });
        const json = await res.json();
        if (id !== requestId.current) return;
        if (!res.ok) {
          setError(json.error ?? "Search failed.");
          setResponse(null);
          return;
        }
        setError("");
        setResponse(json.data as SearchResponse);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        if (id !== requestId.current) return;
        setError("Could not reach the server.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [eventId, searching, statusFilter]
  );

  // Switching events must drop the previous celebration's rows immediately.
  useEffect(() => {
    setResponse(null);
    setTerm("");
    setPage(1);
    setError("");
    setIncludeArchived(false);
  }, [eventId]);

  useEffect(() => {
    setPage(1);
  }, [term, includeArchived, statusFilter]);

  useEffect(() => {
    if (!eventId) {
      setResponse(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(
      () => void runSearch(term, includeArchived, page, controller.signal),
      searching ? DEBOUNCE_MS : 0
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term, eventId, includeArchived, searching, runSearch, refreshToken, page]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typingElsewhere =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "/" && !typingElsewhere) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = response?.results ?? [];
  const shownIds = new Set(results.map((r) => r.invitationId));
  const pinned = recentlyCreated.filter(
    (card) =>
      !shownIds.has(card.invitationId) &&
      (includeArchived || !card.archivedAt) &&
      (statusFilter === "all" ||
        (statusFilter === "NO_RESPONSE"
          ? !card.guestStatus ||
            !["ACCEPTED", "DECLINED", "MAYBE", "CHECKED_IN", "OPENED"].includes(card.guestStatus)
          : card.guestStatus === statusFilter))
  );

  const browseTotal = response?.total ?? 0;
  const browsePages = response?.pages ?? Math.max(1, Math.ceil(browseTotal / BROWSE_LIMIT));
  const browsePage = response?.page ?? page;
  const archivedHidden = response?.archivedHiddenCount ?? 0;

  return (
    <div className="min-w-0 space-y-3">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          disabled={!eventId}
          placeholder="Search a name, phone, email, admission code or table"
          aria-label="Search guests"
          autoComplete="off"
          className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white/80 pl-10 pr-20 text-sm shadow-sm transition-all placeholder:text-slate-400 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Clear search"
              className="text-slate-400 transition-colors hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!term && (
            <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block">
              /
            </kbd>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300"
          />
          Include archived invitations
        </label>
        {!includeArchived && archivedHidden > 0 && (
          <button
            type="button"
            className="text-amber-800 underline-offset-2 hover:underline"
            onClick={() => setIncludeArchived(true)}
          >
            {archivedHidden.toLocaleString()} archived hidden — show them
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-600">{error}</p>}

      {pinned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Just created
          </p>
          {pinned.map((card) => (
            <GuestResultCard
              key={card.invitationId}
              eventId={eventId!}
              card={card}
              onChanged={onCardChanged}
            />
          ))}
        </div>
      )}

      {!eventId && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            Select an event to manage guests.
          </CardContent>
        </Card>
      )}

      {eventId && searching && !loading && results.length === 0 && !error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-500">Nobody matches &ldquo;{term}&rdquo;.</p>
            <p className="mt-1 text-xs text-slate-400">
              Add them with the form — a name on its own is enough.
            </p>
          </CardContent>
        </Card>
      )}

      {eventId && !searching && !loading && results.length === 0 && pinned.length === 0 && !error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-500">No guests yet for this event.</p>
            <p className="mt-1 text-xs text-slate-400">
              Add a guest invitation above to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {searching
              ? `${response?.total ?? results.length} match${
                  (response?.total ?? results.length) === 1 ? "" : "es"
                }`
              : `Guest list · ${browseTotal.toLocaleString()} for this event`}
          </p>
          {results.map((card) => (
            <GuestResultCard
              key={card.invitationId}
              eventId={eventId!}
              card={card}
              highlight={searching ? highlightRanges(card.name, parsed) : undefined}
              onChanged={onCardChanged}
            />
          ))}
          {!searching && browseTotal > BROWSE_LIMIT && (
            <PaginationBar
              page={browsePage}
              pages={browsePages}
              total={browseTotal}
              limit={BROWSE_LIMIT}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
