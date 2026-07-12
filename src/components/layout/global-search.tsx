"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { trackUsability } from "@/lib/navigation/usability-analytics";

interface SearchHit {
  id: string;
  name?: string;
  title?: string;
  subtitle?: string;
  href: string;
  type: string;
}

interface SearchGroups {
  events?: SearchHit[];
  guests?: SearchHit[];
  tickets?: SearchHit[];
  vendors?: SearchHit[];
  templates?: SearchHit[];
  messages?: SearchHit[];
  contributions?: SearchHit[];
  memories?: SearchHit[];
}

const GROUP_LABELS: Record<string, string> = {
  events: "Events",
  guests: "Guests",
  tickets: "Tickets",
  vendors: "Vendors",
  templates: "Templates",
  messages: "Messages",
  contributions: "Contributions",
  memories: "Memories",
};

export function GlobalSearch({ className }: { className?: string }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<SearchGroups>({});

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setGroups({});
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (d.success) {
        setGroups(d.data);
        trackUsability("search_used", { feature: "global_search" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void search(query), 280);
    return () => clearTimeout(timer);
  }, [query, search]);

  const orderedGroups = useMemo(() => {
    const order = ["events", "guests", "vendors", "templates", "tickets", "messages", "contributions", "memories"];
    return order
      .map((key) => ({ key, items: groups[key as keyof SearchGroups] ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [groups]);

  const totalHits = orderedGroups.reduce((sum, g) => sum + g.items.length, 0);

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
        aria-label={t("dashboard.search_placeholder")}
        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200/80 bg-slate-50/80 text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15 transition-all"
      />
      {open && query.length >= 2 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-slate-200 bg-white shadow-xl max-h-80 overflow-y-auto"
            role="listbox"
          >
            {loading ? (
              <p className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("dashboard.searching")}
              </p>
            ) : totalHits === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">{t("dashboard.search_no_results")}</p>
            ) : (
              orderedGroups.map((group) => (
                <div key={group.key}>
                  <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                    {GROUP_LABELS[group.key]} — {group.items.length} {group.items.length === 1 ? "result" : "results"}
                  </p>
                  {group.items.map((hit) => (
                    <Link
                      key={`${hit.type}-${hit.id}`}
                      href={hit.href}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                      }}
                      className="block px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                      role="option"
                    >
                      <p className="text-sm font-medium text-slate-900 truncate">{hit.name ?? hit.title}</p>
                      {hit.subtitle && <p className="text-xs text-slate-500 truncate">{hit.subtitle}</p>}
                    </Link>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
