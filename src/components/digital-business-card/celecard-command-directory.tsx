"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { PaginationBar } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { Copy, ExternalLink, QrCode } from "lucide-react";

type DirectoryCard = {
  id: string;
  cardholderName: string;
  email: string | null;
  cardId: string;
  slug: string;
  publicProfileUrl: string;
  canonicalUrl: string;
  qrImageSrc: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  activationStatus: string;
  publicationStatus: string;
  expirationDate: string | null;
  creationDate: string;
  lastUpdatedDate: string;
  administrativeRestrictions: string[];
  lifecycle: string;
  unclaimed: boolean;
};

function formatWhen(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusTone(value: string) {
  const key = value.toLowerCase();
  if (key === "live" || key === "active" || key === "published") return "bg-emerald-50 text-emerald-800";
  if (key === "suspended" || key === "deleted") return "bg-rose-50 text-rose-800";
  if (key === "deactivated" || key === "unavailable") return "bg-slate-100 text-slate-700";
  if (key === "courtesy" || key === "expiring") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export function CeleCardCommandDirectory() {
  const { page, setPage, resetPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [cards, setCards] = useState<DirectoryCard[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("createdAt:desc");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams());
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    params.set("sort", sort);
    const res = await fetch(`/api/admin/celecard/cards?${params}`);
    const payload = await res.json().catch(() => ({}));
    if (payload.success) {
      setCards(payload.data.items);
      setTotal(payload.data.total);
      setPages(payload.data.pages);
    }
  }, [appendToParams, search, status, sort]);

  useEffect(() => {
    resetPage();
  }, [search, status, sort, resetPage]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function runAction(id: string, action: string, reason?: string) {
    if (action === "deactivate" || action === "suspend") {
      const confirmed = window.confirm(
        action === "suspend"
          ? "Suspend this CeleYou? Visitors will see a generic unavailable page."
          : "Deactivate this CeleYou? The public profile will be withheld until it is reactivated."
      );
      if (!confirmed) return;
    }
    const needed = reason ?? (action === "deactivate" || action === "suspend" ? window.prompt("Reason (required)") : undefined);
    if ((action === "deactivate" || action === "suspend") && (!needed || needed.trim().length < 8)) {
      alert("A reason of at least 8 characters is required.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/celecard/cards/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: needed }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(payload.error || "Action failed");
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Manage Cards"
        subtitle="Searchable cardholder directory. Records load one page at a time."
        count={total}
        search={search}
        onSearchChange={setSearch}
        onRefresh={load}
        onAdd={() => {
          window.location.assign("/admin/celecard/new");
        }}
        addLabel="Create CeleYou"
      >
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Pending activation</SelectItem>
            <SelectItem value="expiring">Renewal due</SelectItem>
            <SelectItem value="grace">Grace</SelectItem>
            <SelectItem value="courtesy">Expired</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="unclaimed">Unclaimed</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">Newest</SelectItem>
            <SelectItem value="createdAt:asc">Oldest</SelectItem>
            <SelectItem value="updatedAt:desc">Recently updated</SelectItem>
            <SelectItem value="displayName:asc">Name</SelectItem>
            <SelectItem value="expiration:asc">Expiry</SelectItem>
          </SelectContent>
        </Select>
      </AdminToolbar>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Cardholder</th>
              <th className="px-4 py-3">Card ID</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{card.cardholderName}</p>
                  <p className="text-xs text-slate-500">{card.email || "No contact"}</p>
                  {card.unclaimed ? (
                    <Badge className="mt-1 bg-indigo-50 text-indigo-800">Unclaimed</Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  <p>{card.slug}</p>
                  <p className="text-[11px] text-slate-400">{card.cardId.slice(0, 12)}…</p>
                </td>
                <td className="px-4 py-3">
                  <p>{card.subscriptionPlan}</p>
                  <p className="text-xs text-slate-500">{card.subscriptionStatus}</p>
                </td>
                <td className="px-4 py-3 space-y-1">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${statusTone(card.activationStatus)}`}>
                    {card.activationStatus}
                  </span>
                  <p className="text-[11px] text-slate-500">{card.publicationStatus}</p>
                  {card.administrativeRestrictions.length ? (
                    <p className="text-[11px] text-rose-600">{card.administrativeRestrictions.join(", ")}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs">{formatWhen(card.expirationDate)}</td>
                <td className="px-4 py-3 text-xs">{formatWhen(card.lastUpdatedDate)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/celecard/${card.id}`}>View</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a href={card.publicProfileUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => copy(card.publicProfileUrl)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a href={card.qrImageSrc} target="_blank" rel="noreferrer">
                        <QrCode className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => runAction(card.id, "activate")}>
                      Activate
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => runAction(card.id, "deactivate")}>
                      Deactivate
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => runAction(card.id, "suspend")}>
                      Suspend
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!cards.length ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                  No CeleYou cards match this page.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} pages={pages} total={total} limit={ADMIN_TABLE_LIMIT} onPageChange={setPage} />
    </div>
  );
}
