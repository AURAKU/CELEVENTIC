"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, Loader2, MessageCircle, Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FEED_LIMIT } from "@/lib/pagination";

export interface GuestWishItem {
  id: string;
  authorName: string;
  message: string;
  createdAt: string;
  guestId?: string | null;
  /** Present only on the create response, proves authorship for delete. */
  deleteToken?: string;
}

interface GuestWishesCardProps {
  eventId?: string | null;
  invitationId?: string | null;
  guestId?: string | null;
  guestName?: string | null;
  inviteLink?: string | null;
  accentColor?: string;
  memoryVaultEnabled?: boolean;
  /** When the template already owns Memory Vault, hide the wishes teaser line. */
  suppressMemoryHint?: boolean;
  variant?: "light" | "dark";
}

const PAGE_SIZE = FEED_LIMIT;
const TOKEN_STORAGE_PREFIX = "celeventic:wish-delete-tokens:";

function tokenStorageKey(eventKey: string) {
  return `${TOKEN_STORAGE_PREFIX}${eventKey}`;
}

function readStoredTokens(eventKey: string): Record<string, string> {
  if (typeof window === "undefined" || !eventKey) return {};
  try {
    const raw = window.localStorage.getItem(tokenStorageKey(eventKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredTokens(eventKey: string, tokens: Record<string, string>) {
  if (typeof window === "undefined" || !eventKey) return;
  try {
    window.localStorage.setItem(tokenStorageKey(eventKey), JSON.stringify(tokens));
  } catch {
    /* private mode / quota, author delete still works for this session via state */
  }
}

export function GuestWishesCard({
  eventId,
  invitationId,
  guestId,
  guestName,
  inviteLink,
  accentColor = "#0B8A83",
  memoryVaultEnabled,
  suppressMemoryHint = false,
  variant = "light",
}: GuestWishesCardProps) {
  const dark = variant === "dark";
  const eventKey = eventId || invitationId || inviteLink || "unknown";
  const [wishes, setWishes] = useState<GuestWishItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [ownedTokens, setOwnedTokens] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(eventId));
  const [loadingMore, setLoadingMore] = useState(false);
  const [authorName, setAuthorName] = useState(guestName?.trim() || "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setOwnedTokens(readStoredTokens(eventKey));
  }, [eventKey]);

  const rememberToken = useCallback(
    (wishId: string, token: string) => {
      setOwnedTokens((prev) => {
        const next = { ...prev, [wishId]: token };
        writeStoredTokens(eventKey, next);
        return next;
      });
    },
    [eventKey]
  );

  const forgetToken = useCallback(
    (wishId: string) => {
      setOwnedTokens((prev) => {
        if (!prev[wishId]) return prev;
        const next = { ...prev };
        delete next[wishId];
        writeStoredTokens(eventKey, next);
        return next;
      });
    },
    [eventKey]
  );

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!eventId && !inviteLink && !invitationId) {
        setWishes([]);
        setCanModerate(false);
        setHasMore(false);
        setTotal(0);
        setLoading(false);
        return;
      }
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (eventId) params.set("eventId", eventId);
        if (inviteLink) params.set("link", inviteLink);
        if (invitationId) params.set("invitationId", invitationId);
        const res = await fetch(`/api/invite/wishes?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.success) {
          const items = (data.data.items ?? []) as GuestWishItem[];
          setWishes((prev) => (append ? [...prev, ...items] : items));
          setTotal(data.data.total ?? 0);
          setHasMore(Boolean(data.data.hasMore ?? pageNum < (data.data.pages ?? 1)));
          setPage(pageNum);
          setCanModerate(Boolean(data.data.canModerate));
        } else if (!append) {
          setCanModerate(false);
        }
      } catch {
        if (!append) setCanModerate(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [eventId, inviteLink, invitationId]
  );

  useEffect(() => {
    void fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    if (guestName?.trim()) setAuthorName(guestName.trim());
  }, [guestName]);

  const canDeleteWish = useCallback(
    (wish: GuestWishItem) => {
      if (canModerate) return true;
      if (ownedTokens[wish.id]) return true;
      // Personalized invite: wishes stamped with this guest may be deleted only
      // when we also hold the author token (set at create time on this device).
      return false;
    },
    [canModerate, ownedTokens]
  );

  const ownedCount = useMemo(
    () => wishes.filter((w) => Boolean(ownedTokens[w.id])).length,
    [wishes, ownedTokens]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId && !inviteLink && !invitationId) {
      setError("This invitation is not linked to an event yet.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/invite/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventId || undefined,
          invitationId: invitationId || undefined,
          guestId: guestId || undefined,
          link: inviteLink || undefined,
          authorName: authorName.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save your wish");
        return;
      }
      setMessage("");
      setSuccess("Your wish was shared with everyone invited.");
      if (data.data) {
        const created = data.data as GuestWishItem;
        if (created.deleteToken) {
          rememberToken(created.id, created.deleteToken);
        }
        // Never keep the raw deleteToken in the shared list state.
        const { deleteToken: _omit, ...publicWish } = created;
        setWishes((prev) => [publicWish, ...prev.filter((w) => w.id !== publicWish.id)]);
        setTotal((t) => t + 1);
      } else {
        await fetchPage(1, false);
      }
    } catch {
      setError("Could not save your wish. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeWish(wish: GuestWishItem) {
    if (!canDeleteWish(wish) || deletingId) return;
    const isMine = Boolean(ownedTokens[wish.id]);
    const label = wish.authorName?.trim() || "this guest";
    const confirmMessage = isMine
      ? "Delete your wish? This cannot be undone."
      : `Permanently delete the wish from ${label}? This cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingId(wish.id);
    setError("");
    try {
      const deleteToken = ownedTokens[wish.id];
      const res = await fetch(`/api/invite/wishes/${wish.id}`, {
        method: "DELETE",
        headers: deleteToken ? { "Content-Type": "application/json" } : undefined,
        body: deleteToken ? JSON.stringify({ deleteToken }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not delete wish");
        return;
      }
      forgetToken(wish.id);
      setWishes((prev) => prev.filter((w) => w.id !== wish.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      setError("Could not delete wish. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      className={`inv-3d-scene rounded-2xl border p-6 shadow-lg ${
        dark
          ? "border-white/15 bg-black/35 backdrop-blur-xl"
          : "border-rose-200/60 bg-gradient-to-br from-rose-50 to-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5" style={{ color: accentColor }} />
          <h3 className={`font-display text-lg font-bold ${dark ? "text-white" : "text-slate-900"}`}>
            Guest Wishes
          </h3>
        </div>
        {total > 0 && (
          <span className={`text-xs ${dark ? "text-white/50" : "text-slate-500"}`}>
            {total} {total === 1 ? "wish" : "wishes"}
            {ownedCount > 0 && !canModerate ? ` · ${ownedCount} yours` : ""}
          </span>
        )}
      </div>
      <p className={`text-sm mb-4 ${dark ? "text-white/70" : "text-slate-600"}`}>
        Leave a blessing for the hosts. You can delete only the wishes you wrote
        {canModerate ? "; as an admin you can remove any wish" : ""}.
      </p>

      <form onSubmit={(e) => void submit(e)} className="space-y-3 mb-5">
        <Input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your name"
          required
          maxLength={80}
          className={dark ? "bg-white/10 border-white/20 text-white placeholder:text-white/40" : ""}
        />
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your wish or blessing…"
          required
          rows={3}
          maxLength={1000}
          className={dark ? "bg-white/10 border-white/20 text-white placeholder:text-white/40" : ""}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {success && <p className="text-xs text-emerald-600">{success}</p>}
        <Button
          type="submit"
          disabled={submitting || !authorName.trim() || message.trim().length < 2}
          className="w-full gap-2"
          style={{ backgroundColor: accentColor }}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Share wish
        </Button>
      </form>

      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {loading ? (
          <p className={`text-sm text-center py-6 ${dark ? "text-white/50" : "text-slate-500"}`}>
            Loading wishes…
          </p>
        ) : wishes.length === 0 ? (
          <p className={`text-sm text-center py-6 ${dark ? "text-white/45" : "text-slate-400"}`}>
            Be the first to leave a wish for this celebration.
          </p>
        ) : (
          wishes.map((w) => {
            const showDelete = canDeleteWish(w);
            const isMine = Boolean(ownedTokens[w.id]);
            return (
              <div
                key={w.id}
                className={`inv-3d-card rounded-xl px-4 py-3 shadow-sm border ${
                  dark ? "bg-white/10 border-white/15" : "bg-white/90 border-rose-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-sm italic leading-relaxed min-w-0 ${
                      dark ? "text-white/90" : "text-slate-700"
                    }`}
                  >
                    &ldquo;{w.message}&rdquo;
                  </p>
                  {showDelete && (
                    <button
                      type="button"
                      onClick={() => void removeWish(w)}
                      disabled={deletingId === w.id}
                      aria-label={
                        isMine ? "Delete your wish" : `Delete wish from ${w.authorName}`
                      }
                      title={isMine ? "Delete your wish" : "Delete wish (admin)"}
                      className={`shrink-0 -mr-1 -mt-0.5 rounded-md p-1.5 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-40 ${
                        dark
                          ? "text-white/35 hover:text-white/70 hover:bg-white/10 focus-visible:ring-white/30"
                          : "text-slate-300 hover:text-slate-500 hover:bg-slate-100/80 focus-visible:ring-slate-300"
                      }`}
                    >
                      {deletingId === w.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      )}
                    </button>
                  )}
                </div>
                <p
                  className={`text-xs font-semibold mt-2 flex items-center gap-1 ${
                    dark ? "text-rose-300" : "text-rose-600"
                  }`}
                >
                  <MessageCircle className="h-3 w-3" />
                  {w.authorName}
                  {isMine ? " · you" : ""}
                </p>
                <p className={`text-[10px] mt-0.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
                  {new Date(w.createdAt).toLocaleString()}
                </p>
              </div>
            );
          })
        )}
        {hasMore && !loading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={loadingMore}
            onClick={() => void fetchPage(page + 1, true)}
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more wishes"}
          </Button>
        )}
      </div>

      {memoryVaultEnabled && !suppressMemoryHint && (
        <p
          className={`text-xs text-center flex items-center justify-center gap-1 mt-4 ${
            dark ? "text-white/50" : "text-slate-500"
          }`}
        >
          <Sparkles className="h-3 w-3" /> Find the Album, share your experience from your lens
        </p>
      )}
    </div>
  );
}
