"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type VaultItem = {
  id: string;
  label: string;
  themeId: string;
  status: string;
  createdAt: string;
};

export function DigitalCardDesignVault({ cardId }: { cardId: string | null }) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (nextPage = 1, signal?: AbortSignal) => {
    if (!cardId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-business-cards/${cardId}/designs?page=${nextPage}`, { signal });
      const json = await res.json().catch(() => ({}));
      if (signal?.aborted) return;
      if (res.ok) {
        setItems((json.data?.items ?? []) as VaultItem[]);
        setTotal(json.data?.total ?? 0);
        setPage(nextPage);
      } else {
        setError(typeof json.error === "string" ? json.error : "Could not load saved looks.");
      }
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      setError("Could not load saved looks.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    const ac = new AbortController();
    void load(1, ac.signal);
    return () => ac.abort();
  }, [load]);

  async function act(action: string, versionId?: string) {
    if (!cardId) return;
    if (action === "archive") {
      const confirmed = window.confirm(
        "Remove this saved look? Your name, contacts, and public link stay the same."
      );
      if (!confirmed) return;
    }
    setMessage(null);
    setError(null);
    setBusyId(versionId || "save");
    try {
      const res = await fetch(`/api/digital-business-cards/${cardId}/designs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, versionId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not update design");
        return;
      }
      setMessage(
        action === "restore"
          ? "Design restored. Identity and sharing link are unchanged."
          : action === "archive"
            ? "Saved look removed. Your CeleYou identity is unchanged."
            : "Saved."
      );
      await load(page);
      if (action === "restore") window.location.reload();
    } catch {
      setError("Could not update design.");
    } finally {
      setBusyId(null);
    }
  }

  if (!cardId) return null;

  return (
    <section id="celecard-design-vault" className="scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Design Vault</p>
          <p className="text-xs text-slate-500">Saved looks only. Name, contacts, and your public link stay the same.</p>
        </div>
        <Button type="button" size="sm" variant="outline" className="shrink-0 self-start" onClick={() => void act("save")} disabled={loading}>
          Save current look
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs text-[#0B8A83]">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-slate-800">{item.label}</p>
              <p className="text-[11px] text-slate-500">
                {item.themeId} · {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="whitespace-nowrap"
                disabled={busyId !== null}
                onClick={() => void act("duplicate", item.id)}
              >
                Duplicate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="whitespace-nowrap"
                disabled={busyId !== null}
                onClick={() => void act("restore", item.id)}
              >
                Restore
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="whitespace-nowrap text-slate-600 hover:text-red-700"
                disabled={busyId !== null}
                onClick={() => void act("archive", item.id)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 && !loading ? (
        <p className="mt-3 text-xs text-slate-500">No saved looks yet. Changing a theme keeps the previous one here.</p>
      ) : null}
      {total > items.length ? (
        <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => void load(page + 1)}>
          Load more
        </Button>
      ) : null}
    </section>
  );
}
