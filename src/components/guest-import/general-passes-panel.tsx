"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Link2, Loader2, ShieldOff, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaginationBar } from "@/components/ui/pagination";
import { requestJson } from "./request";

/** How often to re-check a fixed run while it is still being minted. */
const MINTING_POLL_MS = 2000;

/**
 * General admission passes.
 *
 * Method A mints a fixed run of unique passes to print and hand out. Method B
 * publishes one registration link that issues a *different* pass to everybody
 * who uses it, which is the whole point, and the panel says so plainly,
 * because the failure mode organisers fear is one QR being screenshotted and
 * forwarded to a hundred people.
 */

interface GeneralBatch {
  id: string;
  label: string;
  method: "FIXED_QUANTITY" | "OPEN_REGISTRATION";
  status: string;
  quantity: number;
  issuedCount: number;
  partySize: number;
  registrationUrl: string | null;
  registrationOpen: boolean;
  maxRegistrations: number | null;
  createdAt: string;
}

interface IssuedPass {
  id: string;
  name: string;
  inviteUrl: string;
  code: string | null;
  status: string | null;
  partySize: number;
  admittedCount: number;
  archived: boolean;
}

export function GeneralPassesPanel({ eventId }: { eventId: string }) {
  const [batches, setBatches] = useState<GeneralBatch[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [passes, setPasses] = useState<IssuedPass[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [method, setMethod] = useState<"FIXED_QUANTITY" | "OPEN_REGISTRATION">("FIXED_QUANTITY");
  const [label, setLabel] = useState("General admission");
  const [quantity, setQuantity] = useState(50);
  const [partySize, setPartySize] = useState(1);
  const [maxRegistrations, setMaxRegistrations] = useState<number | "">("");
  const [welcome, setWelcome] = useState("");

  const loadBatches = useCallback(async () => {
    const result = await requestJson<{ items: GeneralBatch[] }>(
      `/api/general-passes?eventId=${encodeURIComponent(eventId)}`
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setBatches(result.data.items ?? []);
  }, [eventId]);

  const loadPasses = useCallback(async () => {
    if (!selected) return;
    const result = await requestJson<{ items: IssuedPass[]; pages: number; total: number }>(
      `/api/general-passes/${selected}?page=${page}&limit=50`
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPasses(result.data.items ?? []);
    setPages(result.data.pages ?? 1);
    setTotal(result.data.total ?? 0);
  }, [selected, page]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    void loadPasses();
  }, [loadPasses]);

  // A fixed run is minted in the background. Requesting the batch is also what
  // drives minting when no jobs worker is up, so polling here is what makes
  // "0 of 500 minted" actually climb instead of sitting there until a reload.
  const minting = batches.some(
    (batch) => batch.method === "FIXED_QUANTITY" && batch.status === "GENERATING"
  );
  useEffect(() => {
    if (!minting) return;
    const timer = setInterval(() => {
      void loadBatches();
      void loadPasses();
    }, MINTING_POLL_MS);
    return () => clearInterval(timer);
  }, [minting, loadBatches, loadPasses]);

  async function create() {
    setBusy(true);
    setError("");
    const result = await requestJson<{ id: string }>("/api/general-passes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        label,
        method,
        quantity: method === "FIXED_QUANTITY" ? quantity : undefined,
        partySize,
        maxRegistrations:
          method === "OPEN_REGISTRATION" && maxRegistrations !== ""
            ? Number(maxRegistrations)
            : null,
        welcomeMessage: welcome.trim() || null,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPage(1);
    setSelected(result.data.id);
    await loadBatches();
  }

  async function act(batchId: string, action: "close" | "revoke" | "retry") {
    setBusy(true);
    setError("");
    const result = await requestJson(`/api/general-passes/${batchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason: action === "revoke" ? "Revoked from the organiser panel" : undefined,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await Promise.all([loadBatches(), loadPasses()]);
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-4 w-4" /> Create general passes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <MethodCard
              active={method === "FIXED_QUANTITY"}
              onClick={() => setMethod("FIXED_QUANTITY")}
              title="A set number of passes"
              body="Mint a fixed run now. Every pass has its own QR and admission code, print them, hand them out, scan them at the gate."
            />
            <MethodCard
              active={method === "OPEN_REGISTRATION"}
              onClick={() => setMethod("OPEN_REGISTRATION")}
              title="An open registration link"
              body="Share one link. Everyone who registers is issued their own unique pass, forwarding the link creates more passes, it never shares one."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="gp-label">Label</Label>
              <Input id="gp-label" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            {method === "FIXED_QUANTITY" ? (
              <div className="space-y-1.5">
                <Label htmlFor="gp-qty">How many passes</Label>
                <Input
                  id="gp-qty"
                  type="number"
                  min={1}
                  max={5000}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="gp-max">Maximum registrations</Label>
                <Input
                  id="gp-max"
                  type="number"
                  min={1}
                  placeholder="No limit"
                  value={maxRegistrations}
                  onChange={(e) =>
                    setMaxRegistrations(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="gp-party">Each pass admits</Label>
              <Input
                id="gp-party"
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          {method === "OPEN_REGISTRATION" && (
            <div className="space-y-1.5">
              <Label htmlFor="gp-welcome">Welcome message on the registration page</Label>
              <Textarea
                id="gp-welcome"
                rows={2}
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
                placeholder="Register below to receive your entry pass."
              />
            </div>
          )}

          <Button onClick={create} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
            {method === "FIXED_QUANTITY" ? `Create ${quantity} passes` : "Create registration link"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 p-8 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading pass batches…
          </CardContent>
        </Card>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No general passes yet. Create a fixed run to print, or a registration link to share.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pass batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className={`rounded-xl border p-3 ${
                  selected === batch.id ? "border-brand-400 bg-brand-50/40" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => {
                      setSelected(batch.id);
                      setPage(1);
                    }}
                  >
                    <p className="font-medium">{batch.label}</p>
                    <p className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                      {batch.method === "FIXED_QUANTITY" &&
                        batch.status === "GENERATING" && (
                          <Loader2 className="h-3 w-3 animate-spin text-brand-600" />
                        )}
                      <span>
                        {batch.method === "FIXED_QUANTITY"
                          ? `${batch.issuedCount} of ${batch.quantity} minted`
                          : `${batch.issuedCount} claimed${batch.maxRegistrations ? ` of ${batch.maxRegistrations}` : ""}`}
                        {" · "}
                        each admits {batch.partySize} · {batch.status.toLowerCase()}
                      </span>
                    </p>
                  </button>

                  <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
                    {batch.registrationUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard?.writeText(batch.registrationUrl!)}
                      >
                        <Link2 className="h-3.5 w-3.5" /> Copy link
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/api/general-passes/${batch.id}?format=csv`} download>
                        <Download className="h-3.5 w-3.5" /> Export
                      </a>
                    </Button>
                    {batch.method === "OPEN_REGISTRATION" && batch.registrationOpen && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act(batch.id, "close")}>
                        Close
                      </Button>
                    )}
                    {(batch.status === "GENERATING" || batch.status === "FAILED") &&
                      batch.method === "FIXED_QUANTITY" && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act(batch.id, "retry")}>
                          {batch.status === "GENERATING" ? "Continue minting" : "Retry minting"}
                        </Button>
                      )}
                    {batch.status !== "REVOKED" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act(batch.id, "revoke")}>
                        <ShieldOff className="h-3.5 w-3.5" /> Revoke all
                      </Button>
                    )}
                  </div>
                </div>

                {batch.registrationUrl && (
                  <p className="mt-2 break-all rounded-lg bg-slate-50 p-2 font-mono text-xs text-slate-600">
                    {batch.registrationUrl}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issued passes ({total})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Pass</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Admits</th>
                    <th className="px-3 py-2 font-medium">Used</th>
                    <th className="px-3 py-2 font-medium">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {passes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        {minting
                          ? "Minting passes… they appear here as they are created."
                          : "No passes issued from this batch yet."}
                      </td>
                    </tr>
                  )}
                  {passes.map((pass) => (
                    <tr key={pass.id} className={pass.archived ? "text-slate-400" : undefined}>
                      <td className="px-3 py-2 font-medium">{pass.name}</td>
                      <td className="px-3 py-2 font-mono">{pass.code ?? "—"}</td>
                      <td className="px-3 py-2">{pass.partySize}</td>
                      <td className="px-3 py-2">{pass.admittedCount}</td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigator.clipboard?.writeText(pass.inviteUrl)}
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar page={page} pages={pages} total={total} limit={50} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MethodCard({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-colors ${
        active ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{body}</p>
    </button>
  );
}
