"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = {
  id: string;
  username: string;
  kind: string;
  ownerName: string | null;
  ownerEmail: string | null;
  cardSlug: string | null;
  cardDisplayName: string | null;
  holdUntil: string | null;
  reason: string | null;
  updatedAt: string;
};

type History = { action: string; fromValue: string | null; toValue: string | null; reason: string | null; createdAt: string };

export function CeleCardUsernameDirectory() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reserveName, setReserveName] = useState("");
  const [reserveReason, setReserveReason] = useState("");
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [events, setEvents] = useState<History[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "20", kind });
    if (search.trim().length >= 2) params.set("search", search.trim());
    const res = await fetch(`/api/admin/celecard/usernames?${params.toString()}`);
    const json = (await res.json().catch(() => ({}))) as { data?: { rows: Row[]; pages: number; total: number } };
    if (!res.ok) {
      setError("Could not load usernames.");
      return;
    }
    setRows(json.data?.rows ?? []);
    setPages(json.data?.pages ?? 1);
    setTotal(json.data?.total ?? 0);
  }, [kind, page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reserve() {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/celecard/usernames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: reserveName, reason: reserveReason }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(json.error ?? "Could not reserve that username.");
      return;
    }
    setMessage(`Reserved @${reserveName.toLowerCase()}.`);
    setReserveName("");
    setReserveReason("");
    void load();
  }

  async function openHistory(username: string) {
    setHistoryFor(username);
    const res = await fetch(`/api/admin/celecard/usernames?history=${encodeURIComponent(username)}`);
    const json = (await res.json().catch(() => ({}))) as { data?: { events: History[] } };
    setEvents(json.data?.events ?? []);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          placeholder="Search usernames"
          className="max-w-xs"
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
        />
        <select
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          value={kind}
          onChange={(event) => {
            setPage(1);
            setKind(event.target.value);
          }}
        >
          {["all", "ACTIVE", "ALIAS", "HOLD", "RESERVED", "SLUG"].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-slate-500">{total} records. Display names may repeat. Usernames do not.</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Card</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">History</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">@{row.username}</td>
                <td className="px-3 py-2">{row.kind}</td>
                <td className="px-3 py-2">
                  {row.ownerName || "—"}
                  {row.ownerEmail ? <span className="block text-xs text-slate-500">{row.ownerEmail}</span> : null}
                </td>
                <td className="px-3 py-2">{row.cardDisplayName || row.cardSlug || "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{new Date(row.updatedAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <button type="button" className="text-xs font-semibold text-[#0B8A83]" onClick={() => void openHistory(row.username)}>
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
      {historyFor ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">History for @{historyFor}</h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {events.length ? (
              events.map((event, index) => (
                <li key={`${event.createdAt}-${index}`}>
                  {event.action} · {event.fromValue || "—"} → {event.toValue || "—"} · {event.reason || "—"} ·{" "}
                  {new Date(event.createdAt).toLocaleString()}
                </li>
              ))
            ) : (
              <li>No audited events yet.</li>
            )}
          </ul>
        </section>
      ) : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Reserve a protected username</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reserve-username">Username</Label>
            <Input id="reserve-username" value={reserveName} onChange={(event) => setReserveName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reserve-reason">Reason</Label>
            <Input id="reserve-reason" value={reserveReason} onChange={(event) => setReserveReason(event.target.value)} />
          </div>
        </div>
        <Button type="button" className="mt-3 bg-[#0B8A83]" onClick={() => void reserve()}>
          Reserve
        </Button>
      </section>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
