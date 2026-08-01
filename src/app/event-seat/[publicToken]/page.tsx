"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { GuestSeatingCard } from "@/components/seating/guest-seating-card";
import type { InvitationDesignConfig } from "@/types/invitation-design";

const FALLBACK_DESIGN: InvitationDesignConfig = {
  layout: "classic-gold",
  colors: {
    primary: "#0B8A83",
    secondary: "#D4A63A",
    accent: "#0B8A83",
    background: "#FFFFFF",
    text: "#0F172A",
  },
  fonts: { heading: "Cinzel", body: "Cormorant Garamond" },
};

/**
 * Event-wide seating lookup QR destination.
 * Never reveals the guest list — requires personal pass code / invite token.
 */
export default function EventSeatLookupPage() {
  const params = useParams();
  const publicToken = params.publicToken as string;
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    guestName: string;
    eventTitle: string;
    tableNumber?: string | null;
    seatLabel?: string | null;
    zone?: string | null;
    ceremonyRowLabel?: string | null;
    ceremonySeatLabel?: string | null;
    design?: InvitationDesignConfig;
  } | null>(null);

  async function verify() {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/event-seat/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken, code }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error ?? "Could not verify your pass");
        return;
      }
      setData(payload.data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-12" data-testid="event-seat-lookup">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Find Your Seat</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-slate-900">Your table & seat</h1>
      <p className="mt-2 text-sm text-slate-600">
        Scan and enter your personal pass code to view your table and seat. Other guests’ seats are
        never shown.
      </p>

      {!data ? (
        <div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Personal admission code
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-lg tracking-widest"
            placeholder="e.g. 123 456"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <button
            type="button"
            disabled={loading || code.trim().length < 4}
            onClick={() => void verify()}
            className="w-full rounded-full bg-teal-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "Checking…" : "Reveal my seat"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-8">
          <GuestSeatingCard
            design={data.design ?? FALLBACK_DESIGN}
            guestName={data.guestName}
            tableNumber={data.tableNumber}
            seatLabel={data.seatLabel}
            zone={data.zone}
            ceremonyRowLabel={data.ceremonyRowLabel}
            ceremonySeatLabel={data.ceremonySeatLabel}
            settings={{ revealMode: "immediate" }}
            isPortal
            variant="full"
          />
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-slate-500 underline-offset-4 hover:underline"
            onClick={() => {
              setData(null);
              setCode("");
            }}
          >
            Check another code
          </button>
        </div>
      )}
    </main>
  );
}
