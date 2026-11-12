"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CeleYouFollowupDelay } from "@/lib/celeyou-connect/followup-copy";

const DELAYS: Array<{ id: CeleYouFollowupDelay; label: string }> = [
  { id: "IMMEDIATE", label: "Immediately" },
  { id: "HOUR", label: "After 1 hour" },
  { id: "DAY", label: "After 24 hours" },
  { id: "CUSTOM", label: "Custom delay" },
];

type Preferences = {
  newConnectionAlerts: boolean;
  exchangeAlerts: boolean;
  followupReminders: boolean;
  weeklySummary: boolean;
  marketingNotifications: boolean;
};

type DeliveryRow = {
  id: string;
  kind: string;
  status: string;
  runAt: string;
  sentAt: string | null;
  lastError: string | null;
  providerAccepted: boolean;
  toEmail: string;
};

type Automation = {
  enabled: boolean;
  subject: string;
  body: string;
  delay: CeleYouFollowupDelay;
  customDelayMinutes: number | null;
  requireFollowupConsent: boolean;
  deliveries?: DeliveryRow[];
  preferences?: Preferences;
};

export function DigitalCardConnectAutomations({ cardId }: { cardId: string | null }) {
  const [data, setData] = useState<Automation | null>(null);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>({
    newConnectionAlerts: true,
    exchangeAlerts: true,
    followupReminders: true,
    weeklySummary: false,
    marketingNotifications: false,
  });
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);

  useEffect(() => {
    if (!cardId) return;
    const ac = new AbortController();
    void fetch(`/api/digital-business-cards/${cardId}/connect-automations`, { signal: ac.signal })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          const next = json.data as Automation;
          setData(next);
          if (next.preferences) setPrefs(next.preferences);
          if (next.deliveries) setDeliveries(next.deliveries);
        }
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, [cardId]);

  if (!cardId || !data) return null;

  async function save(patch: Partial<Automation> & { sendTest?: boolean }) {
    if (!cardId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/digital-business-cards/${cardId}/connect-automations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not save automations.");
        return;
      }
      if (json.data) setData(json.data as Automation);
      if (json.preview) setPreview(json.preview);
      if (patch.sendTest) {
        setNotice(
          json.test?.ok
            ? "Test email accepted by the provider. That is not proof of delivery."
            : "Test email was not accepted. Check Integrations."
        );
      } else {
        setNotice("Follow-up settings saved.");
      }
    } catch {
      setError("Could not save automations.");
    } finally {
      setBusy(false);
    }
  }

  async function savePrefs(patch: Partial<Preferences>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/digital-business-cards/connect-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not save alerts.");
        return;
      }
      if (json.data) setPrefs(json.data as Preferences);
      setNotice("Alert preferences saved.");
    } catch {
      setError("Could not save alerts.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="studio-connect" className="scroll-mt-16 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">Connect automations</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Send a short thank you after someone connects. Off until you enable it. Marketing follow-ups stay off.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={data.enabled}
          onChange={(event) => void save({ enabled: event.target.checked })}
        />
        <span>Enable automatic follow-up</span>
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={data.requireFollowupConsent}
          onChange={(event) => void save({ requireFollowupConsent: event.target.checked })}
        />
        <span>Only email guests who opted in</span>
      </label>
      <div className="space-y-1.5">
        <Label htmlFor="connect-followup-subject">Subject</Label>
        <Input
          id="connect-followup-subject"
          value={data.subject}
          onChange={(event) => setData({ ...data, subject: event.target.value })}
          onBlur={() => void save({ subject: data.subject })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="connect-followup-body">Message</Label>
        <Textarea
          id="connect-followup-body"
          rows={8}
          value={data.body}
          onChange={(event) => setData({ ...data, body: event.target.value })}
          onBlur={() => void save({ body: data.body })}
        />
        <p className="text-[11px] text-slate-500">
          Use {"{{guestName}}"}, {"{{ownerName}}"}, and {"{{profileUrl}}"}.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DELAYS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => void save({ delay: item.id })}
            className={`h-8 whitespace-nowrap rounded-md border px-2.5 text-[11px] font-semibold ${
              data.delay === item.id
                ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                : "border-slate-200 text-slate-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {data.delay === "CUSTOM" ? (
        <div className="space-y-1.5">
          <Label htmlFor="connect-followup-custom">Minutes</Label>
          <Input
            id="connect-followup-custom"
            type="number"
            min={5}
            max={10080}
            value={data.customDelayMinutes ?? 60}
            onChange={(event) =>
              setData({ ...data, customDelayMinutes: Number(event.target.value) || 60 })
            }
            onBlur={() => void save({ customDelayMinutes: data.customDelayMinutes ?? 60 })}
          />
        </div>
      ) : null}
      {preview ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">{preview.subject}</p>
          <pre className="mt-1 whitespace-pre-wrap font-sans">{preview.body}</pre>
        </div>
      ) : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {notice ? <p className="text-xs text-[#0B8A83]">{notice}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void save({ subject: data.subject, body: data.body })}>
          Preview message
        </Button>
        <Button type="button" disabled={busy} onClick={() => void save({ sendTest: true })}>
          Send test email
        </Button>
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">Connection alerts</h3>
        {(
          [
            ["newConnectionAlerts", "New connection alerts"],
            ["exchangeAlerts", "Successful exchange alerts"],
            ["followupReminders", "Follow-up reminders"],
            ["weeklySummary", "Weekly connection summaries"],
            ["marketingNotifications", "Marketing notifications"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={(event) => void savePrefs({ [key]: event.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
        <p className="text-[11px] text-slate-500">
          Marketing stays off unless you opt in. CeleYou never sends marketing from Connect Back by default.
        </p>
      </div>
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">Delivery status</h3>
        {deliveries.length === 0 ? (
          <p className="text-xs text-slate-500">No follow-up emails yet. Enable automatic follow-up to schedule a thank you after someone connects.</p>
        ) : (
          <ul className="space-y-1.5">
            {deliveries.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-100 px-3 py-2 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">{item.kind.replaceAll("_", " ")}</span>
                {" · "}
                {item.status}
                {" · "}
                {item.toEmail}
                {item.providerAccepted ? " · provider accepted" : ""}
                {item.status === "SENT" ? ". Sent means the provider accepted the message, not that it was delivered." : ""}
                {item.lastError ? ` · ${item.lastError}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
