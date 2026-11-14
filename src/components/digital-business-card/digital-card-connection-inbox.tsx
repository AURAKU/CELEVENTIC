"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CELECARD_LEAD_STATUSES,
  CELECARD_LEAD_STATUS_LABEL,
  CELECARD_LEAD_STATUS_PURPOSE,
  emptyLeadFilterCopy,
  emptyLeadStatusCounts,
  leadStatusBelongsInFilter,
  movedLeadStatusCopy,
  normalizeCeleCardLeadStatus,
  openLeadCount,
  type CeleCardLeadFilter,
  type CeleCardLeadStatus,
} from "@/lib/digital-business-card/leads";
import { celeYouConnectionSourceLabel, looksLikeGuestPhone } from "@/lib/celeyou-connect/pair";
import { CELEYOU_CONNECTION_SOURCES, normalizeConnectionLabel } from "@/lib/celeyou-connect/workspace";
import { nativeOpenFor } from "@/lib/digital-business-card/socials";
import {
  downloadMeetingIcs,
  formatMeetingDay,
  formatMeetingWhen,
  meetingIcs,
  meetingReplyCopy,
  parseMeetingBooking,
  whatsappComposeHref,
} from "@/lib/digital-business-card/meetings";

type ConnectionRow = {
  id: string;
  visitorName: string;
  visitorEmail: string | null;
  visitorPhone: string | null;
  visitorCompany: string | null;
  visitorTitle: string | null;
  source: string;
  status: string;
  note: string | null;
  ownerNote: string | null;
  createdAt: string;
  labels?: string[];
  reminder?: { id: string; dueAt: string; status: string; note: string | null } | null;
};

