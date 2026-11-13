"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Eye, EyeOff, Lock } from "lucide-react";
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
  { id: "CODE_PROTECTED", label: "Code" },
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
  const [codes, setCodes] = useState<
    Array<{ id: string; label: string; code: string | null; itemKeys: string[]; revokedAt: string | null }>
  >([]);
  const [maskedCodes, setMaskedCodes] = useState<Record<string, boolean>>({});
  const [openCodeId, setOpenCodeId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Array<{
    id: string;
    visitorName: string;
    visitorContact: string;
    status: string;
    itemKeys: unknown;
  }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const persistReady = useRef(false);
  const persistTimer = useRef<number | null>(null);

  const lockable = items.filter((item) => !item.locked);
  const hiddenForCode = useMemo(
    () => lockable.filter((item) => (visibility[item.id] || "PUBLIC") === "CODE_PROTECTED"),
    [lockable, visibility]
  );
  const liveCodes = codes.filter((row) => !row.revokedAt);

  useEffect(() => {
    persistReady.current = false;
  }, [cardId]);

  useEffect(() => {
    if (!cardId || !lockable.length) return;
    if (!persistReady.current) {
      persistReady.current = true;
      return;
    }
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      void fetch(`/api/digital-business-cards/${cardId}/reach-visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      }).then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          setError(json?.error || "Could not save which details stay public.");
        }
      });
    }, 400);
    return () => {
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
    };
  }, [cardId, lockable.length, visibility]);

  useEffect(() => {
    if (!cardId) return;
    const ac = new AbortController();
    void (async () => {
      try {
        const [codeRes, reqRes] = await Promise.all([
          fetch(`/api/digital-business-cards/${cardId}/access-codes`, { signal: ac.signal }),
          fetch(`/api/digital-business-cards/${cardId}/access-requests`, { signal: ac.signal }),
        ]);
        const codeJson = await codeRes.json().catch(() => null);
        const reqJson = await reqRes.json().catch(() => null);
        if (ac.signal.aborted) return;
        if (codeRes.ok) setCodes(codeJson?.data ?? []);
        if (reqRes.ok) setRequests(reqJson?.data ?? []);
      } catch (err) {
        if (ac.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setError("Could not load privacy settings.");
      }
    })();
    return () => ac.abort();
  }, [cardId]);

  function setMode(id: string, mode: ReachVisibility) {
    const next = { ...visibility };
    if (mode === "PUBLIC") delete next[id];
    else next[id] = mode;
    onVisibilityChange(next);
    if (mode === "CODE_PROTECTED") {
      setSelected((current) => (current.includes(id) ? current : [...current, id]));
    } else {
      setSelected((current) => current.filter((itemId) => itemId !== id));
    }
  }

  function toggleCodeItem(id: string) {
    const on = selected.includes(id);
    if (on) {
      setSelected((current) => current.filter((itemId) => itemId !== id));
      const covered = liveCodes.some((row) => row.itemKeys.includes(id));
      if (!covered && (visibility[id] || "PUBLIC") === "CODE_PROTECTED") {
        setMode(id, "PUBLIC");
      }
      return;
    }
    setSelected((current) => [...current, id]);
    if ((visibility[id] || "PUBLIC") !== "CODE_PROTECTED") setMode(id, "CODE_PROTECTED");
  }

  async function createCode() {
    if (!cardId) return;
    setError(null);
    setMessage(null);
    const itemKeys = selected.filter(Boolean);
    if (!itemKeys.length) {
      setError("Select the details this code should unveil. Everything else stays public.");
      return;
    }
    if (!/^[0-9]{4}$|^[A-Z]{4}$/.test(code.trim().toUpperCase())) {
      setError("Use four digits or four letters.");
      return;
    }
    try {
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
      setMessage("Code saved. Guests with this code only unveil the details you selected.");
      const list = await fetch(`/api/digital-business-cards/${cardId}/access-codes`);
      const listed = await list.json().catch(() => null);
      if (list.ok) setCodes(listed?.data ?? []);
    } catch {
      setError("Could not save the code.");
    }
  }

  async function revoke(codeId: string) {
    if (!cardId) return;
    try {
      await fetch(`/api/digital-business-cards/${cardId}/access-codes/${codeId}/revoke`, { method: "POST" });
      setCodes((rows) => rows.map((row) => (row.id === codeId ? { ...row, revokedAt: new Date().toISOString() } : row)));
    } catch {
      setError("Could not revoke that code.");
    }
  }

  async function decide(requestId: string, decision: "approve" | "decline" | "revoke") {
    if (!cardId) return;
    try {
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
      const listed = await list.json().catch(() => null);
      if (list.ok) setRequests(listed?.data ?? []);
    } catch {
      setError("Could not update the request.");
    }
  }

  function itemTitle(id: string) {
    const item = lockable.find((row) => row.id === id);
    return item ? fieldLabel(item) : id;
  }

  function fieldLabel(item: DigitalCardReachItem) {
    const preview = reachAccountPreview(item);
    const brand = brandReachLabel(item.brand);
    if (preview.title && preview.title !== brand) return `${brand} ${preview.title}`;
    return preview.hint ? `${brand} ${preview.hint}` : brand;
  }

  return (
    <div id="studio-privacy" className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Privacy and access</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Public details stay open on your CeleYou. Mark a detail Code if guests need the access code you share. Leave
          a detail Public if anyone with your link should use it.
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
                      {mode === "CODE_PROTECTED"
                        ? " · needs a code"
                        : mode === "REQUEST_ACCESS"
                          ? " · ask first"
                          : " · public"}
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
            Add a mail, number, site, chat, or wallet above, then choose which stay public and which need a code.
          </p>
        )}
      </div>

      {cardId ? (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Access codes</p>
          <p className="text-[11px] leading-snug text-slate-500">
            Every filled field is here. Tap the eye to hide or show it on your public CeleYou. Tap the icon to include a
            hidden detail in this code.
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
          {items.length ? (
            <div className="celecard-privacy-icons">
              {items.map((item) => {
                const on = selected.includes(item.id);
                const mode = visibility[item.id] || "PUBLIC";
                const hidden = mode !== "PUBLIC";
                const name = fieldLabel(item);
                return (
                  <div
                    key={item.id}
                    className="celecard-privacy-tile"
                    data-on={on ? "true" : "false"}
                    data-hidden={hidden ? "true" : "false"}
                  >
                    <button
                      type="button"
                      className="celecard-privacy-mark"
                      aria-label={`${on ? "Remove from this code" : "Include in this code"} ${name}`}
                      title={name}
                      onClick={() => toggleCodeItem(item.id)}
                    >
                      <DigitalCardBrandMark
                        id={reachBrandMarkId(item)}
                        className="h-10 w-10 rounded-[12px] shadow-none"
                      />
                    </button>
                    <button
                      type="button"
                      className="celecard-privacy-eye"
                      data-hidden={hidden ? "true" : "false"}
                      aria-label={hidden ? `Show ${name}` : `Hide ${name}`}
                      title={hidden ? `Show ${name}` : `Hide ${name}`}
                      onClick={() => setMode(item.id, hidden ? "PUBLIC" : "CODE_PROTECTED")}
                    >
                      {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">Add details above, then select which ones this code unveils.</p>
          )}
          <button
            type="button"
            onClick={() => void createCode()}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]"
          >
            Save code
          </button>
          {liveCodes.map((row) => {
            const masked = maskedCodes[row.id] === true;
            const digits = row.code || "";
            const shown = digits ? (masked ? "••••" : digits) : "Saved";
            const open = openCodeId === row.id;
            return (
              <div key={row.id} className="celecard-code-row" data-open={open ? "true" : "false"}>
                <button
                  type="button"
                  className="celecard-code-toggle"
                  aria-expanded={open}
                  aria-controls={`celecard-code-drop-${row.id}`}
                  onClick={() => setOpenCodeId(open ? null : row.id)}
                >
                  <ChevronDown className="celecard-code-chevron h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0 truncate text-left text-[12px] font-semibold text-slate-800">
                    {row.label}
                  </span>
                  <span className="celecard-code-value">{shown}</span>
                </button>
                {digits ? (
                  <button
                    type="button"
                    className="celecard-privacy-eye celecard-privacy-eye-inline"
                    data-hidden={masked ? "true" : "false"}
                    aria-label={masked ? `Show ${row.label} code` : `Hide ${row.label} code`}
                    onClick={() =>
                      setMaskedCodes((current) => ({ ...current, [row.id]: !masked }))
                    }
                  >
                    {masked ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="shrink-0 text-[11px] font-semibold text-slate-500"
                  onClick={() => void revoke(row.id)}
                >
                  Revoke
                </button>
                {open ? (
                  <div id={`celecard-code-drop-${row.id}`} className="celecard-code-drop">
                    <div className="celecard-privacy-icons celecard-privacy-icons-compact">
                      {row.itemKeys.map((id) => {
                        const item = items.find((entry) => entry.id === id);
                        const name = item ? fieldLabel(item) : itemTitle(id);
                        return (
                          <span
                            key={id}
                            className="celecard-privacy-tile celecard-privacy-tile-static"
                            title={name}
                          >
                            <span className="celecard-privacy-mark">
                              <DigitalCardBrandMark
                                id={item ? reachBrandMarkId(item) : "other"}
                                className="h-8 w-8 rounded-[10px] shadow-none"
                              />
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {codes.some((row) => row.revokedAt) ? (
            <p className="text-[11px] text-slate-400">
              {codes.filter((row) => row.revokedAt).length} revoked
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Mark details Code to preview the lock on the card. Save the card to issue a guest code.
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

      {hiddenForCode.length && cardId && !liveCodes.length ? (
        <p className="text-xs text-amber-800">Hidden details stay closed until you save a code for them.</p>
      ) : null}

      {message ? <p className="text-xs text-teal-800">{message}</p> : null}
      {error ? <p className="text-xs text-amber-800">{error}</p> : null}
    </div>
  );
}
