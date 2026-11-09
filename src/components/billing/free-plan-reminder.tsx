"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type BillingPayload = {
  currentPlan?: string;
  adminFullAccess?: boolean;
};

/**
 * Persistent nudge for organizers still on the 5-guest Free tasting.
 * Hidden for admins and paid plans.
 */
export function FreePlanReminder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/billing")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.success) return;
        const data = d.data as BillingPayload;
        const plan = (data.currentPlan ?? "starter").toLowerCase();
        const onFree = plan === "starter" || plan === "free";
        setShow(onFree && !data.adminFullAccess);
      })
      .catch(() => {
        /* billing endpoint unavailable. Stay quiet */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-brand-50/40 px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">You are on Free. 5 guests, 5 invitations</p>
        <p className="text-sm text-slate-600 mt-0.5">
          Ticketing, WhatsApp, seating, Memory Vault, and premium templates stay locked until you
          upgrade. Starter from ₵450 hosts 75 guests.
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0 gap-1.5">
        <Link href="/pricing">
          See paid plans
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
