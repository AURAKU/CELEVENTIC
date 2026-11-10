"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ConnectionRow = {
  id: string;
  visitorName: string;
  visitorEmail: string | null;
  visitorPhone: string | null;
  source: string;
  createdAt: string;
};

export function DigitalCardConnectionInbox({ cardId }: { cardId: string | null }) {
  const [items, setItems] = useState<ConnectionRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (nextPage = 1) => {
      if (!cardId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/digital-business-cards/${cardId}/connections?page=${nextPage}`);
        const json = await res.json();
        if (res.ok) {
          setItems((json.data?.items ?? []) as ConnectionRow[]);
          setTotal(json.data?.total ?? 0);
          setPageSize(json.data?.pageSize ?? 20);
          setPage(nextPage);
        }
      } finally {
        setLoading(false);
      }
    },
    [cardId]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  if (!cardId) return null;

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Connection requests</p>
      <p className="text-xs text-slate-500">
        Courtesy reconnects and Connect Back. Contact details appear only when the visitor chose to share them.
      </p>
      {loading && items.length === 0 ? <p className="mt-3 text-xs text-slate-500">Loading…</p> : null}
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const contact = [item.visitorEmail, item.visitorPhone].filter(Boolean).join(" · ");
          return (
            <li key={item.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <p className="font-medium text-slate-800">{item.visitorName}</p>
              {contact ? <p className="text-[11px] text-slate-600">{contact}</p> : (
                <p className="text-[11px] text-slate-500">Anonymous request</p>
              )}
              <p className="text-[11px] text-slate-500">
                {item.source === "courtesy_reconnect" ? "Courtesy reconnect" : "Connect Back"} ·{" "}
                {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </li>
          );
        })}
      </ul>
      {items.length === 0 && !loading ? (
        <p className="mt-3 text-xs text-slate-500">No requests yet.</p>
      ) : null}
      {total > pageSize ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            Page {page} of {lastPage} · {total} total
          </p>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="ghost" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={page >= lastPage || loading}
              onClick={() => void load(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
