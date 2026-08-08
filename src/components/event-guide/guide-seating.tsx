"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  seatDisplayName,
  tableCaptionValue,
  tableDisplayName,
} from "@/lib/seating/seating-types";
import type { GuideSeatingConfig, GuideSeatingMatch } from "@/lib/event-guide/types";
import { ChairGlyph, PAPER_WASH, RoundTable, SprigDivider } from "./guide-motifs";

type Fonts = { heading: string; body: string; eyebrow: string; script: string };

type SeatingResponse = {
  status: "ok" | "no_match" | "ambiguous" | "query_too_short" | "disabled" | "rate_limited";
  match?: GuideSeatingMatch;
  message?: string;
  minQueryLength?: number;
};

/** Chairs drawn beside a party, capped so a large table stays a row not a wall. */
const MAX_DRAWN_CHAIRS = 10;

/** Long enough that a name is typed, not spelled out one request per letter. */
const SUGGEST_DEBOUNCE_MS = 220;

/**
 * Seat lookup, set as finding your seat rather than as querying a database.
 *
 * A guest opens this standing in a doorway with a plate in one hand. What they
 * want is one number, large. So the answer is a seat card: the table drawn as
 * it is laid — a round top with chairs around it — with their number set in
 * the middle of it, and everything else small underneath.
 *
 * Always server-backed: the guest list never ships to the browser, so this tab
 * needs a connection. When offline it says so plainly and stops — no spinner,
 * no request that will hang, and the programme and menu keep working.
 *
 * The privacy promise is unchanged and stated on the card: a lookup returns
 * the guest's own party and nothing else, and nothing is kept on the phone.
 */
