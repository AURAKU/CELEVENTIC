"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface GuestWishItem {
  id: string;
  authorName: string;
  message: string;
  createdAt: string;
  guestId?: string | null;
}

interface GuestWishesCardProps {
  eventId?: string | null;
  invitationId?: string | null;
  guestId?: string | null;
  guestName?: string | null;
  inviteLink?: string | null;
  accentColor?: string;
  memoryVaultEnabled?: boolean;
  variant?: "light" | "dark";
}

export function GuestWishesCard({
  eventId,
  invitationId,
  guestId,
  guestName,
  inviteLink,
  accentColor = "#0B8A83",
  memoryVaultEnabled,
  variant = "light",
}: GuestWishesCardProps) {
  const dark = variant === "dark";
  const [wishes, setWishes] = useState<GuestWishItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [authorName, setAuthorName] = useState(guestName?.trim() || "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!eventId && !inviteLink && !invitationId) {
      setWishes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "50" });
      if (eventId) params.set("eventId", eventId);
      if (inviteLink) params.set("link", inviteLink);
      if (invitationId) params.set("invitationId", invitationId);
      const res = await fetch(`/api/invite/wishes?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setWishes(data.data.items ?? []);
        setTotal(data.data.total ?? 0);
      }
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }, [eventId, inviteLink, invitationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (guestName?.trim()) setAuthorName(guestName.trim());
  }, [guestName]);

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
        setWishes((prev) => [data.data as GuestWishItem, ...prev.filter((w) => w.id !== data.data.id)]);
        setTotal((t) => t + 1);
      } else {
        await load();
      }
    } catch {
      setError("Could not save your wish. Please try again.");
    } finally {
      setSubmitting(false);
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
          </span>
        )}
      </div>
      <p className={`text-sm mb-4 ${dark ? "text-white/70" : "text-slate-600"}`}>
        Leave a blessing for the hosts. Every guest who opens this invitation can read all wishes for this event.
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
          wishes.map((w) => (
            <div
              key={w.id}
              className={`inv-3d-card rounded-xl px-4 py-3 shadow-sm border ${
                dark ? "bg-white/10 border-white/15" : "bg-white/90 border-rose-100"
              }`}
            >
              <p className={`text-sm italic leading-relaxed ${dark ? "text-white/90" : "text-slate-700"}`}>
                &ldquo;{w.message}&rdquo;
              </p>
              <p
                className={`text-xs font-semibold mt-2 flex items-center gap-1 ${
                  dark ? "text-rose-300" : "text-rose-600"
                }`}
              >
                <MessageCircle className="h-3 w-3" />
                {w.authorName}
              </p>
              <p className={`text-[10px] mt-0.5 ${dark ? "text-white/35" : "text-slate-400"}`}>
                {new Date(w.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      {memoryVaultEnabled && (
        <p
          className={`text-xs text-center flex items-center justify-center gap-1 mt-4 ${
            dark ? "text-white/50" : "text-slate-500"
          }`}
        >
          <Sparkles className="h-3 w-3" /> Find the Album — share your experience from your lens
        </p>
      )}
    </div>
  );
}
