"use client";

import { useState } from "react";
import { seatDisplayName, tableDisplayName } from "@/lib/seating/seating-types";
import type { GuideSeatingConfig, GuideSeatingMatch } from "@/lib/event-guide/types";

type Fonts = { heading: string; body: string; eyebrow: string; script: string };

type SeatingResponse = {
  status: "ok" | "no_match" | "ambiguous" | "query_too_short" | "disabled" | "rate_limited";
  match?: GuideSeatingMatch;
  message?: string;
  minQueryLength?: number;
};

/**
 * Seat lookup.
 *
 * Always server-backed: the guest list never ships to the browser, so this tab
 * needs a connection. When offline it says so plainly and stops — no spinner,
 * no request that will hang, and the programme and menu keep working.
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

  const byCode = config.mode === "ADMISSION_CODE";
  const tooShort = query.trim().length < config.minQueryLength;

  async function search() {
    setLoading(true);
    setMessage(null);
    setResult(null);
    try {
      const response = await fetch(
        `/api/public/event-guide/${encodeURIComponent(publicToken)}/seating`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
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
  }

  if (offline) {
    return (
      <div
        data-testid="event-guide-seating-offline"
        className="rounded-2xl border px-5 py-8 text-center"
        style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
      >
        <p
          className="text-[0.72rem] font-semibold uppercase tracking-[0.2em]"
          style={{ fontFamily: fonts.eyebrow, color: "var(--guide-secondary)" }}
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
      <div data-testid="event-guide-seating-result">
        <div
          className="rounded-2xl border px-6 py-7 text-center"
          style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
        >
          <p
            className="text-[0.7rem] font-semibold uppercase tracking-[0.22em]"
            style={{ fontFamily: fonts.eyebrow, color: "var(--guide-secondary)" }}
          >
            Reserved for
          </p>
          <p className="mt-2 text-xl" style={{ fontFamily: fonts.script }}>
            {result.partyName}
          </p>

          <div className="mt-6 space-y-4">
            {result.tableNumber ? (
              <SeatFact
                label="Your table"
                value={tableDisplayName(result.tableNumber)}
                detail={result.seatLabel ? seatDisplayName(result.seatLabel) : null}
                zone={result.zone}
                fonts={fonts}
              />
            ) : null}
            {result.ceremonyRowLabel ? (
              <SeatFact
                label="Ceremony"
                value={result.ceremonyRowLabel}
                detail={result.ceremonySeatLabel ? seatDisplayName(result.ceremonySeatLabel) : null}
                zone={null}
                fonts={fonts}
              />
            ) : null}
            {!result.tableNumber && !result.ceremonyRowLabel ? (
              <p className="text-[0.92rem] opacity-80">
                Your seat has not been assigned yet. Please ask a member of the host team.
              </p>
            ) : null}
          </div>

          {result.partyMembers.length > 0 ? (
            <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--guide-hairline)" }}>
              <p
                className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] opacity-70"
                style={{ fontFamily: fonts.eyebrow }}
              >
                Seated together
              </p>
              <p className="mt-2 text-[0.9rem] leading-relaxed">
                {result.partyMembers.join(" · ")}
                {result.plusOnes > 0
                  ? ` · +${result.plusOnes} guest${result.plusOnes === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            setResult(null);
            setQuery("");
          }}
          className="mt-4 w-full text-[0.82rem] font-semibold underline-offset-4 hover:underline"
          style={{ color: "var(--guide-accent)" }}
        >
          Look up another
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="event-guide-seating"
      className="rounded-2xl border px-5 py-6"
      style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
    >
      <label
        htmlFor="guide-seat-query"
        className="block text-[0.7rem] font-semibold uppercase tracking-[0.2em]"
        style={{ fontFamily: fonts.eyebrow, color: "var(--guide-secondary)" }}
      >
        {byCode ? "Your admission code" : "Your name"}
      </label>
      <p className="mt-2 text-[0.86rem] leading-relaxed opacity-80">
        {config.note ??
          (byCode
            ? "Enter the code from your invitation. We will show only your own table."
            : "Enter the name on your invitation. We will show only your own table.")}
      </p>

      <input
        id="guide-seat-query"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !tooShort && !loading) void search();
        }}
        inputMode={byCode ? "numeric" : "text"}
        autoComplete={byCode ? "one-time-code" : "name"}
        placeholder={byCode ? "e.g. 123 456" : "e.g. Ama Mensah"}
        className="mt-4 w-full rounded-xl border px-4 py-3 text-[1.05rem] outline-none"
        style={{
          borderColor: "var(--guide-hairline)",
          background: "transparent",
          color: "var(--guide-text)",
          letterSpacing: byCode ? "0.16em" : undefined,
        }}
      />

      <button
        type="button"
        disabled={tooShort || loading}
        onClick={() => void search()}
        className="mt-3 w-full rounded-full px-4 py-3 text-[0.84rem] font-bold uppercase tracking-[0.14em] transition-opacity disabled:opacity-45"
        style={{ background: "var(--guide-accent)", color: "var(--guide-on-accent)" }}
      >
        {loading ? "Checking…" : "Find my table"}
      </button>

      {tooShort && query.length > 0 ? (
        <p className="mt-3 text-[0.82rem] opacity-70">
          Please enter at least {config.minQueryLength} characters.
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-[0.85rem]" style={{ color: "var(--guide-primary)" }}>
          {message}
        </p>
      ) : null}

      <p className="mt-5 text-[0.72rem] leading-relaxed opacity-60">
        Other guests&rsquo; seats are never shown, and no guest list is stored on your phone.
      </p>
    </div>
  );
}

function SeatFact({
  label,
  value,
  detail,
  zone,
  fonts,
}: {
  label: string;
  value: string;
  detail: string | null;
  zone: string | null;
  fonts: Fonts;
}) {
  return (
    <div>
      <p
        className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] opacity-70"
        style={{ fontFamily: fonts.eyebrow }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-[1.7rem] leading-tight"
        style={{ fontFamily: fonts.heading, color: "var(--guide-primary)" }}
      >
        {value}
      </p>
      {detail || zone ? (
        <p className="mt-1 text-[0.86rem] opacity-75">
          {[detail, zone].filter(Boolean).join("  ·  ")}
        </p>
      ) : null}
    </div>
  );
}
