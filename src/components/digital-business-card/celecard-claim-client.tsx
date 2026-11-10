"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CeleCardClaimClient({ token, signedIn }: { token: string; signedIn: boolean }) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const next = `/card/claim/${encodeURIComponent(token)}`;

  async function claim() {
    setStatus("working");
    const res = await fetch("/api/digital-business-cards/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(payload.error || "This card could not be claimed.");
      return;
    }
    setStatus("done");
    setMessage("This CeleYou is now on your dashboard.");
    window.location.assign("/dashboard/business-card");
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B8A83]">CeleYou</p>
      <h1 className="font-display text-3xl font-bold text-slate-900">Claim your CeleYou</h1>
      <p className="text-sm text-slate-600">
        Sign in with the invited email address. Claiming does not create a password for someone else and does not take over another account.
      </p>
      {!signedIn ? (
        <Button asChild>
          <Link href={`/auth/onboarding?intent=celecard&next=${encodeURIComponent(next)}`}>
            Continue with the invited email
          </Link>
        </Button>
      ) : (
        <Button onClick={claim} disabled={status === "working" || status === "done"}>
          {status === "working" ? "Claiming…" : "Claim this CeleYou"}
        </Button>
      )}
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
