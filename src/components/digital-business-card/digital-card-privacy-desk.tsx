"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";
import {
  brandReachLabel,
  reachAccountPreview,
  reachBrandMarkId,
  type DigitalCardReachItem,
} from "@/lib/digital-business-card/socials";
import type { ReachVisibility } from "@/lib/digital-business-card/privacy-preview";

const MODES: Array<{ id: ReachVisibility; label: string }> = [
  { id: "PUBLIC", label: "Public" },
  { id: "CODE_PROTECTED", label: "Hide" },
  { id: "REQUEST_ACCESS", label: "Ask" },
];

export function DigitalCardPrivacyDesk({
  items,
  visibility,
  onVisibilityChange,
  cardId,
}: {
  items: DigitalCardReachItem[];
  visibility: Record<string, ReachVisibility>;
  onVisibilityChange: (next: Record<string, ReachVisibility>) => void;
  cardId?: string | null;
}) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("Clients");
  const [selected, setSelected] = useState<string[]>([]);
  const [codes, setCodes] = useState<Array<{ id: string; label: string; itemKeys: string[]; revokedAt: string | null }>>([]);
  const [requests, setRequests] = useState<Array<{
    id: string;
    visitorName: string;
    visitorContact: string;
    status: string;
    itemKeys: unknown;
  }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lockable = items.filter((item) => !item.locked);
  const hiddenForCode = useMemo(
    () => lockable.filter((item) => (visibility[item.id] || "PUBLIC") === "CODE_PROTECTED"),
    [lockable, visibility]
  );
  const hiddenIds = useMemo(() => hiddenForCode.map((item) => item.id), [hiddenForCode]);
  const hiddenKey = hiddenIds.join("|");

  useEffect(() => {
    const ids = hiddenKey ? hiddenKey.split("|") : [];
    setSelected((current) => {
      const kept = current.filter((id) => ids.includes(id));
      const extra = ids.filter((id) => !kept.includes(id));
      if (!extra.length && kept.length === current.length) return current;
      return [...kept, ...extra];
    });
  }, [hiddenKey]);

  useEffect(() => {
    if (!cardId) return;
    void (async () => {
      const [codeRes, reqRes] = await Promise.all([
        fetch(`/api/digital-business-cards/${cardId}/access-codes`),
        fetch(`/api/digital-business-cards/${cardId}/access-requests`),
      ]);
      const codeJson = await codeRes.json().catch(() => null);
      const reqJson = await reqRes.json().catch(() => null);
      if (codeRes.ok) setCodes(codeJson.data ?? []);
      if (reqRes.ok) setRequests(reqJson.data ?? []);
    })();
  }, [cardId]);

  function setMode(id: string, mode: ReachVisibility) {
    const next = { ...visibility };
    if (mode === "PUBLIC") delete next[id];
    else next[id] = mode;
    onVisibilityChange(next);
  }

  async function createCode() {
    if (!cardId) return;
    setError(null);
    setMessage(null);
    const itemKeys = (selected.length ? selected : hiddenIds).filter((id) => hiddenIds.includes(id));
    if (!itemKeys.length) {
      setError("Hide at least one detail, then save a code for those hidden details.");
      return;
    }
    if (!/^[0-9]{4}$|^[A-Z]{4}$/.test(code.trim().toUpperCase())) {
      setError("Use four digits or four letters.");
      return;
    }
    const res = await fetch(`/api/digital-business-cards/${cardId}/access-codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, code, itemKeys }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || "Could not save the code");
      return;
    }
    setCode("");
    setMessage("Code saved. Guests who enter it only unveil the hidden details you assigned.");
    const list = await fetch(`/api/digital-business-cards/${cardId}/access-codes`);
    const listed = await list.json();
    if (list.ok) setCodes(listed.data ?? []);
  }

  async function revoke(codeId: string) {
    if (!cardId) return;
    await fetch(`/api/digital-business-cards/${cardId}/access-codes/${codeId}/revoke`, { method: "POST" });
    setCodes((rows) => rows.map((row) => (row.id === codeId ? { ...row, revokedAt: new Date().toISOString() } : row)));
  }

  async function decide(requestId: string, decision: "approve" | "decline" | "revoke") {
    if (!cardId) return;
    const res = await fetch(`/api/digital-business-cards/${cardId}/access-requests/${requestId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || "Could not update the request");
      return;
    }
    if (json?.data?.grantPath) {
      await navigator.clipboard.writeText(`${window.location.origin}${json.data.grantPath}`);
      setMessage("Approved. The access link is copied. Send it to the visitor.");
    }
    const list = await fetch(`/api/digital-business-cards/${cardId}/access-requests`);
    const listed = await list.json();
    if (list.ok) setRequests(listed.data ?? []);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Privacy and access</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Public details stay on the guest page for anyone with your QR, NFC tap, or link. Hide personal or business
          details behind a four character code. Guests tap the eye, enter the code, and only those hidden details unveil.
        </p>
      </div>
      <div className="space-y-2">
        {lockable.length ? (
          lockable.map((item) => {
            const mode = visibility[item.id] || "PUBLIC";
            const preview = reachAccountPreview(item);
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <DigitalCardBrandMark id={reachBrandMarkId(item)} className="h-8 w-8 rounded-[10px] shadow-none" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{preview.title}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {preview.hint || brandReachLabel(item.brand)}
                      {mode === "CODE_PROTECTED" ? " · hidden" : mode === "REQUEST_ACCESS" ? " · ask first" : " · public"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {MODES.map((option) => {
                    const on = mode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setMode(item.id, option.id)}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                        style={{
                          background: on ? "#0B8A83" : "#f1f5f9",
                          color: on ? "#fff" : "#475569",
                        }}
                      >
                        {option.id === "PUBLIC" ? (
                          <Eye className="h-3 w-3" />
                        ) : option.id === "CODE_PROTECTED" ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-slate-500">
            Fill a mail, number, site, chat, or wallet above, then choose which ones stay public and which stay hidden.
          </p>
        )}
      </div>

      {cardId ? (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Access codes</p>
          <p className="text-[11px] leading-snug text-slate-500">
            Share this code only with people who should see the hidden details. Public details never need it.
          </p>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label, such as Clients"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Four digits or four letters"
            maxLength={4}
            autoComplete="one-time-code"
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm tracking-[0.2em]"
          />
          {hiddenForCode.length ? (
            <div className="flex flex-wrap gap-1.5">
              {hiddenForCode.map((item) => {
                const on = selected.includes(item.id);
                const preview = reachAccountPreview(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setSelected((current) =>
                        on ? current.filter((id) => id !== item.id) : [...current, item.id]
                      )
                    }
                    className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                    style={{ background: on ? "#0B8A83" : "#e2e8f0", color: on ? "#fff" : "#334155" }}
                  >
                    {preview.title}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">Hide at least one detail above, then save a code for it.</p>
          )}
          <button
            type="button"
            onClick={() => void createCode()}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]"
          >
            Save code
          </button>
          {codes.map((row) => (
            <div key={row.id} className="flex items-center justify-between text-xs text-slate-600">
              <span>
                {row.label} · {row.itemKeys.length} details{row.revokedAt ? " · revoked" : ""}
              </span>
              {row.revokedAt ? null : (
                <button type="button" className="text-slate-500" onClick={() => void revoke(row.id)}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Hide details now to preview the eye on the card. Save the card to issue a guest code.
        </p>
      )}

      {cardId && requests.length ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Access requests</p>
          {requests.map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs">
              <p className="font-medium text-slate-800">
                {row.visitorName} · {row.visitorContact}
              </p>
              <p className="text-slate-500">{row.status}</p>
              {row.status === "PENDING" ? (
                <div className="mt-2 flex gap-2">
                  <button type="button" className="text-[#0B8A83]" onClick={() => void decide(row.id, "approve")}>
                    Approve
                  </button>
                  <button type="button" className="text-slate-500" onClick={() => void decide(row.id, "decline")}>
                    Decline
                  </button>
                </div>
              ) : row.status === "APPROVED" ? (
                <button type="button" className="mt-2 text-slate-500" onClick={() => void decide(row.id, "revoke")}>
                  Revoke
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {hiddenForCode.length && cardId && !codes.some((row) => !row.revokedAt) ? (
        <p className="text-xs text-amber-800">Hidden details stay closed until you save a code.</p>
      ) : null}
      {hiddenForCode.length && cardId ? (
        <p className="text-xs text-slate-500">Save the card so guests see the hidden eyes on the QR, NFC tap, and link.</p>
      ) : null}

      {message ? <p className="text-xs text-teal-800">{message}</p> : null}
      {error ? <p className="text-xs text-amber-800">{error}</p> : null}
    </div>
  );
}
