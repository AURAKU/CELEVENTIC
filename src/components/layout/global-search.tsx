"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

interface SearchHit {
  id: string;
  name?: string;
  title?: string;
  subtitle?: string;
  href: string;
  type: string;
}

export function GlobalSearch({ className }: { className?: string }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (d.success) {
        const all: SearchHit[] = [
          ...(d.data.events ?? []),
          ...(d.data.guests ?? []),
          ...(d.data.tickets ?? []),
          ...(d.data.vendors ?? []),
          ...(d.data.templates ?? []),
          ...(d.data.messages ?? []),
          ...(d.data.contributions ?? []),
          ...(d.data.memories ?? []),
        ];
        setHits(all);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void search(query), 280);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div className={cn("relative flex-1 max-w-md", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t("dashboard.search_placeholder")}
        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200/80 bg-slate-50/80 text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 transition-all"
      />
      {open && query.length >= 2 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-slate-200 bg-white shadow-xl max-h-80 overflow-y-auto">
            {loading ? (
              <p className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.searching")}
              </p>
            ) : hits.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">{t("dashboard.search_no_results")}</p>
            ) : (
              hits.map((hit) => (
                <Link
                  key={`${hit.type}-${hit.id}`}
                  href={hit.href}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                  className="block px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                >
                  <p className="text-sm font-medium text-slate-900 truncate">{hit.name ?? hit.title}</p>
                  {hit.subtitle && <p className="text-xs text-slate-500 truncate">{hit.subtitle}</p>}
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 mt-0.5">{hit.type}</p>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
