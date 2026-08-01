"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { CeleventicImage } from "@/components/media/celeventic-media";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { cn } from "@/lib/utils";
import {
  DEFAULT_GUESTBOOK_CONFIG,
  GUEST_MESSAGE_STORAGE_KEY,
  type ResolvedThankYouDesign,
  type ThankYouGuestbookConfig,
} from "@/lib/thank-you/types";
import { isGuestbookOpen } from "@/lib/thank-you/resolve-design";

type PublicMessage = {
  id: string;
  authorName: string;
  message: string;
  title: string | null;
  avatarUrl: string | null;
  isFeatured: boolean;
  isPinned: boolean;
  editedAt: string | null;
  createdAt: string;
};

type Props = {
  eventId: string;
  shareToken?: string | null;
  design: ResolvedThankYouDesign;
  guestbookConfig?: ThankYouGuestbookConfig | null;
  previewMode?: boolean;
  radiusClass?: string;
};

function readOwnedTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GUEST_MESSAGE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOwnedTokens(map: Record<string, string>) {
  window.localStorage.setItem(GUEST_MESSAGE_STORAGE_KEY, JSON.stringify(map));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ThankYouGuestMessages({
  eventId,
  shareToken,
  design,
  guestbookConfig,
  previewMode,
  radiusClass = "rounded-2xl",
}: Props) {
  const config = { ...DEFAULT_GUESTBOOK_CONFIG, ...guestbookConfig };
  const open = isGuestbookOpen(config);
  const pageSize = config.initialPageSize ?? 12;
  const maxLen = config.maxMessageLength ?? 800;

  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<"visible" | "pending" | null>(null);
  const [owned, setOwned] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const [authorName, setAuthorName] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  const prompts = config.prompts?.length
    ? config.prompts
    : DEFAULT_GUESTBOOK_CONFIG.prompts!;

  const load = useCallback(
    async (nextPage = 1, append = false) => {
      setLoading(true);
      const params = new URLSearchParams({
        eventId,
        page: String(nextPage),
        limit: String(pageSize),
      });
      if (shareToken) params.set("token", shareToken);
      const res = await fetch(`/api/public/thank-you/messages?${params}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const items = (json.data.items ?? []) as PublicMessage[];
        setMessages((current) => (append ? [...current, ...items] : items));
        setPage(json.data.page ?? nextPage);
        setTotalPages(json.data.pages ?? 1);
      }
      setLoading(false);
    },
    [eventId, pageSize, shareToken]
  );

  useEffect(() => {
    setOwned(readOwnedTokens());
    void load(1, false);
  }, [load]);

  const composerHeading = "Leave a Note for the Hosts";
  const composerIntro =
    "Share a favourite memory, a warm wish or a few words the hosts can return to long after the celebration.";

  async function submitMessage(event: React.FormEvent) {
    event.preventDefault();
    if (previewMode) {
      setError("Preview mode — posting is disabled.");
      return;
    }
    if (!open) {
      setError(config.closedMessage || "Guest messages for this celebration are now closed.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess(null);
    try {
      const res = await fetch(`/api/public/thank-you/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          token: shareToken,
          authorName: anonymous ? "A guest" : authorName,
          title: config.allowTitle ? title || null : null,
          message,
          avatarUrl: config.allowAvatar ? avatarUrl || null : null,
          isAnonymous: anonymous && config.allowAnonymous,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not share your message");
        return;
      }
      if (json.data?.authorToken && json.data?.id) {
        const next = { ...readOwnedTokens(), [json.data.id]: json.data.authorToken };
        writeOwnedTokens(next);
        setOwned(next);
      }
      const pending = json.data?.status === "PENDING";
      setSuccess(pending ? "pending" : "visible");
      setAuthorName("");
      setTitle("");
      setMessage("");
      setAvatarUrl("");
      setAnonymous(false);
      setEditingId(null);
      if (!pending) await load(1, false);
    } catch {
      setError("Could not share your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(id: string) {
    const token = owned[id];
    if (!token) return;
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/public/thank-you/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorToken: token,
        authorName: anonymous ? "A guest" : authorName,
        title: config.allowTitle ? title || null : null,
        message,
        avatarUrl: config.allowAvatar ? avatarUrl || null : null,
        isAnonymous: anonymous && config.allowAnonymous,
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok || !json.success) {
      setError(json.error || "Could not update your message");
      return;
    }
    setEditingId(null);
    setSuccess("visible");
    await load(1, false);
  }

  async function removeOwn(id: string) {
    const token = owned[id];
    if (!token) return;
    if (!window.confirm("Delete your message? This cannot be undone.")) return;
    const res = await fetch(`/api/public/thank-you/messages/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorToken: token }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setError(json.error || "Could not delete your message");
      return;
    }
    const next = { ...owned };
    delete next[id];
    writeOwnedTokens(next);
    setOwned(next);
    setMessages((current) => current.filter((item) => item.id !== id));
  }

  function beginEdit(item: PublicMessage) {
    setEditingId(item.id);
    setAuthorName(item.authorName === "A guest" ? "" : item.authorName);
    setTitle(item.title ?? "");
    setMessage(item.message);
    setAvatarUrl(item.avatarUrl ?? "");
    setAnonymous(item.authorName === "A guest");
    setSuccess(null);
  }

  const empty = !loading && messages.length === 0;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl" style={{ fontFamily: "var(--ty-display)" }}>
          Guest Messages
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: design.mutedTextColor }}>
          Notes, blessings and write-ups from everyone who celebrated with you.
        </p>
      </div>

      {open ? (
        <form
          onSubmit={(event) => {
            if (editingId) {
              event.preventDefault();
              void saveEdit(editingId);
              return;
            }
            void submitMessage(event);
          }}
          className={cn("border p-5 sm:p-6 space-y-4", radiusClass)}
          style={{
            backgroundColor: design.surfaceColor,
            borderColor: `${design.accentColor}33`,
          }}
          aria-labelledby="guest-composer-heading"
        >
          <div>
            <h3 id="guest-composer-heading" className="text-lg font-semibold" style={{ fontFamily: "var(--ty-display)" }}>
              {editingId ? "Edit your message" : composerHeading}
            </h3>
            <p className="mt-1 text-sm" style={{ color: design.mutedTextColor }}>
              {composerIntro}
            </p>
            <button
              type="button"
              className="mt-2 text-left text-xs underline-offset-2 hover:underline"
              style={{ color: design.accentColor }}
              onClick={() => setPromptIndex((i) => (i + 1) % prompts.length)}
            >
              Prompt: {prompts[promptIndex]}
            </button>
          </div>

          {!anonymous && (
            <div className="space-y-1">
              <Label htmlFor="ty-author">Display name</Label>
              <Input
                id="ty-author"
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                maxLength={80}
                required={!anonymous}
                autoComplete="name"
              />
            </div>
          )}

          {config.allowTitle && (
            <div className="space-y-1">
              <Label htmlFor="ty-title">Short heading (optional)</Label>
              <Input
                id="ty-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="ty-message">Message</Label>
            <Textarea
              id="ty-message"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, maxLen))}
              required
              maxLength={maxLen}
              className="min-h-[120px] text-base leading-relaxed"
            />
            <p className="text-right text-xs" style={{ color: design.mutedTextColor }}>
              {message.length}/{maxLen}
            </p>
          </div>

          {config.allowAvatar && (
            <div className="space-y-2">
              <Label>Profile photo (optional)</Label>
              <ImageUploadCropper
                defaultAspect="1:1"
                allowedAspects={CROP_PRESETS.portrait}
                previewUrl={avatarUrl || null}
                onClear={() => setAvatarUrl("")}
                onUploaded={(result) => setAvatarUrl(result.url)}
                buttonLabel="Upload photo"
              />
            </div>
          )}

          {config.allowAnonymous && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
              />
              Post anonymously
            </label>
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {success && (
            <div
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold">
                {success === "pending"
                  ? "Thank you. Your message has been received."
                  : config.successTitle || "Your Message Has Been Shared"}
              </p>
              <p className="mt-1">
                {success === "pending"
                  ? config.pendingSuccessMessage ||
                    "Your message will appear after it has been reviewed."
                  : config.successMessage ||
                    "Thank you for adding your words to this celebration. Your message will remain part of the memories the hosts can return to."}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              className="min-h-11"
              disabled={submitting || previewMode}
              style={{ backgroundColor: design.accentColor }}
            >
              {submitting ? "Sharing…" : editingId ? "Save changes" : "Share message"}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setEditingId(null);
                  setAuthorName("");
                  setTitle("");
                  setMessage("");
                  setAvatarUrl("");
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        <p
          className={cn("border p-5 text-center text-sm", radiusClass)}
          style={{ backgroundColor: design.surfaceColor, color: design.mutedTextColor }}
        >
          {config.closedMessage ||
            "Guest messages for this celebration are now closed. Thank you for being part of it."}
        </p>
      )}

      <div className="space-y-4" aria-live="polite">
        {empty && (
          <p className="text-center text-sm" style={{ color: design.mutedTextColor }}>
            Be the first to leave a message the hosts can treasure.
          </p>
        )}
        {messages.map((item) => {
          const isOwner = Boolean(owned[item.id]);
          return (
            <article
              key={item.id}
              className={cn("border p-5", radiusClass)}
              style={{
                backgroundColor: design.surfaceColor,
                borderColor: item.isFeatured ? design.accentColor : `${design.accentColor}22`,
              }}
            >
              {(item.isFeatured || item.isPinned) && (
                <p
                  className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: design.accentColor }}
                >
                  {item.isPinned ? "Pinned" : "Featured"}
                </p>
              )}
              {item.title && (
                <h3 className="mb-2 text-lg" style={{ fontFamily: "var(--ty-display)" }}>
                  {item.title}
                </h3>
              )}
              <p className="text-[16px] leading-[1.7] sm:text-[17px]">{item.message}</p>
              <footer className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {item.avatarUrl ? (
                    <div className="h-10 w-10 overflow-hidden rounded-full">
                      <CeleventicImage
                        src={item.avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${design.accentColor}22`,
                        color: design.accentColor,
                      }}
                      aria-hidden
                    >
                      {initials(item.authorName) || "G"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.authorName}</p>
                    <p className="text-xs" style={{ color: design.mutedTextColor }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                      {item.editedAt ? " · Edited" : ""}
                    </p>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="min-h-11 min-w-11"
                      aria-label="Edit your message"
                      onClick={() => beginEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="min-h-11 min-w-11 text-red-600"
                      aria-label="Delete your message"
                      onClick={() => void removeOwn(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </footer>
            </article>
          );
        })}
      </div>

      {page < totalPages && (
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={loading}
            onClick={() => void load(page + 1, true)}
          >
            {loading ? "Loading…" : "Load more messages"}
          </Button>
        </div>
      )}
    </div>
  );
}
