"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GuestResultCard } from "./guest-result-card";
import {
  MIN_QUERY_LENGTH,
  highlightRanges,
  parseSearchQuery,
} from "@/lib/guest-search/query";
import type { SearchResponse, SearchResultCard } from "@/lib/guest-search/types";

/**
 * Smart Guest Search.
 *
 * One box. A name, a phone number, an email, an admission code or a table all
 * work, because at the door there is no time to pick the right filter first.
 *
 * Two details matter more than they look:
 *
 *  - Requests are debounced *and* superseded. A slow response for "kof" must
 *    never overwrite a fast one for "kofi", or the list flickers backwards
 *    while the organiser is still reading it.
 *  - Newly created invitations are merged into the top of the list even when
 *    the current query would not match them, so "create then find" is one
 *    continuous flow.
 */

const DEBOUNCE_MS = 220;

interface SmartGuestSearchProps {
  eventId: string | null;
  /** Invitations created this session, shown above search results. */
  recentlyCreated: SearchResultCard[];
  onCardChanged: (card: SearchResultCard) => void;
}

export function SmartGuestSearch({
  eventId,
  recentlyCreated,
  onCardChanged,
}: SmartGuestSearchProps) {
  const [term, setTerm] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  // Monotonic request id: only the newest response is allowed to win.
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseSearchQuery(term), [term]);
  const active = term.trim().length >= MIN_QUERY_LENGTH;

  const runSearch = useCallback(
    async (query: string, archived: boolean, signal: AbortSignal) => {
      if (!eventId) return;
      const id = ++requestId.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ eventId, q: query, limit: "20" });
        if (archived) params.set("includeArchived", "1");
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
    [eventId]
  );

  useEffect(() => {
    if (!eventId || !active) {
      setResponse(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => void runSearch(term, includeArchived, controller.signal), DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term, eventId, includeArchived, active, runSearch]);

  // Keyboard shortcut: "/" focuses search, the way every list app the
  // organiser already uses behaves.
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
  const pinned = recentlyCreated.filter((card) => !shownIds.has(card.invitationId));

  return (
    <div className="space-y-3">
      <div className="relative">
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
          className="h-12 w-full rounded-xl border border-slate-200 bg-white/80 pl-10 pr-20 text-sm shadow-sm transition-all placeholder:text-slate-400 focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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

      {active && (
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300"
          />
          Include archived invitations
        </label>
      )}

      {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-600">{error}</p>}

      {pinned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Just created
          </p>
          {pinned.map((card) => (
            <GuestResultCard key={card.invitationId} card={card} onChanged={onCardChanged} />
          ))}
        </div>
      )}

      {active && !loading && results.length === 0 && !error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-500">
              Nobody matches &ldquo;{term}&rdquo;.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Create them below — a name on its own is enough.
            </p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {response?.total ?? results.length} match
            {(response?.total ?? results.length) === 1 ? "" : "es"}
            {response && response.total > results.length ? ` · showing ${results.length}` : ""}
          </p>
          {results.map((card) => (
            <GuestResultCard
              key={card.invitationId}
              card={card}
              highlight={highlightRanges(card.name, parsed)}
              onChanged={onCardChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}
