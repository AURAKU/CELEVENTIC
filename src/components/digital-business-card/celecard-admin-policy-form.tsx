"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CeleCardLifecyclePolicy } from "@/lib/digital-business-card/lifecycle";

export function CeleCardAdminPolicyForm({ policy }: { policy: CeleCardLifecyclePolicy }) {
  const [gracePeriodDays, setGracePeriodDays] = useState(String(policy.gracePeriodDays));
  const [expiringSoonDays, setExpiringSoonDays] = useState(String(policy.expiringSoonDays));
  const [reminderOffsetsDays, setReminderOffsetsDays] = useState(policy.reminderOffsetsDays.join(", "));
  const [reconnectBatchHours, setReconnectBatchHours] = useState(String(policy.reconnectBatchHours));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const offsets = reminderOffsetsDays
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isFinite(n));
      const res = await fetch("/api/admin/celecard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gracePeriodDays: Number(gracePeriodDays),
          expiringSoonDays: Number(expiringSoonDays),
          reminderOffsetsDays: offsets,
          reconnectBatchHours: Number(reconnectBatchHours),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save policy");
      setMessage("Policy saved. Financial history was not changed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save policy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Update policy</h2>
      <p className="mt-1 text-xs text-slate-500">Grace, reminders, and reconnect batching. Payments and plan history stay read-only.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Grace period (days)
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={gracePeriodDays}
            onChange={(e) => setGracePeriodDays(e.target.value)}
          />
        </label>
        <label className="text-sm text-slate-700">
          Expiring window (days)
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={expiringSoonDays}
            onChange={(e) => setExpiringSoonDays(e.target.value)}
          />
        </label>
        <label className="text-sm text-slate-700 sm:col-span-2">
          Reminder offsets (days, comma separated)
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={reminderOffsetsDays}
            onChange={(e) => setReminderOffsetsDays(e.target.value)}
          />
        </label>
        <label className="text-sm text-slate-700">
          Reconnect batch (hours)
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={reconnectBatchHours}
            onChange={(e) => setReconnectBatchHours(e.target.value)}
          />
        </label>
      </div>
      <Button type="button" className="mt-4 bg-[#0B8A83] hover:bg-[#097a74]" disabled={saving} onClick={() => void save()}>
        Save policy
      </Button>
      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
