"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type TapFlags = {
  tap_mode_enabled: boolean;
  tap_guest_exchange: boolean;
  connect_two_way_exchange: boolean;
  tap_session_ttl_seconds: number;
  tap_session_create_limit: number;
};

export function CeleCardTapAdminForm() {
  const [flags, setFlags] = useState<TapFlags | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/celecard/tap")
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.data) setFlags(json.data as TapFlags);
      })
      .catch(() => undefined);
  }, []);

  async function save() {
    if (!flags) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/celecard/tap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flags),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save Tap Mode");
      setFlags(json.data as TapFlags);
      setMessage("Tap Mode policy saved. Guest contact details were not shown.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save Tap Mode");
    } finally {
      setSaving(false);
    }
  }

  if (!flags) return null;

  return (
    <section className="celecard-admin-desk rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Tap Mode</h2>
      <p className="mt-1 text-xs text-slate-500">
        Pause sessions, guest exchange, or two-way card exchange. Session lifetime is 1 to 15 minutes. This desk never
        shows private guest contact details.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={flags.tap_mode_enabled}
            onChange={(event) => setFlags({ ...flags, tap_mode_enabled: event.target.checked })}
          />
          Tap Mode available
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={flags.tap_guest_exchange}
            onChange={(event) => setFlags({ ...flags, tap_guest_exchange: event.target.checked })}
          />
          Guest exchange
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={flags.connect_two_way_exchange}
            onChange={(event) => setFlags({ ...flags, connect_two_way_exchange: event.target.checked })}
          />
          Two-way CeleYou exchange
        </label>
        <label className="text-sm text-slate-700">
          Session lifetime (seconds)
          <input
            type="number"
            min={60}
            max={900}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={flags.tap_session_ttl_seconds}
            onChange={(event) => setFlags({ ...flags, tap_session_ttl_seconds: Number(event.target.value) })}
          />
        </label>
        <label className="text-sm text-slate-700">
          Session create limit / 5 min
          <input
            type="number"
            min={1}
            max={40}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={flags.tap_session_create_limit}
            onChange={(event) => setFlags({ ...flags, tap_session_create_limit: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="mt-4">
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save Tap Mode"}
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </section>
  );
}