export function GuideSeating({
  publicToken,
  config,
  offline,
  fonts,
}: {
  publicToken: string;
  config: GuideSeatingConfig;
  offline: boolean;
  fonts: Fonts;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GuideSeatingMatch | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [dismissed, setDismissed] = useState(false);

  const listId = useId();
  // Set while a suggestion is being applied, so the effect that would fetch a
  // fresh list for the text we just filled in does not reopen the menu.
  const applying = useRef(false);

  const byCode = config.mode === "ADMISSION_CODE";
  const tooShort = query.trim().length < config.minQueryLength;

  const search = useCallback(
    async (value: string) => {
      setLoading(true);
      setMessage(null);
      setResult(null);
      setSuggestions([]);
      setActive(-1);
      try {
        const response = await fetch(
          `/api/public/event-guide/${encodeURIComponent(publicToken)}/seating`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: value }),
          }
        );
        const body = (await response.json()) as SeatingResponse;
        if (body.status === "ok" && body.match) {
          setResult(body.match);
          return;
        }
        setMessage(body.message ?? "We could not complete that search. Please try again.");
      } catch {
        setMessage("We could not reach the seating list. Please check your connection.");
      } finally {
        setLoading(false);
      }
    },
    [publicToken]
  );

  /*
   * Suggestions while typing.
   *
   * Name mode only, and only once enough has been typed for the server to
   * answer — the same floor the lookup itself enforces. Each keystroke aborts
   * the request before it, so a fast typist gets one answer rather than a race
   * between six of them.
   */
  useEffect(() => {
    if (byCode || tooShort || dismissed) {
      setSuggestions([]);
      return;
    }
    if (applying.current) {
      applying.current = false;
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(`/api/public/event-guide/${encodeURIComponent(publicToken)}/seating/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { suggestions: [] }))
        .then((body: { suggestions?: unknown }) => {
          const names = Array.isArray(body.suggestions)
            ? body.suggestions.filter((name): name is string => typeof name === "string")
            : [];
          setSuggestions(names);
          setActive(-1);
        })
        .catch(() => undefined);
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, byCode, tooShort, dismissed, publicToken]);

  const choose = (name: string) => {
    applying.current = true;
    setQuery(name);
    setSuggestions([]);
    setActive(-1);
    void search(name);
  };

  const open = suggestions.length > 0 && !loading;

  if (offline) {
    return (
      <div
        data-testid="event-guide-seating-offline"
        className="rounded-2xl border px-5 py-8 text-center"
        style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
      >
        <RoundTable
          className="mx-auto h-14 w-14 opacity-40"
          style={{ color: "var(--guide-secondary)" }}
        />
        <p
          className="mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em]"
          style={{ fontFamily: fonts.eyebrow, color: "var(--guide-label, var(--guide-secondary))" }}
        >
          Needs a connection
        </p>
        <p className="mt-3 text-[0.95rem] leading-relaxed">
          Seat lookup keeps everyone&rsquo;s details private by checking with the hosts&rsquo;
          system, so it needs an internet connection.
        </p>
        <p className="mt-2 text-[0.86rem] opacity-75">
          Your programme and menu are saved and available right now.
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <SeatCard
        match={result}
        fonts={fonts}
        onReset={() => {
          setResult(null);
          setQuery("");
        }}
      />
    );
  }

  return (
    <div data-testid="event-guide-seating">
      <div
        className="rounded-[1.6rem] border p-1.5"
        style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
      >
        <div
          className="rounded-[1.25rem] border px-5 py-6 sm:px-7"
          style={{
            borderColor: "var(--guide-hairline)",
            backgroundImage:
              "radial-gradient(115% 90% at 50% 0%, var(--guide-hairline), transparent 72%)",
          }}
        >
          <RoundTable
            className="mx-auto h-16 w-16"
            style={{ color: "var(--guide-secondary)" }}
          />
          <h2
            className="mt-3 text-center text-[0.74rem] font-semibold uppercase tracking-[0.3em]"
            style={{
              fontFamily: fonts.eyebrow,
              color: "var(--guide-label, var(--guide-secondary))",
            }}
          >
            Find your seat
          </h2>
          <p className="mx-auto mt-2.5 max-w-sm text-center text-[0.9rem] leading-relaxed opacity-85">
            {config.note ??
              (byCode
                ? "Enter the code from your invitation and we will show you to your table."
                : "Enter the name on your invitation and we will show you to your table.")}
          </p>

          <SprigDivider className="mx-auto my-5 h-4 w-36 opacity-60" />

          <label
            htmlFor="guide-seat-query"
            className="block text-center text-[0.68rem] font-semibold uppercase tracking-[0.2em]"
            style={{
              fontFamily: fonts.eyebrow,
              color: "var(--guide-label, var(--guide-secondary))",
            }}
          >
            {byCode ? "Your admission code" : "Your name"}
          </label>

          <div className="relative">
            <input
              id="guide-seat-query"
              value={query}
              onChange={(event) => {
                setDismissed(false);
                setQuery(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setDismissed(true);
                  setSuggestions([]);
                  setActive(-1);
                  return;
                }
                if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                  event.preventDefault();
                  const step = event.key === "ArrowDown" ? 1 : -1;
                  setActive((current) => {
                    const next = current + step;
                    if (next < 0) return suggestions.length - 1;
                    if (next >= suggestions.length) return 0;
                    return next;
                  });
                  return;
                }
                if (event.key !== "Enter") return;
                event.preventDefault();
                // A highlighted name is what Enter means; otherwise Enter is
                // still the search it has always been.
                if (open && active >= 0 && suggestions[active]) {
                  choose(suggestions[active]!);
                  return;
                }
                if (!tooShort && !loading) void search(query);
              }}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                open && active >= 0 ? `${listId}-option-${active}` : undefined
              }
              inputMode={byCode ? "numeric" : "text"}
              // The browser's own autofill menu would cover ours.
              autoComplete={byCode ? "one-time-code" : "off"}
              placeholder={byCode ? "e.g. 123 456" : "e.g. Ama Mensah"}
              className="mt-2.5 w-full rounded-xl border px-4 py-3 text-center text-[1.05rem] outline-none focus:ring-2 focus:ring-offset-0"
              style={{
                borderColor: "var(--guide-hairline)",
                background: "var(--guide-paper)",
                color: "var(--guide-text)",
                letterSpacing: byCode ? "0.16em" : undefined,
              }}
            />

            {open ? (
              <ul
                id={listId}
                role="listbox"
                data-testid="event-guide-seating-suggestions"
                aria-label="Matching names"
                className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border shadow-lg"
                style={{
                  borderColor: "var(--guide-hairline)",
                  background: "var(--guide-paper)",
                  backgroundImage: PAPER_WASH,
                }}
              >
                {suggestions.map((name, index) => (
                  <li key={name} role="none">
                    <button
                      type="button"
                      id={`${listId}-option-${index}`}
                      role="option"
                      aria-selected={index === active}
                      // The input keeps focus, so the blur must not fire first.
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(name)}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[0.95rem] transition-colors"
                      style={{
                        background:
                          index === active ? "var(--guide-hairline)" : "transparent",
                        color: "var(--guide-text)",
                      }}
                    >
                      <ChairGlyph
                        className="h-4 w-4 shrink-0 opacity-60"
                        style={{ color: "var(--guide-secondary)" }}
                      />
                      <span className="truncate">{name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <button
            type="button"
            disabled={tooShort || loading}
            onClick={() => void search(query)}
            className="mt-3 w-full rounded-full px-4 py-3 text-[0.84rem] font-bold uppercase tracking-[0.14em] transition-opacity disabled:opacity-45"
            style={{ background: "var(--guide-accent)", color: "var(--guide-on-accent)" }}
          >
            {loading ? "Checking…" : "Find my table"}
          </button>

          {tooShort && query.length > 0 ? (
            <p className="mt-3 text-center text-[0.82rem] opacity-70">
              Please enter at least {config.minQueryLength} characters.
            </p>
          ) : null}
          {message ? (
            <>
              <p
                role="status"
                className="mt-3 text-center text-[0.85rem]"
                style={{ color: "var(--guide-primary)" }}
              >
                {message}
              </p>
              {!byCode ? (
                // The list holds the name on the invitation, which is often
                // fuller than the one a guest goes by.
                <p className="mt-1.5 text-center text-[0.78rem] leading-relaxed opacity-65">
                  Try the name on your invitation — a first name on its own will
                  suggest the rest.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <p className="mt-4 px-2 text-center text-[0.72rem] leading-relaxed opacity-60">
        Other guests&rsquo; seats are never shown, and no guest list is stored on your phone.
      </p>
    </div>
  );
}

/**
 * The answer, as a card a guest could have found waiting on their plate.
 *
 * The table is drawn once, large, with the number set inside it — that is the
 * one thing they came for and it should be readable across a hall. The seat,
 * the zone and the people they are seated with are the small print under it.
 */
function SeatCard({
  match,
  fonts,
  onReset,
}: {
  match: GuideSeatingMatch;
  fonts: Fonts;
  onReset: () => void;
}) {
  const seal = match.tableNumber ? tableCaptionValue(match.tableNumber) : null;
  // A "12" carries at full size; a "Bougainvillea" has to come down to fit
  // inside the drawn table top.
  const sealSize =
    !seal || seal.length <= 2
      ? "text-[2.1rem]"
      : seal.length <= 4
        ? "text-[1.6rem]"
        : "text-[1.05rem]";

  return (
    <div data-testid="event-guide-seating-result">
      <div
        className="rounded-[1.6rem] border p-1.5"
        style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
      >
        <div
          className="rounded-[1.25rem] border px-5 py-7 text-center sm:px-7"
          style={{
            borderColor: "var(--guide-hairline)",
            backgroundImage:
              "radial-gradient(115% 90% at 50% 0%, var(--guide-hairline), transparent 74%)",
          }}
        >
          <p
            className="text-[0.68rem] font-semibold uppercase tracking-[0.24em]"
            style={{
              fontFamily: fonts.eyebrow,
              color: "var(--guide-label, var(--guide-secondary))",
            }}
          >
            Reserved for
          </p>
          <p className="mt-1.5 text-[1.45rem] leading-tight" style={{ fontFamily: fonts.script }}>
            {match.partyName}
          </p>

          {match.tableNumber ? (
            <figure className="mt-6">
              <div className="relative mx-auto h-[9rem] w-[9rem]">
                <RoundTable
                  className="absolute inset-0 h-full w-full"
                  style={{ color: "var(--guide-secondary)" }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
                  <span
                    className="text-[0.52rem] font-semibold uppercase tracking-[0.22em] opacity-70"
                    style={{ fontFamily: fonts.eyebrow }}
                  >
                    Table
                  </span>
                  <span
                    className={`mt-0.5 text-balance leading-none ${sealSize}`}
                    style={{ fontFamily: fonts.heading, color: "var(--guide-primary)" }}
                  >
                    {seal}
                  </span>
                </div>
              </div>
              <figcaption className="mt-3.5">
                <p
                  className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]"
                  style={{
                    fontFamily: fonts.eyebrow,
                    color: "var(--guide-label, var(--guide-secondary))",
                  }}
                >
                  {tableDisplayName(match.tableNumber)}
                </p>
                {match.seatLabel || match.zone ? (
                  <p className="mt-1 text-[0.88rem] opacity-80">
                    {[match.seatLabel ? seatDisplayName(match.seatLabel) : null, match.zone]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                ) : null}
              </figcaption>
            </figure>
          ) : null}

          {match.ceremonyRowLabel ? (
            <div className="mt-6">
              <SprigDivider className="mx-auto mb-4 h-4 w-32 opacity-55" />
              <p
                className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] opacity-75"
                style={{ fontFamily: fonts.eyebrow }}
              >
                At the ceremony
              </p>
              <p
                className="mt-1 text-[1.55rem] leading-tight"
                style={{ fontFamily: fonts.heading, color: "var(--guide-primary)" }}
              >
                {match.ceremonyRowLabel}
              </p>
              {match.ceremonySeatLabel ? (
                <p className="mt-1 text-[0.88rem] opacity-80">
                  {seatDisplayName(match.ceremonySeatLabel)}
                </p>
              ) : null}
            </div>
          ) : null}

          {!match.tableNumber && !match.ceremonyRowLabel ? (
            <div className="mt-6">
              <RoundTable
                className="mx-auto h-16 w-16 opacity-40"
                style={{ color: "var(--guide-secondary)" }}
              />
              <p className="mt-4 text-[0.92rem] leading-relaxed opacity-80">
                Your seat has not been assigned yet. Please ask a member of the host team.
              </p>
            </div>
          ) : null}

          {match.partyMembers.length > 0 ? (
            <div className="mt-7 border-t pt-5" style={{ borderColor: "var(--guide-hairline)" }}>
              <PartyChairs count={match.partyMembers.length + match.plusOnes} />
              <p
                className="mt-3 text-[0.66rem] font-semibold uppercase tracking-[0.2em] opacity-75"
                style={{ fontFamily: fonts.eyebrow }}
              >
                Seated together
              </p>
              <p className="mt-2 text-[0.92rem] leading-relaxed">
                {match.partyMembers.join("  ·  ")}
                {match.plusOnes > 0
                  ? `  ·  +${match.plusOnes} guest${match.plusOnes === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 w-full text-[0.82rem] font-semibold underline-offset-4 hover:underline"
        style={{ color: "var(--guide-accent)" }}
      >
        Look up another
      </button>

      <p className="mt-3 px-2 text-center text-[0.72rem] leading-relaxed opacity-60">
        Only your own party is ever shown, and nothing is stored on your phone.
      </p>
    </div>
  );
}

/** One chair per seat in the party — the row a guest is walking towards. */
function PartyChairs({ count }: { count: number }) {
  const drawn = Math.min(Math.max(count, 1), MAX_DRAWN_CHAIRS);
  return (
    <div
      aria-hidden
      className="flex flex-wrap items-end justify-center gap-1.5"
      style={{ color: "var(--guide-secondary)" }}
    >
      {Array.from({ length: drawn }, (_, index) => (
        <ChairGlyph key={index} className="h-[1.1rem] w-[1.1rem] opacity-70" />
      ))}
      {count > drawn ? (
        <span className="pl-0.5 text-[0.72rem] font-semibold tabular-nums opacity-70">
          +{count - drawn}
        </span>
      ) : null}
    </div>
  );
}
