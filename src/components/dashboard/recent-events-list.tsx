"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  Loader2,
  Mail,
  Package,
  Palette,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDate } from "@/lib/utils";

export interface RecentEventSummary {
  id: string;
  title: string;
  startDate: Date | string;
  status: string;
  organizerId?: string;
  _count?: { guests: number };
}

interface RecentEventsListProps {
  events: RecentEventSummary[];
  emptyTitle: string;
  emptyDesc: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Current user id — used with organizerId for owner delete. */
  userId?: string;
  /** Platform admin (ADMIN / SUPER_ADMIN) — full manage + delete any event. */
  isAdmin?: boolean;
  /** Organizers/owners may open the Edit manage menu for events they can access. */
  canEdit?: boolean;
}

function statusBadgeVariant(status: string): "success" | "warning" | "outline" | "destructive" {
  if (status === "PUBLISHED" || status === "LIVE") return "success";
  if (status === "CANCELLED") return "destructive";
  if (status === "DRAFT") return "warning";
  return "outline";
}

function startDateValue(startDate: Date | string) {
  return typeof startDate === "string" ? startDate : startDate.toISOString();
}

export function RecentEventsList({
  events: initialEvents,
  emptyTitle,
  emptyDesc,
  secondaryHref,
  secondaryLabel,
  userId,
  isAdmin = false,
  canEdit = false,
}: RecentEventsListProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [manageId, setManageId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const showManage = isAdmin || canEdit;

  function canDeleteEvent(event: RecentEventSummary) {
    if (isAdmin) return true;
    if (userId && event.organizerId && event.organizerId === userId) return true;
    return false;
  }

  async function handleDelete(event: RecentEventSummary) {
    const isLive = event.status === "LIVE" || event.status === "PUBLISHED";
    const confirmMsg = isAdmin
      ? `Permanently delete "${event.title}" and all invitations? This cannot be undone.`
      : isLive
        ? `Cancel "${event.title}"? Live/published events are soft-cancelled and invitations are deactivated. Guest pages will no longer appear live.`
        : `Permanently delete "${event.title}" and its invitations? This cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    setDeletingId(event.id);
    setFeedback(null);

    try {
      // Platform admin always hits the admin hard-delete API (any status).
      // Organizers hit /api/events/[id] (soft-cancel for LIVE/PUBLISHED).
      const endpoint = isAdmin
        ? `/api/admin/events?id=${encodeURIComponent(event.id)}`
        : `/api/events/${encodeURIComponent(event.id)}`;
      const res = await fetch(endpoint, { method: "DELETE", credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete event");
      }

      const mode = (data?.data?.mode as string | undefined) ?? (isAdmin ? "deleted" : undefined);
      if (isAdmin && mode && mode !== "deleted") {
        throw new Error("Admin delete did not permanently remove the event. Try again.");
      }

      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setManageId(null);
      const soft = !isAdmin && (mode === "cancelled" || isLive);
      setFeedback({
        type: "ok",
        message: soft
          ? `"${event.title}" cancelled — invitations deactivated.`
          : `"${event.title}" permanently deleted.`,
      });
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "err",
        message: err instanceof Error ? err.message : "Delete failed",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Events</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href={isAdmin ? "/admin/events" : "/dashboard/events"}>
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {feedback && (
          <p
            className={`mb-3 text-sm rounded-lg px-3 py-2 ${
              feedback.type === "ok"
                ? "bg-brand-50 text-brand-800 border border-brand-200/60"
                : "bg-red-50 text-red-700 border border-red-200/60"
            }`}
            role="status"
          >
            {feedback.message}
          </p>
        )}

        {events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={emptyTitle}
            description={emptyDesc}
            actionLabel="Create Event"
            actionHref="/dashboard/events/create"
            secondaryLabel={secondaryLabel}
            secondaryHref={secondaryHref}
          />
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const open = manageId === event.id;
              const deleting = deletingId === event.id;
              const allowDelete = canDeleteEvent(event);

              return (
                <div key={event.id} className="space-y-0">
                  <div className="interactive-row">
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="min-w-0 flex-1 group"
                    >
                      <p className="font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">
                        {event.title}
                      </p>
                      <p className="text-sm text-slate-500">{formatDate(startDateValue(event.startDate))}</p>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <Badge variant={statusBadgeVariant(event.status)}>{event.status}</Badge>
                      <span className="text-sm text-slate-400">{event._count?.guests ?? 0} guests</span>

                      {showManage && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant={open ? "default" : "outline"}
                            className="h-8"
                            aria-expanded={open}
                            aria-controls={`event-manage-${event.id}`}
                            onClick={() => setManageId(open ? null : event.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          {allowDelete && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deleting}
                              onClick={() => void handleDelete(event)}
                            >
                              {deleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {showManage && open && (
                    <div
                      id={`event-manage-${event.id}`}
                      className="mx-1 mb-1 rounded-xl border border-brand-200/70 bg-brand-50/40 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Manage event</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Edit info, invitation design, addons, and workspace — existing flows, no duplicate forms.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label="Close manage menu"
                          onClick={() => setManageId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" className="justify-start h-auto py-2.5" asChild>
                          <Link href={`/dashboard/events/${event.id}`}>
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-left">
                              <span className="block font-semibold">Event info & hub</span>
                              <span className="block text-[11px] font-normal text-slate-500">Details, modules, QR branding</span>
                            </span>
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" className="justify-start h-auto py-2.5" asChild>
                          <Link href={`/dashboard/invitations?eventId=${event.id}`}>
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-left">
                              <span className="block font-semibold">Invitation & design</span>
                              <span className="block text-[11px] font-normal text-slate-500">Templates, studio, share links</span>
                            </span>
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" className="justify-start h-auto py-2.5" asChild>
                          <Link href="/dashboard/design-studio">
                            <Palette className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-left">
                              <span className="block font-semibold">Design studio</span>
                              <span className="block text-[11px] font-normal text-slate-500">Flyers, assets, templates</span>
                            </span>
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" className="justify-start h-auto py-2.5" asChild>
                          <Link href={`/dashboard/invitations?tab=store&eventId=${event.id}`}>
                            <Package className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-left">
                              <span className="block font-semibold">Packages & addons</span>
                              <span className="block text-[11px] font-normal text-slate-500">Orders, invitation addons</span>
                            </span>
                          </Link>
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" asChild>
                          <Link href={`/dashboard/events/${event.id}`}>Open event hub</Link>
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/dashboard/events/${event.id}/workspace`}>Team workspace</Link>
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" asChild>
                            <Link href="/admin/events">Admin events</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
