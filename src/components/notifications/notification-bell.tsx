"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = selectedId ? items.find((n) => n.id === selectedId) ?? null : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?page=1&limit=20", { cache: "no-store" });
      const d = await res.json();
      if (d.success) {
        setItems(d.data.items);
        setUnread(d.data.unreadCount);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedId(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedId) setSelectedId(null);
        else setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, selectedId]);

  async function markReadLocal(id: string) {
    const target = items.find((n) => n.id === id);
    if (!target || target.isRead) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
  }

  async function openNotification(n: NotificationItem) {
    setSelectedId(n.id);
    await markReadLocal(n.id);
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  async function deleteOne(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return;
      const wasUnread = items.find((n) => n.id === id && !n.isRead);
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnread((c) => Math.max(0, c - 1));
      if (selectedId === id) setSelectedId(null);
    } finally {
      setBusyId(null);
    }
  }

  async function clearAll() {
    if (items.length === 0) return;
    if (
      !window.confirm(
        `Clear all ${items.length} notification${items.length === 1 ? "" : "s"}? This cannot be undone.`
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      if (!res.ok) return;
      setItems([]);
      setUnread(0);
      setSelectedId(null);
    } finally {
      setClearing(false);
    }
  }

  function followLink(link: string | null) {
    if (!link) return;
    setOpen(false);
    setSelectedId(null);
    router.push(link);
  }

  return (
    <div className={cn("relative", className)} ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-brand-700"
        onClick={() => {
          setOpen((o) => {
            if (o) setSelectedId(null);
            return !o;
          });
          if (!open) void load();
        }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-slate-900 ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.12)] z-50 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 bg-slate-50/80">
            {selected ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-brand-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void deleteOne(selected.id)}
                  disabled={busyId === selected.id}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <div className="flex items-center gap-2.5">
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      className="text-xs font-medium text-brand-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void clearAll()}
                      disabled={clearing}
                      className="text-xs font-medium text-slate-500 hover:text-red-600 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      {clearing ? "Clearing…" : "Clear all"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {selected ? (
            <div className="px-4 py-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 leading-snug">{selected.title}</h3>
                {!selected.isRead ? (
                  <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                    New
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-slate-400">
                    <CheckCheck className="h-3 w-3" /> Read
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selected.message}
              </p>
              <p className="text-[11px] text-slate-400">{formatWhen(selected.createdAt)}</p>
              {selected.link ? (
                <Button
                  type="button"
                  size="sm"
                  className="w-full gap-2 bg-[#0B8A83] hover:bg-[#097870]"
                  onClick={() => followLink(selected.link)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open related page
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {loading && items.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 text-center">Loading…</p>
              ) : items.length === 0 ? (
                <p className="p-6 text-sm text-slate-500 text-center">No notifications yet</p>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "group flex items-stretch border-b border-slate-50 transition-colors",
                      !n.isRead && "bg-brand-50/40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void openNotification(n)}
                      className="min-w-0 flex-1 text-left px-4 py-3 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                            aria-hidden
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 line-clamp-1">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{formatWhen(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${n.title}`}
                      title="Delete"
                      disabled={busyId === n.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteOne(n.id);
                      }}
                      className="shrink-0 px-3 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {!selected && (
            <div className="border-t border-slate-100 p-2">
              <Button variant="ghost" size="sm" className="w-full justify-center gap-2" asChild>
                <Link
                  href="/dashboard/messages"
                  onClick={() => {
                    setOpen(false);
                    setSelectedId(null);
                  }}
                >
                  <MessageSquare className="h-4 w-4" /> Open messages
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
