"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActiveEventId, setActiveEventId } from "@/hooks/use-event-workspace";

interface EventOption {
  id: string;
  title: string;
  eventType: string;
}

export function EventSwitcher({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    setActiveId(getActiveEventId());
    fetch("/api/events?all=true")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) setEvents(d.data);
      });

    const handler = (e: Event) => {
      setActiveId((e as CustomEvent<string>).detail || getActiveEventId());
    };
    window.addEventListener("celeventic:active-event", handler);
    return () => window.removeEventListener("celeventic:active-event", handler);
  }, []);

  const active = events.find((e) => e.id === activeId);

  function select(id: string) {
    setActiveEventId(id);
    setActiveId(id);
    setOpen(false);
    router.push(`/dashboard/events/${id}`);
  }

  function clear() {
    setActiveEventId("");
    setActiveId("");
    setOpen(false);
    router.push("/dashboard/events");
  }

  if (events.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors",
          compact ? "h-9 px-2.5 max-w-[160px]" : "h-10 px-3 max-w-[200px]"
        )}
      >
        <Calendar className="h-4 w-4 text-[#0B8A83] shrink-0" />
        <span className="truncate">{active?.title ?? "Select event"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 top-full mt-1 z-50 min-w-[220px] max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
            {events.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => select(e.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-slate-50",
                    activeId === e.id && "bg-brand-50 text-brand-800 font-medium"
                  )}
                >
                  <span className="block truncate">{e.title}</span>
                  <span className="text-xs text-slate-400">{e.eventType.replace(/_/g, " ")}</span>
                </button>
              </li>
            ))}
            {activeId && (
              <li className="border-t border-slate-100 mt-1 pt-1">
                <button type="button" onClick={clear} className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
                  Exit event workspace
                </button>
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
