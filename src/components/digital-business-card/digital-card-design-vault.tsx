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

  const load = useCallback(async (nextPage = 1) => {
    if (!cardId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/digital-business-cards/${cardId}/designs?page=${nextPage}`);
      const json = await res.json();
      if (res.ok) {
        setItems((json.data?.items ?? []) as VaultItem[]);
        setTotal(json.data?.total ?? 0);
        setPage(nextPage);
      }
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    void load(1);
  }, [load]);

  async function act(action: string, versionId?: string) {
    if (!cardId) return;
    setMessage(null);
    const res = await fetch(`/api/digital-business-cards/${cardId}/designs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, versionId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error || "Could not update design");
      return;
    }
    setMessage(action === "restore" ? "Design restored. Identity and sharing link are unchanged." : "Saved.");
    await load(page);
    if (action === "restore") window.location.reload();
  }

  if (!cardId) return null;

  return (
    <section id="celecard-design-vault" className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Design Vault</p>
          <p className="text-xs text-slate-500">Saved looks only. Name, contacts, and your public link stay the same.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void act("save")} disabled={loading}>
          Save current look
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs text-[#0B8A83]">{message}</p> : null}
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-slate-800">{item.label}</p>
              <p className="text-[11px] text-slate-500">
                {item.themeId} · {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => void act("duplicate", item.id)}>
                Duplicate
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void act("restore", item.id)}>
                Restore
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
