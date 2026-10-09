"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Heart, Loader2, Pencil, Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { invitationFontVars } from "@/lib/invitation-fonts";
import {
  FASHION_TOKEN_VALUES,
  LUXURY_FASHION_LAYOUT_SLUG,
  fashionHouseLogoSrc,
  fashionHouseNameplate,
  fashionTokenStyleFromColors,
} from "@/lib/experience/luxury-fashion";
import {
  aureliaFamilyDefaults,
  aureliaTokenStyle,
  isAureliaEditorialLayout,
  SERAPHINE_LAYOUT_SLUG,
} from "@/lib/experience/aurelia-editorial";
import { FEED_LIMIT } from "@/lib/pagination";
import {
  viewerCanDeleteWish,
  viewerCanEditWish,
} from "@/lib/invitation/guest-wish-permissions";
import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";
import cb from "./condolence-book.module.css";
import fw from "./fashion-guest-wishes.module.css";
import aw from "./aurelia-guest-wishes.module.css";
import { FashionHouseLogoMark, FashionQuillMark, FashionSalonMark } from "./fashion-wish-marks";

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
  /** When the template already owns Memory Vault, hide the wishes teaser line. */
  suppressMemoryHint?: boolean;
  variant?: "light" | "dark";
  /** Celebration vs memorial copy (title, placeholders, CTAs). */
  tone?: "celebration" | "memorial";
  /** Hide card title/lead when the parent page already provides them. */
  hideHeader?: boolean;
  /** Invitation layout slug — fashion flagship gets a couture salon skin. */
  layout?: string | null;
  /** House colors so Vale gold (not Femmora pink) can tint the salon hairline. */
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  } | null;
  /** Fashion house nameplate for the wishes kicker (DNA `houseName`, not a shared salon label). */
  houseName?: string | null;
  /** Fashion house crest (DNA `logoUrl`). Missing/empty uses a neutral salon mark — never Femmora’s. */
  houseLogoUrl?: string | null;
  /** Optional house DNA. Used when name/logo are not passed as separate props. */
  fashionHouse?: {
    houseName?: string | null;
    logoUrl?: string | null;
    wishesTitle?: string | null;
    wishesEmpty?: string | null;
  } | null;
}

const PAGE_SIZE = FEED_LIMIT;

function formatWishTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function formatWishSignature(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function aureliaWishTokenStyle(layout?: string | null): CSSProperties {
  return aureliaTokenStyle(aureliaFamilyDefaults(layout).theme) as CSSProperties;
}

function fashionSalonTokenStyle(
  colors?: GuestWishesCardProps["colors"]
): CSSProperties {
  const house = fashionTokenStyleFromColors(colors);
  return {
    ...house,
    "--ff-ivory": FASHION_TOKEN_VALUES.ivory,
    "--ff-cream": FASHION_TOKEN_VALUES.cream,
    "--ff-pearl": FASHION_TOKEN_VALUES.pearl,
    "--ff-espresso": FASHION_TOKEN_VALUES.espresso,
    "--ff-mocha": FASHION_TOKEN_VALUES.mocha,
    "--ff-ink": FASHION_TOKEN_VALUES.ink,
    "--wish-accent": house["--ff-gold-deep"],
  } as CSSProperties;
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
  tone = "celebration",
  hideHeader = false,
  layout = null,
  colors = null,
  houseName = null,
  houseLogoUrl = null,
  fashionHouse = null,
}: GuestWishesCardProps) {
  const dark = variant === "dark";
  const memorial = tone === "memorial";
  const fashion = !memorial && layout === LUXURY_FASHION_LAYOUT_SLUG;
  const aurelia = !memorial && !fashion && isAureliaEditorialLayout(layout);
  const wedding = !memorial && !fashion && !aurelia && layout === "forever-afaris-wedding";
  const wishInk = colors?.text || colors?.primary || "#1B365D";
  const wishGold = colors?.secondary || colors?.accent || "#C7A35A";
  const wishPaper = colors?.background || "#FBF6EF";
  const wishScript = `color-mix(in srgb, ${wishGold} 62%, #2a2114)`;
  const resolvedHouseName = houseName ?? fashionHouse?.houseName ?? null;
  const houseLogoSrc = fashion
    ? fashionHouseLogoSrc({
        logoUrl: houseLogoUrl ?? fashionHouse?.logoUrl,
        houseName: resolvedHouseName,
      })
    : null;
  const memorialAccent = memorial
    ? accentColor === "#0B8A83"
      ? "#9c3a3a"
      : accentColor
    : accentColor;
  const copy = memorial
    ? {
        title: "Book of Condolences",
        kicker: "",
        lead: "Inscribe a message of comfort for the family.",
        leadModerator: " As organizer or admin, you can edit or remove any inscription.",
        leadGuest: " Messages appear in this book for every guest at this memorial.",
        nameLabel: "Your name",
        namePlaceholder: "e.g. Ama Serwaa",
        messageLabel: "Your inscription",
        placeholder: "A condolence, prayer, or cherished memory…",
        submit: "Inscribe in the book",
        loading: "Opening the book…",
        empty: "Be the first to leave a word of comfort in this book.",
        success: "Your wish was shared with everyone invited.",
        nounOne: "inscription",
        nounMany: "inscriptions",
        loadMore: "Read more inscriptions",
      }
    : fashion
      ? {
          title:
            fashionHouse?.wishesTitle?.trim() ||
            "Compliments and guest wishes to the host",
          kicker: fashionHouseNameplate(resolvedHouseName),
          lead: "",
          leadModerator: "",
          leadGuest: "",
          nameLabel: "Your name",
          namePlaceholder: "As you wish it written",
          messageLabel: "Your note",
          placeholder: "A first impression, a compliment, a word for this opening…",
          submit: "Leave your note",
          loading: "Opening the house…",
          empty:
            fashionHouse?.wishesEmpty?.trim() ||
            "The atelier is still quiet — leave the first compliment.",
          success: "Your note is now visible to every guest.",
          nounOne: "note",
          nounMany: "notes",
          loadMore: "Read further notes",
        }
      : aurelia
        ? {
            title: "Guest Wishes",
            kicker: "With love",
            lead: "Leave a blessing for the couple.",
            leadModerator: " As organizer or admin, you can edit or remove any wish.",
            leadGuest: " Kind notes are shared with every guest invited to this celebration.",
            nameLabel: "Your name",
            namePlaceholder: "e.g. Ama Serwaa",
            messageLabel: "Your blessing",
            placeholder: "Write a wish, prayer, or blessing…",
            submit: "Share your blessing",
            loading: "Gathering blessings…",
            empty: "Be the first to leave a blessing for this celebration.",
            success: "Your blessing was shared with everyone invited.",
            nounOne: "blessing",
            nounMany: "blessings",
            loadMore: "Read more blessings",
          }
      : {
          title: "Guest Wishes",
          kicker: "",
          lead: "Leave a blessing for the hosts.",
          leadModerator: " As organizer or admin, you can edit or remove any wish.",
          leadGuest:
            " Approved wishes are shared with every guest invited to this celebration.",
          nameLabel: "Your name",
          namePlaceholder: "e.g. Ama Serwaa",
          messageLabel: "Your wish",
          placeholder: "Write your wish or blessing…",
          submit: "Share wish",
          loading: "Loading wishes…",
          empty: "Be the first to leave a wish for this celebration.",
          success: "Your wish was shared with everyone invited.",
          nounOne: "wish",
          nounMany: "wishes",
          loadMore: "Load more wishes",
        };
  const [wishes, setWishes] = useState<GuestWishItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [loadingMore, setLoadingMore] = useState(false);
  const [authorName, setAuthorName] = useState(guestName?.trim() || "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAuthorName, setEditAuthorName] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submittingRef = useRef(false);
  const editingRef = useRef<string | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean, opts?: { silent?: boolean }) => {
      if (!eventId && !inviteLink && !invitationId) {
        setWishes([]);
        setCanModerate(false);
        setHasMore(false);
        setTotal(0);
        setLoading(false);
        return;
      }
      if (!opts?.silent) {
        if (append) setLoadingMore(true);
        else setLoading(true);
      }
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (eventId) params.set("eventId", eventId);
        if (inviteLink) params.set("link", inviteLink);
        if (invitationId) params.set("invitationId", invitationId);
        const res = await fetch(`/api/invite/wishes?${params.toString()}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as {
          success?: boolean;
          data?: {
            items?: GuestWishItem[];
            total?: number;
            hasMore?: boolean;
            pages?: number;
            canModerate?: boolean;
          };
        } | null;
        if (res.ok && data?.success) {
          const items = (data.data?.items ?? []) as GuestWishItem[];
          setWishes((prev) => {
            if (append) {
              const seen = new Set(prev.map((w) => w.id));
              const merged = [...prev];
              for (const item of items) {
                if (!seen.has(item.id)) {
                  seen.add(item.id);
                  merged.push(item);
                }
              }
              return merged;
            }
            if (opts?.silent && prev.length) {
              const incoming = new Map(items.map((item) => [item.id, item]));
              const rest = prev.filter((wish) => !incoming.has(wish.id));
              return [...items, ...rest];
            }
            return items;
          });
          setTotal(data.data?.total ?? 0);
          setHasMore(Boolean(data.data?.hasMore ?? pageNum < (data.data?.pages ?? 1)));
          setPage(pageNum);
          setCanModerate(Boolean(data.data?.canModerate));
        } else if (!append && !opts?.silent) {
          setCanModerate(false);
          setWishes([]);
          setTotal(0);
          setHasMore(false);
        }
      } catch {
        if (!append && !opts?.silent) setCanModerate(false);
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
    if (!eventId && !inviteLink && !invitationId) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (submittingRef.current || editingRef.current) return;
      void fetchPage(1, false, { silent: true });
    };
    const interval = window.setInterval(refresh, 8000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchPage, eventId, inviteLink, invitationId]);

  useEffect(() => {
    if (guestName?.trim()) setAuthorName(guestName.trim());
  }, [guestName]);

  const canModerateWish = viewerCanDeleteWish({ canModerate, allowAuthorSelfManage: false });
  const canEditWish = viewerCanEditWish(canModerate, { allowAuthorSelfManage: false });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId && !inviteLink && !invitationId) {
      setError("This invitation is not linked to an event yet.");
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const preview = isPreviewInvitationId(inviteLink) || isPreviewInvitationId(invitationId);
      const res = await fetch("/api/invite/wishes", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventId || undefined,
          invitationId: invitationId || undefined,
          guestId: preview ? undefined : guestId || undefined,
          link: inviteLink || undefined,
          authorName: authorName.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const raw = typeof data.error === "string" ? data.error : "";
        setError(
          !raw || raw === "Required"
            ? fashion
              ? "Could not save your note. Please try again."
              : "Could not save your wish. Please try again."
            : raw
        );
        return;
      }
      setMessage("");
      setSuccess(copy.success);
      if (data.data) {
        const created = data.data as GuestWishItem;
        setWishes((prev) => [created, ...prev.filter((w) => w.id !== created.id)]);
        setTotal((t) => t + 1);
      } else {
        await fetchPage(1, false);
      }
    } catch {
      setError(
        fashion
          ? "Could not save your note. Please try again."
          : "Could not save your wish. Please try again."
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function beginEdit(wish: GuestWishItem) {
    if (!canEditWish) return;
    editingRef.current = wish.id;
    setEditingId(wish.id);
    setEditAuthorName(wish.authorName);
    setEditMessage(wish.message);
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    editingRef.current = null;
    setEditingId(null);
    setEditAuthorName("");
    setEditMessage("");
  }

  async function saveEdit(wishId: string) {
    if (!canEditWish || savingEdit) return;
    setSavingEdit(true);
    setError("");
    try {
      const res = await fetch(`/api/invite/wishes/${wishId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: editAuthorName.trim(),
          message: editMessage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not update wish");
        return;
      }
      if (data.data) {
        const updated = data.data as GuestWishItem;
        setWishes((prev) =>
          prev.map((w) =>
            w.id === wishId
              ? {
                  ...w,
                  authorName: updated.authorName,
                  message: updated.message,
                }
              : w
          )
        );
      }
      cancelEdit();
      setSuccess(fashion ? "Note updated." : "Wish updated.");
    } catch {
      setError("Could not update wish. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeWish(wish: GuestWishItem) {
    if (!canModerateWish || deletingId) return;
    const label = wish.authorName?.trim() || "this guest";
    if (
      !window.confirm(
        fashion
          ? `Permanently remove the note from ${label}? This cannot be undone.`
          : `Permanently delete the wish from ${label}? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(wish.id);
    setError("");
    try {
      const res = await fetch(`/api/invite/wishes/${wish.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not delete wish");
        return;
      }
      if (editingId === wish.id) cancelEdit();
      setWishes((prev) => prev.filter((w) => w.id !== wish.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      setError("Could not delete wish. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const fieldClass = memorial
    ? `h-11 ${cb.field}`
    : dark
      ? "bg-white/10 border-white/20 text-white placeholder:text-white/45 font-[family-name:var(--font-sans)] text-base"
      : wedding
        ? "h-12 rounded-xl border bg-[#FFFDFA] px-4 font-[family-name:var(--font-cormorant)] text-[1.125rem] leading-normal shadow-none placeholder:text-[#1B365D]/55 focus-visible:ring-[#C7A35A]/30"
        : "bg-white/95 border-rose-200/70 text-slate-800 placeholder:text-slate-400 font-[family-name:var(--font-sans)] text-base shadow-sm";
  const weddingFieldStyle: CSSProperties | undefined = wedding
    ? { borderColor: wishGold, color: wishInk, backgroundColor: "#FFFDFA" }
    : undefined;

  if (memorial) {
    return (
      <div
        className={cb.book}
        style={{ ["--wish-accent" as string]: memorialAccent }}
      >
        <div className={cb.inner}>
          {!hideHeader && (
            <>
              <div className="mb-1 flex items-end justify-between gap-3">
                <h3 className={cb.headerTitle}>{copy.title}</h3>
                {total > 0 && (
                  <span className={cb.count}>
                    {total} {total === 1 ? copy.nounOne : copy.nounMany}
                  </span>
                )}
              </div>
              <p className={cb.headerLead}>
                {copy.lead}
                {canModerate ? copy.leadModerator : copy.leadGuest}
              </p>
            </>
          )}
          {hideHeader && total > 0 && (
            <p className={cb.count}>
              {total} {total === 1 ? copy.nounOne : copy.nounMany}
            </p>
          )}

          <form onSubmit={(e) => void submit(e)} className={cb.form}>
            <div>
              <label htmlFor="guest-wish-name" className={cb.label}>
                Your name
              </label>
              <Input
                id="guest-wish-name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Ama Serwaa"
                required
                maxLength={80}
                className={`h-11 ${cb.field}`}
              />
            </div>
            <div>
              <label htmlFor="guest-wish-message" className={cb.label}>
                {copy.messageLabel}
              </label>
              <Textarea
                id="guest-wish-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={copy.placeholder}
                required
                rows={3}
                maxLength={1000}
                className={`min-h-[96px] resize-y ${cb.field}`}
              />
            </div>
            {error && <p className={cb.error}>{error}</p>}
            {success && <p className={cb.success}>{success}</p>}
            <button
              type="submit"
              disabled={submitting || !authorName.trim() || message.trim().length < 2}
              className={cb.submit}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" strokeWidth={1.75} />
              )}
              {copy.submit}
            </button>
          </form>

          <div className={cb.feed}>
            {loading ? (
              <p className={cb.status}>{copy.loading}</p>
            ) : wishes.length === 0 ? (
              <p className={cb.status}>{copy.empty}</p>
            ) : (
              wishes.map((w) => {
                const isEditing = editingId === w.id;
                return (
                  <article key={w.id} className={cb.entry}>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editAuthorName}
                          onChange={(e) => setEditAuthorName(e.target.value)}
                          maxLength={80}
                          aria-label="Edit author name"
                          className={cb.field}
                        />
                        <Textarea
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          rows={3}
                          maxLength={1000}
                          aria-label="Edit wish message"
                          className={cb.field}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              savingEdit ||
                              !editAuthorName.trim() ||
                              editMessage.trim().length < 2
                            }
                            onClick={() => void saveEdit(w.id)}
                            className={cb.saveBtn}
                          >
                            {savingEdit ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={savingEdit}
                            onClick={cancelEdit}
                            className={cb.cancelBtn}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {canModerate && (
                          <div className={cb.actions}>
                            {canEditWish && (
                              <button
                                type="button"
                                onClick={() => beginEdit(w)}
                                disabled={deletingId === w.id}
                                aria-label={`Edit wish from ${w.authorName}`}
                                title="Edit"
                                className={cb.actionBtn}
                              >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </button>
                            )}
                            {canModerateWish && (
                              <button
                                type="button"
                                onClick={() => void removeWish(w)}
                                disabled={deletingId === w.id}
                                aria-label={`Delete wish from ${w.authorName}`}
                                title="Delete"
                                className={cb.actionBtn}
                              >
                                {deletingId === w.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                        <p className={cb.entryQuote}>
                          <span className={cb.quoteMark} aria-hidden>
                            “
                          </span>
                          {w.message}
                        </p>
                        <div className={cb.meta}>
                          <p className={cb.author}>{w.authorName}</p>
                          <span className={cb.time}>{formatWishTime(w.createdAt)}</span>
                        </div>
                      </>
                    )}
                  </article>
                );
              })
            )}
            {hasMore && !loading && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cb.loadMore}
                disabled={loadingMore}
                onClick={() => void fetchPage(page + 1, true)}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Read more inscriptions"
                )}
              </Button>
            )}
          </div>

          {memoryVaultEnabled && !suppressMemoryHint && (
            <p className={cb.hint}>
              <Sparkles className="h-3 w-3" /> Find the Album, share your experience from your lens
            </p>
          )}
        </div>
      </div>
    );
  }

  if (aurelia) {
    return (
      <div
        className={`${invitationFontVars} ${aw.card}${
          layout === SERAPHINE_LAYOUT_SLUG ? ` ${aw.seraphine}` : ""
        }`}
        style={aureliaWishTokenStyle(layout)}
        data-testid="aurelia-guest-wishes"
      >
        {!hideHeader && (
          <header className={aw.header}>
            <span className={aw.kicker}>{copy.kicker}</span>
            <h3 className={aw.title}>{copy.title}</h3>
            <div className={aw.rule} />
            {total > 0 ? (
              <span className={aw.count}>
                {total} {total === 1 ? copy.nounOne : copy.nounMany}
              </span>
            ) : null}
            <p className={aw.lede}>
              {copy.lead}
              {canModerate ? copy.leadModerator : copy.leadGuest}
            </p>
          </header>
        )}
        {hideHeader && total > 0 ? (
          <p className={aw.count}>
            {total} {total === 1 ? copy.nounOne : copy.nounMany}
          </p>
        ) : null}

        <form onSubmit={(e) => void submit(e)} className={aw.form} noValidate>
          <div>
            <label htmlFor="aurelia-guest-wish-name" className={aw.label}>
              {copy.nameLabel}
            </label>
            <Input
              id="aurelia-guest-wish-name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder={copy.namePlaceholder}
              required
              autoComplete="name"
              maxLength={80}
              className={aw.field}
            />
          </div>
          <div>
            <label htmlFor="aurelia-guest-wish-message" className={aw.label}>
              {copy.messageLabel}
            </label>
            <Textarea
              id="aurelia-guest-wish-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={copy.placeholder}
              required
              minLength={2}
              rows={4}
              maxLength={1000}
              className={`${aw.field} ${aw.letter}`}
            />
          </div>
          {error ? (
            <p className={aw.error} role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className={aw.success} role="status">
              {success}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting || !authorName.trim() || message.trim().length < 2}
            className={aw.submit}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={1.6} />}
            {copy.submit}
          </button>
        </form>

        <div className={aw.feed} aria-live="polite" data-testid="aurelia-wish-feed">
          {loading ? (
            <p className={aw.status}>{copy.loading}</p>
          ) : wishes.length === 0 ? (
            <p className={aw.status}>{copy.empty}</p>
          ) : (
            wishes.map((w) => {
              const isEditing = editingId === w.id;
              return (
                <article key={w.id} className={aw.entry}>
                  {isEditing ? (
                    <div className={aw.editStack}>
                      <Input
                        value={editAuthorName}
                        onChange={(e) => setEditAuthorName(e.target.value)}
                        maxLength={80}
                        aria-label="Edit author name"
                        className={aw.field}
                      />
                      <Textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        aria-label="Edit wish message"
                        className={`${aw.field} ${aw.letter}`}
                      />
                      <div className={aw.editRow}>
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            savingEdit || !editAuthorName.trim() || editMessage.trim().length < 2
                          }
                          onClick={() => void saveEdit(w.id)}
                          className={aw.saveBtn}
                        >
                          {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingEdit}
                          onClick={cancelEdit}
                          className={aw.cancelBtn}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {canModerate ? (
                        <div className={aw.actions}>
                          {canEditWish ? (
                            <button
                              type="button"
                              onClick={() => beginEdit(w)}
                              disabled={deletingId === w.id}
                              aria-label={`Edit wish from ${w.authorName}`}
                              title="Edit"
                              className={aw.actionBtn}
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />
                            </button>
                          ) : null}
                          {canModerateWish ? (
                            <button
                              type="button"
                              onClick={() => void removeWish(w)}
                              disabled={deletingId === w.id}
                              aria-label={`Delete wish from ${w.authorName}`}
                              title="Delete"
                              className={aw.actionBtn}
                            >
                              {deletingId === w.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                              )}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      <p className={aw.quote}>
                        <span className={aw.quoteMark} aria-hidden>
                          “
                        </span>
                        {w.message}
                      </p>
                      <div className={aw.meta}>
                        <p className={aw.author}>{w.authorName}</p>
                        <span className={aw.time}>{formatWishTime(w.createdAt)}</span>
                      </div>
                    </>
                  )}
                </article>
              );
            })
          )}
          {hasMore && !loading ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={aw.loadMore}
              disabled={loadingMore}
              onClick={() => void fetchPage(page + 1, true)}
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.loadMore}
            </Button>
          ) : null}
        </div>

        {aurelia ? null : memoryVaultEnabled && !suppressMemoryHint ? (
          <p className={aw.hint}>Find the Album — share a photograph from the day</p>
        ) : null}
      </div>
    );
  }

  if (fashion) {
    return (
      <div
        className={`${invitationFontVars} ${fw.salon}`}
        style={fashionSalonTokenStyle(colors)}
        data-testid="fashion-guest-wishes"
        data-house-name={copy.kicker}
        data-house-logo={houseLogoSrc ?? ""}
      >
        <div className={fw.inner}>
          {!hideHeader && (
            <>
              <div className={fw.headerRow}>
                <div className={fw.headerLead}>
                  {houseLogoSrc ? (
                    <FashionHouseLogoMark src={houseLogoSrc} className={fw.markLogo} />
                  ) : (
                    <FashionSalonMark className={fw.mark} />
                  )}
                  <div className={fw.headerLeadCopy}>
                    {copy.kicker ? <p className={fw.kicker}>{copy.kicker}</p> : null}
                    <h3 className={fw.title}>{copy.title}</h3>
                  </div>
                </div>
                {total > 0 && (
                  <span className={fw.count}>
                    {total} {total === 1 ? copy.nounOne : copy.nounMany}
                  </span>
                )}
              </div>
              {(copy.lead || (canModerate ? copy.leadModerator : copy.leadGuest)) ? (
                <p className={fw.lede}>
                  {copy.lead}
                  {canModerate ? copy.leadModerator : copy.leadGuest}
                </p>
              ) : null}
            </>
          )}
          {hideHeader && total > 0 && (
            <p className={fw.count}>
              {total} {total === 1 ? copy.nounOne : copy.nounMany}
            </p>
          )}

          <form onSubmit={(e) => void submit(e)} className={fw.form} noValidate>
            <div>
              <label htmlFor="fashion-guest-wish-name" className={fw.label}>
                {copy.nameLabel}
              </label>
              <Input
                id="fashion-guest-wish-name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={copy.namePlaceholder}
                required
                autoComplete="name"
                maxLength={80}
                className={fw.field}
              />
            </div>
            <div>
              <label htmlFor="fashion-guest-wish-message" className={fw.label}>
                {copy.messageLabel}
              </label>
              <Textarea
                id="fashion-guest-wish-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={copy.placeholder}
                required
                minLength={2}
                rows={4}
                maxLength={1000}
                className={`${fw.field} ${fw.letter}`}
              />
            </div>
            {error && (
              <p className={fw.error} role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className={fw.success} role="status">
                {success}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || !authorName.trim() || message.trim().length < 2}
              className={fw.submit}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FashionQuillMark className={fw.quill} />
              )}
              {copy.submit}
            </button>
          </form>

          <div className={fw.feed} aria-live="polite" data-testid="fashion-wish-feed">
            {loading ? (
              <p className={fw.status}>{copy.loading}</p>
            ) : wishes.length === 0 ? (
              <p className={fw.status}>{copy.empty}</p>
            ) : (
              wishes.map((w) => {
                const isEditing = editingId === w.id;
                return (
                  <article key={w.id} className={fw.entry}>
                    {isEditing ? (
                      <div className={fw.editStack}>
                        <Input
                          value={editAuthorName}
                          onChange={(e) => setEditAuthorName(e.target.value)}
                          maxLength={80}
                          aria-label="Edit author name"
                          className={fw.field}
                        />
                        <Textarea
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          rows={3}
                          maxLength={1000}
                          aria-label="Edit wish message"
                          className={`${fw.field} ${fw.letter}`}
                        />
                        <div className={fw.editRow}>
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              savingEdit ||
                              !editAuthorName.trim() ||
                              editMessage.trim().length < 2
                            }
                            onClick={() => void saveEdit(w.id)}
                            className={fw.saveBtn}
                          >
                            {savingEdit ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={savingEdit}
                            onClick={cancelEdit}
                            className={fw.cancelBtn}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {canModerate && (
                          <div className={fw.actions}>
                            {canEditWish && (
                              <button
                                type="button"
                                onClick={() => beginEdit(w)}
                                disabled={deletingId === w.id}
                                aria-label={`Edit note from ${w.authorName}`}
                                title="Edit"
                                className={fw.actionBtn}
                              >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />
                              </button>
                            )}
                            {canModerateWish && (
                              <button
                                type="button"
                                onClick={() => void removeWish(w)}
                                disabled={deletingId === w.id}
                                aria-label={`Delete note from ${w.authorName}`}
                                title="Delete"
                                className={fw.actionBtn}
                              >
                                {deletingId === w.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                        <p className={fw.quote}>
                          <span className={fw.quoteMark} aria-hidden>
                            “
                          </span>
                          {w.message}
                        </p>
                        <div className={fw.meta}>
                          <p className={fw.author}>{w.authorName}</p>
                          <span className={fw.time}>{formatWishTime(w.createdAt)}</span>
                        </div>
                      </>
                    )}
                  </article>
                );
              })
            )}
            {hasMore && !loading && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={fw.loadMore}
                disabled={loadingMore}
                onClick={() => void fetchPage(page + 1, true)}
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.loadMore}
              </Button>
            )}
          </div>

          {memoryVaultEnabled && !suppressMemoryHint && (
            <p className={fw.hint}>Find the Album — share the house from your lens</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inv-3d-scene rounded-2xl border p-5 sm:p-6 ${
        dark
          ? "border-white/15 bg-black/35 backdrop-blur-xl shadow-lg"
          : wedding
            ? "bg-[#FBF6EF] shadow-[0_18px_44px_-30px_rgba(27,54,93,0.55)]"
            : "border-rose-200/60 bg-gradient-to-br from-rose-50 via-white to-rose-50/40 shadow-lg"
      }`}
      style={
        wedding
          ? {
              ["--wish-accent" as string]: wishGold,
              backgroundColor: wishPaper,
              borderColor: wishGold,
              color: wishInk,
            }
          : { ["--wish-accent" as string]: accentColor }
      }
    >
      {!hideHeader && (
        <>
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  dark ? "bg-white/10" : wedding ? "" : "bg-rose-100/80"
                }`}
                style={{ color: wedding ? wishGold : accentColor, backgroundColor: wedding ? `${wishGold}22` : undefined }}
              >
                <Heart className="h-4 w-4" fill="currentColor" fillOpacity={0.2} />
              </span>
              <h3
                className={
                  wedding
                    ? "font-[family-name:var(--font-great-vibes)] text-[clamp(2.35rem,6.4vw,2.9rem)] font-normal leading-none"
                    : `font-[family-name:var(--font-cormorant)] text-2xl sm:text-[1.65rem] font-semibold tracking-tight leading-none ${
                        dark ? "text-white" : "text-slate-900"
                      }`
                }
                style={wedding ? { color: wishGold } : undefined}
              >
                {copy.title}
              </h3>
            </div>
            {total > 0 && (
              <span
                className={`shrink-0 font-[family-name:var(--font-cinzel)] uppercase ${
                  wedding
                    ? "border-b pb-1 text-[0.68rem] font-semibold tracking-[0.22em]"
                    : `rounded-full px-2.5 py-1 text-[0.75rem] font-medium tracking-[0.08em] ${
                        dark ? "bg-white/10 text-white/70" : "bg-rose-100/70 text-rose-800/80"
                      }`
                }`}
                style={wedding ? { color: wishGold, borderColor: wishGold } : undefined}
              >
                {total} {total === 1 ? copy.nounOne : copy.nounMany}
              </span>
            )}
          </div>

          <p
            className={
              wedding
                ? "mt-3 mb-6 leading-[1.7]"
                : `mt-3 mb-5 text-[15px] leading-relaxed font-[family-name:var(--font-sans)] ${
                    dark ? "text-white/75" : "text-slate-600"
                  }`
            }
            style={
              wedding
                ? {
                    color: wishScript,
                    fontFamily: 'var(--font-parisienne), "Parisienne", cursive',
                    fontSize: "clamp(1.55rem, 4.2vw, 1.85rem)",
                  }
                : undefined
            }
          >
            {copy.lead}
            {canModerate ? copy.leadModerator : copy.leadGuest}
          </p>
        </>
      )}
      {hideHeader && total > 0 && (
        <p
          className={`mb-4 text-right text-[11px] font-medium tracking-wide font-[family-name:var(--font-sans)] ${
            dark ? "text-white/60" : "text-slate-500"
          }`}
        >
          {total} {total === 1 ? copy.nounOne : copy.nounMany}
        </p>
      )}

      <form onSubmit={(e) => void submit(e)} className="space-y-3 mb-6">
        <div className="space-y-1.5">
          <label
            htmlFor="guest-wish-name"
            className={`block font-semibold uppercase ${
              wedding
                ? "font-[family-name:var(--font-cinzel)] text-[0.78rem] tracking-[0.18em]"
                : `text-xs tracking-[0.14em] font-[family-name:var(--font-sans)] ${
                    dark ? "text-white/55" : "text-slate-500"
                  }`
            }`}
            style={wedding ? { color: wishInk } : undefined}
          >
            Your name
          </label>
          <Input
            id="guest-wish-name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="e.g. Ama Serwaa"
            required
            maxLength={80}
            className={`h-11 ${fieldClass}`}
            style={weddingFieldStyle}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="guest-wish-message"
            className={`block font-semibold uppercase ${
              wedding
                ? "font-[family-name:var(--font-cinzel)] text-[0.78rem] tracking-[0.18em]"
                : `text-xs tracking-[0.14em] font-[family-name:var(--font-sans)] ${
                    dark ? "text-white/55" : "text-slate-500"
                  }`
            }`}
            style={wedding ? { color: wishInk } : undefined}
          >
            {copy.messageLabel}
          </label>
          <Textarea
            id="guest-wish-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={copy.placeholder}
            required
            rows={3}
            maxLength={1000}
            className={`min-h-[96px] resize-y ${fieldClass}${wedding ? " italic" : ""}`}
            style={weddingFieldStyle}
          />
        </div>
        {error && (
          <p className="text-sm font-[family-name:var(--font-sans)] text-red-500">{error}</p>
        )}
        {success && !wedding && (
          <p className="text-sm font-[family-name:var(--font-sans)] text-emerald-600">{success}</p>
        )}
        <Button
          type="submit"
          disabled={submitting || !authorName.trim() || message.trim().length < 2}
          className={`w-full h-12 gap-2 shadow-none ${
            wedding
              ? "font-[family-name:var(--font-cinzel)] text-[0.82rem] font-semibold uppercase tracking-[0.16em]"
              : "text-[15px] font-semibold font-[family-name:var(--font-sans)]"
          }`}
          style={
            wedding
              ? {
                  backgroundColor: wishGold,
                  backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${wishGold} 46%, white), ${wishGold})`,
                  color: wishInk,
                }
              : { backgroundColor: accentColor }
          }
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {copy.submit}
        </Button>
      </form>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {loading ? (
          <p
            className={`text-center py-8 ${
              wedding
                ? "font-[family-name:var(--font-cormorant)] text-[1.2rem] leading-relaxed"
                : `text-[15px] font-[family-name:var(--font-sans)] ${dark ? "text-white/50" : "text-slate-500"}`
            }`}
            style={wedding ? { color: wishInk } : undefined}
          >
            {copy.loading}
          </p>
        ) : wishes.length === 0 ? (
          <p
            className={`text-center py-8 ${
              wedding
                ? "font-[family-name:var(--font-cormorant)] text-[1.2rem] leading-relaxed"
                : `text-[15px] font-[family-name:var(--font-sans)] ${dark ? "text-white/45" : "text-slate-500"}`
            }`}
            style={wedding ? { color: wishInk } : undefined}
          >
            {copy.empty}
          </p>
        ) : (
          wishes.map((w) => {
            const isEditing = editingId === w.id;
            return (
              <article
                key={w.id}
                className={`inv-3d-card ${
                  wedding
                    ? "border-t bg-[#FFFDFA] px-1 py-4 shadow-none"
                    : `rounded-2xl border px-4 py-3.5 ${
                        dark
                          ? "border-white/15 bg-white/10 shadow-sm"
                          : "border-rose-100/90 bg-white/95 shadow-sm"
                      }`
                }`}
                style={wedding ? { borderColor: `${wishGold}99` } : undefined}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editAuthorName}
                      onChange={(e) => setEditAuthorName(e.target.value)}
                      maxLength={80}
                      aria-label="Edit author name"
                      className={fieldClass}
                    />
                    <Textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      aria-label="Edit wish message"
                      className={fieldClass}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          savingEdit ||
                          !editAuthorName.trim() ||
                          editMessage.trim().length < 2
                        }
                        onClick={() => void saveEdit(w.id)}
                        style={{ backgroundColor: accentColor }}
                        className="font-[family-name:var(--font-sans)]"
                      >
                        {savingEdit ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={savingEdit}
                        onClick={cancelEdit}
                        className="font-[family-name:var(--font-sans)]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className={`min-w-0 ${
                          wedding
                            ? "leading-[1.65]"
                            : `text-[15px] leading-[1.65] sm:text-base font-[family-name:var(--font-sans)] ${
                                dark ? "text-white/92" : "text-slate-800"
                              }`
                        }`}
                        style={
                          wedding
                            ? {
                                color: wishScript,
                                fontFamily: 'var(--font-parisienne), "Parisienne", cursive',
                                fontSize: "clamp(1.45rem, 4vw, 1.72rem)",
                              }
                            : undefined
                        }
                      >
                        <span
                          className={`select-none ${
                            wedding
                              ? "mr-1.5 inline-block translate-y-[0.18em] font-[family-name:var(--font-great-vibes)] text-[2.35rem] font-normal not-italic leading-none"
                              : `mr-0.5 font-[family-name:var(--font-cormorant)] text-2xl leading-none align-[-0.15em] ${
                                  dark ? "text-rose-300/80" : "text-rose-400"
                                }`
                          }`}
                          style={wedding ? { color: wishGold } : undefined}
                          aria-hidden
                        >
                          “
                        </span>
                        {w.message}
                      </p>
                      {canModerate && (
                        <div className="flex shrink-0 items-start gap-0.5">
                          {canEditWish && (
                            <button
                              type="button"
                              onClick={() => beginEdit(w)}
                              disabled={deletingId === w.id}
                              aria-label={`Edit wish from ${w.authorName}`}
                              title="Edit wish"
                              className={`rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-40 ${
                                dark
                                  ? "text-white/40 hover:text-white/80 hover:bg-white/10 focus-visible:ring-white/30"
                                  : "text-slate-400 hover:text-slate-700 hover:bg-rose-50 focus-visible:ring-rose-200"
                              }`}
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </button>
                          )}
                          {canModerateWish && (
                            <button
                              type="button"
                              onClick={() => void removeWish(w)}
                              disabled={deletingId === w.id}
                              aria-label={`Delete wish from ${w.authorName}`}
                              title="Delete wish"
                              className={`rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-40 ${
                                dark
                                  ? "text-white/40 hover:text-white/80 hover:bg-white/10 focus-visible:ring-white/30"
                                  : "text-slate-400 hover:text-slate-700 hover:bg-rose-50 focus-visible:ring-rose-200"
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
                      )}
                    </div>
                    <div
                      className={
                        wedding
                          ? "mt-3.5 flex items-baseline justify-between gap-3 border-t pt-2.5"
                          : "mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                      }
                      style={wedding ? { borderColor: `${wishGold}55` } : undefined}
                    >
                      <p
                        className={`font-semibold ${
                          wedding
                            ? "inline-block w-fit max-w-[70%] font-[family-name:var(--font-cinzel)] text-[0.84rem] uppercase leading-none tracking-[0.14em]"
                            : "font-[family-name:var(--font-cormorant)] text-sm tracking-wide"
                        }`}
                        style={
                          wedding
                            ? {
                                color: wishInk,
                                borderBottom: `1px solid ${wishGold}`,
                                paddingBottom: "0.2em",
                              }
                            : { color: accentColor }
                        }
                      >
                        {w.authorName}
                      </p>
                      <span
                        className={
                          wedding
                            ? "shrink-0 font-[family-name:var(--font-cormorant)] text-[1.02rem] italic"
                            : `text-xs font-[family-name:var(--font-sans)] ${
                                dark ? "text-white/40" : "text-slate-400"
                              }`
                        }
                        style={wedding ? { color: `${wishInk}b3` } : undefined}
                      >
                        {wedding ? formatWishSignature(w.createdAt) : formatWishTime(w.createdAt)}
                      </span>
                    </div>
                  </>
                )}
              </article>
            );
          })
        )}
        {hasMore && !loading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full font-[family-name:var(--font-sans)]"
            disabled={loadingMore}
            onClick={() => void fetchPage(page + 1, true)}
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.loadMore}
          </Button>
        )}
      </div>

      {memoryVaultEnabled && !suppressMemoryHint && (
        <p
          className={`text-xs text-center flex items-center justify-center gap-1.5 mt-5 font-[family-name:var(--font-sans)] ${
            dark ? "text-white/50" : "text-slate-500"
          }`}
        >
          <Sparkles className="h-3 w-3" /> Find the Album, share your experience from your lens
        </p>
      )}
    </div>
  );
}