export function DigitalCardConnectionInbox({ cardId }: { cardId: string | null }) {
  const [items, setItems] = useState<ConnectionRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CeleCardLeadFilter>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [labelDraft, setLabelDraft] = useState<Record<string, string>>({});
  const [customReminder, setCustomReminder] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState(emptyLeadStatusCounts());

  const load = useCallback(
    async (nextPage = 1, nextFilter = filter, nextSearch = search, signal?: AbortSignal) => {
      if (!cardId) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(nextPage) });
        if (nextFilter !== "ALL") params.set("status", nextFilter);
        if (nextSearch.trim()) params.set("q", nextSearch.trim());
        if (source !== "all") params.set("source", source);
        const res = await fetch(`/api/digital-business-cards/${cardId}/connections?${params}`, { signal });
        const json = await res.json().catch(() => ({}));
        if (signal?.aborted) return;
        if (res.ok) {
          setItems((json.data?.items ?? []) as ConnectionRow[]);
          setTotal(json.data?.total ?? 0);
          setPageSize(json.data?.pageSize ?? 20);
          setPage(nextPage);
          if (json.data?.counts) setCounts({ ...emptyLeadStatusCounts(), ...json.data.counts });
        } else {
          setError(typeof json.error === "string" ? json.error : "Could not load requests.");
        }
      } catch (err) {
        if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setError("Could not load requests.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [cardId, filter, search, source]
  );

  async function saveStatus(
    connectionId: string,
    status: CeleCardLeadStatus,
    meetingReply?: "confirm" | "decline"
  ) {
    if (!cardId) return;
    setBusyId(connectionId);
    setError(null);
    try {
      const res = await fetch(`/api/digital-business-cards/${cardId}/connections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, status, meetingReply }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not update that request.");
      const nextStatus = normalizeCeleCardLeadStatus(
        (json.data?.status as string | undefined) ?? status
      );
      setNotice(movedLeadStatusCopy(nextStatus));
      const stays = leadStatusBelongsInFilter(nextStatus, filter);
      setItems((current) => {
        const merged = current.map((item) =>
          item.id === connectionId ? { ...item, ...json.data, status: nextStatus } : item
        );
        return stays ? merged : merged.filter((item) => item.id !== connectionId);
      });
      if (!stays) setTotal((count) => Math.max(0, count - 1));
      void load(page, filter, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that request.");
    } finally {
      setBusyId(null);
    }
  }

  async function patchConnection(connectionId: string, body: Record<string, unknown>) {
    if (!cardId) return;
    setBusyId(connectionId);
    setError(null);
    try {
      const res = await fetch(`/api/digital-business-cards/${cardId}/connections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not update that connection.");
      if (body.delete) {
        setItems((current) => current.filter((item) => item.id !== connectionId));
        setTotal((count) => Math.max(0, count - 1));
        return;
      }
      if (json.data && json.data.id) {
        setItems((current) => current.map((item) => (item.id === connectionId ? { ...item, ...json.data } : item)));
      }
      void load(page, filter, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that connection.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveNote(connectionId: string, ownerNote: string) {
    if (!cardId) return;
    setBusyId(connectionId);
    setError(null);
    try {
      const res = await fetch(`/api/digital-business-cards/${cardId}/connections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, ownerNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save that note.");
      setItems((current) =>
        current.map((item) =>
          item.id === connectionId ? { ...item, ownerNote: json.data?.ownerNote ?? ownerNote } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that note.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const ac = new AbortController();
    void load(1, filter, search, ac.signal);
    return () => ac.abort();
  }, [load, filter, search]);

  if (!cardId) return null;

  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section id="studio-inbox" className="celeyou-adaptive scroll-mt-16 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Connections</p>
      <p className="text-xs text-slate-500">
        Move each person through your pipeline. Open hides Archived. Contact details appear only when the visitor chose to share them.
      </p>
      <label className="sr-only" htmlFor="studio-inbox-search">
        Search connections
      </label>
      <input
        id="studio-inbox-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, email, company"
        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            setFilter("ALL");
          }}
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
            filter === "ALL" ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]" : "border-slate-200 text-slate-500"
          }`}
        >
          Open {openLeadCount(counts)}
        </button>
        {CELECARD_LEAD_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setFilter(status);
            }}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              filter === status ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]" : "border-slate-200 text-slate-500"
            }`}
          >
            {CELECARD_LEAD_STATUS_LABEL[status]} {counts[status]}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CELEYOU_CONNECTION_SOURCES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSource((current) => (current === item ? "all" : item))}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              source === item ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]" : "border-slate-200 text-slate-500"
            }`}
          >
            {celeYouConnectionSourceLabel(item)}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <a href={`/api/digital-business-cards/${cardId}/connections/export`}>Export consented contacts</a>
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {notice ? <p className="mt-2 text-xs text-[#0B8A83]">{notice}</p> : null}
      {loading && items.length === 0 ? <p className="mt-3 text-xs text-slate-500">Loading…</p> : null}
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const meeting = item.source === "meeting" ? parseMeetingBooking(item.note) : null;
          const contact = [item.visitorEmail, item.visitorPhone].filter(Boolean).join(" · ");
          const meetDay = meeting ? formatMeetingDay(meeting.start, meeting.timezone) : null;
          const leadStatus = normalizeCeleCardLeadStatus(item.status);
          const meetingOpen = meeting && leadStatus !== "WON" && leadStatus !== "ARCHIVED";
          const confirmCopy = meeting
            ? meetingReplyCopy({
                kind: "confirm",
                ownerName: "I",
                guestName: item.visitorName,
                booking: meeting,
              })
            : null;
          const declineCopy = meeting
            ? meetingReplyCopy({
                kind: "decline",
                ownerName: "I",
                guestName: item.visitorName,
                booking: meeting,
              })
            : null;
          const phoneIsNumber = Boolean(item.visitorPhone && looksLikeGuestPhone(item.visitorPhone));
          const wechatOpen =
            item.visitorPhone && !phoneIsNumber
              ? nativeOpenFor("wechat", item.visitorPhone, `https://u.wechat.com/${encodeURIComponent(item.visitorPhone)}`)
              : null;
          const whatsappConfirm = confirmCopy && phoneIsNumber
            ? whatsappComposeHref(item.visitorPhone, confirmCopy.body)
            : null;
          const whatsappDecline = declineCopy && phoneIsNumber
            ? whatsappComposeHref(item.visitorPhone, declineCopy.body)
            : null;
          return (
            <li key={item.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <div className={meeting ? "flex items-start gap-3" : undefined}>
                {meetDay ? (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-50 text-center">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-800">
                      {meetDay.weekday}
                    </span>
                    <span className="text-sm font-semibold leading-none text-teal-950">{meetDay.label.split(" ")[0]}</span>
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800">{item.visitorName}</p>
              {meeting ? (
                <p className="text-[11px] text-slate-700">
                  {meeting.title} · {formatMeetingWhen(meeting.start, meeting.timezone)}
                  {meeting.place ? ` · ${meeting.place}` : ""}
                </p>
              ) : null}
              {[item.visitorTitle, item.visitorCompany].filter(Boolean).length ? (
                <p className="text-[11px] text-slate-600">
                  {[item.visitorTitle, item.visitorCompany].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {contact ? <p className="text-[11px] text-slate-600">{contact}</p> : (
                <p className="text-[11px] text-slate-500">Anonymous request</p>
              )}
              {meeting?.note ? <p className="text-[11px] text-slate-500">{meeting.note}</p> : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor={`lead-status-${item.id}`}>
                  Stage
                </label>
                <select
                  id={`lead-status-${item.id}`}
                  value={leadStatus}
                  disabled={busyId === item.id}
                  aria-describedby={`lead-status-help-${item.id}`}
                  title={CELECARD_LEAD_STATUS_PURPOSE[leadStatus]}
                  onChange={(event) => void saveStatus(item.id, event.target.value as CeleCardLeadStatus)}
                  className="min-h-10 min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] font-medium text-slate-700"
                >
                  {CELECARD_LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {CELECARD_LEAD_STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  {celeYouConnectionSourceLabel(item.source)}{" "}
                  · {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <p id={`lead-status-help-${item.id}`} className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {CELECARD_LEAD_STATUS_PURPOSE[leadStatus]}
              </p>
              <label className="sr-only" htmlFor={`lead-note-${item.id}`}>
                Private note
              </label>
              <textarea
                id={`lead-note-${item.id}`}
                defaultValue={item.ownerNote || ""}
                disabled={busyId === item.id}
                placeholder="Private note"
                rows={2}
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (next === (item.ownerNote || "").trim()) return;
                  void saveNote(item.id, next);
                }}
                className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {(item.labels || []).map((label) => (
                  <span key={label} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {label}
                  </span>
                ))}
                <input
                  value={labelDraft[item.id] ?? ""}
                  onChange={(event) => setLabelDraft((current) => ({ ...current, [item.id]: event.target.value }))}
                  onBlur={() => {
                    const next = normalizeConnectionLabel(labelDraft[item.id] || "");
                    if (!next) return;
                    const labels = Array.from(new Set([...(item.labels || []), next]));
                    void patchConnection(item.id, { labels });
                    setLabelDraft((current) => ({ ...current, [item.id]: "" }));
                  }}
                  placeholder="Add label"
                  className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-[11px]"
                />
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void patchConnection(item.id, { reminderPreset: "1d", status: "FOLLOW_UP" })}
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                >
                  Remind in 1 day
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void patchConnection(item.id, { reminderPreset: "tomorrow" })}
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void patchConnection(item.id, { reminderPreset: "3d" })}
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                >
                  In 3 days
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void patchConnection(item.id, { reminderPreset: "7d" })}
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                >
                  In 7 days
                </button>
                <label className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800">
                  <span className="sr-only">Custom reminder date and time</span>
                  <input
                    type="datetime-local"
                    value={customReminder[item.id] ?? ""}
                    disabled={busyId === item.id}
                    onChange={(event) =>
                      setCustomReminder((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    onBlur={() => {
                      const raw = customReminder[item.id];
                      if (!raw) return;
                      const due = new Date(raw);
                      if (!Number.isFinite(due.getTime())) return;
                      void patchConnection(item.id, { reminderDueAt: due.toISOString() });
                    }}
                    className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-slate-700"
                  />
                </label>
                {item.reminder ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void patchConnection(item.id, { completeReminderId: item.reminder?.id })}
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                    >
                      Done {new Date(item.reminder.dueAt).toLocaleString()}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void patchConnection(item.id, { cancelReminderId: item.reminder?.id })}
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                    >
                      Cancel reminder
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => {
                    if (window.confirm(`Remove ${item.visitorName} from this CeleYou inbox?`)) {
                      void patchConnection(item.id, { delete: true });
                    }
                  }}
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700"
                >
                  Delete
                </button>
              </div>
              {meeting ? (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {meetingOpen ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void saveStatus(item.id, "WON", "confirm")}
                        className="rounded-full bg-[#0B8A83] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60"
                      >
                        Confirm this time
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void saveStatus(item.id, "ARCHIVED", "decline")}
                        className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 disabled:opacity-60"
                      >
                        Cannot make this time
                      </button>
                    </>
                  ) : leadStatus === "WON" ? (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800">
                      Confirmed. Guest was messaged.
                    </p>
                  ) : leadStatus === "ARCHIVED" ? (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Declined. Guest was asked to pick another time.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      downloadMeetingIcs(
                        "celeyou-meeting.ics",
                        meetingIcs(meeting, "CeleYou", item.visitorName)
                      )
                    }
                    className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Add to calendar
                  </button>
                  {item.visitorEmail ? (
                    <a
                      href={`mailto:${item.visitorEmail}?subject=${encodeURIComponent(meeting.title)}`}
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                    >
                      Reply by email
                    </a>
                  ) : null}
                  {whatsappConfirm && meetingOpen ? (
                    <a
                      href={whatsappConfirm}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                    >
                      Confirm on WhatsApp
                    </a>
                  ) : whatsappDecline && leadStatus === "ARCHIVED" ? (
                    <a
                      href={whatsappDecline}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                    >
                      Message on WhatsApp
                    </a>
                  ) : phoneIsNumber ? (
                    <a
                      href={`tel:${item.visitorPhone}`}
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                    >
                      Call
                    </a>
                  ) : wechatOpen?.appHref ? (
                    <a
                      href={wechatOpen.appHref}
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800"
                    >
                      Open WeChat
                    </a>
                  ) : null}
                </div>
              ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {items.length === 0 && !loading ? (
        <p className="mt-3 text-xs text-slate-500">{emptyLeadFilterCopy(filter, Boolean(search))}</p>
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
