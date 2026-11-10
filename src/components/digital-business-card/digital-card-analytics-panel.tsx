"use client";

import { useEffect, useState } from "react";

type Analytics = {
  viewCount: number;
  qrOpens: number;
  nfcTaps: number;
  vcardSaves: number;
  callTaps: number;
  whatsappTaps: number;
  emailTaps?: number;
  websiteTaps: number;
  shares: number;
  connects: number;
  reconnects: number;
};

export function DigitalCardAnalyticsPanel({ cardId }: { cardId: string | null }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) {
      setData(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setError(null);
      const res = await fetch(`/api/digital-business-cards/${cardId}/analytics`);
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error || "Could not load analytics");
        return;
      }
      setData(json.data as Analytics);
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (!cardId) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Activity</p>
      <p className="text-xs text-slate-500">
        Public opens and published actions. These counts are not the recipient’s identity.
      </p>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {!data && !error ? <p className="mt-3 text-xs text-slate-500">Loading activity…</p> : null}
      {data ? (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Profile views</dt>
            <dd className="font-semibold text-slate-900">{data.viewCount}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">QR opens</dt>
            <dd className="font-semibold text-slate-900">{data.qrOpens}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">NFC taps</dt>
            <dd className="font-semibold text-slate-900">{data.nfcTaps}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Save contact</dt>
            <dd className="font-semibold text-slate-900">{data.vcardSaves}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Calls</dt>
            <dd className="font-semibold text-slate-900">{data.callTaps}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">WhatsApp</dt>
            <dd className="font-semibold text-slate-900">{data.whatsappTaps}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Email</dt>
            <dd className="font-semibold text-slate-900">{data.emailTaps ?? 0}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Website</dt>
            <dd className="font-semibold text-slate-900">{data.websiteTaps}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Shares</dt>
            <dd className="font-semibold text-slate-900">{data.shares}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] text-slate-500">Connections</dt>
            <dd className="font-semibold text-slate-900">{data.connects + data.reconnects}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
