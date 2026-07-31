"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Download,
  ExternalLink,
  KeyRound,
  Mail,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PartyAllowanceField } from "./party-allowance-field";
import { GuestTagPicker } from "./guest-tag-picker";
import { describeAllowance } from "@/lib/guest-search/party-allowance";
import type { SearchResultCard } from "@/lib/guest-search/types";
import { getClientAppUrl, isLocalHost, sanitizePublicUrl } from "@/lib/app-url";
import { copyText } from "@/lib/clipboard";
import { tableDisplayName } from "@/lib/seating/seating-types";

/** Official-style WhatsApp glyph so share actions are instantly recognizable. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function publicInviteUrl(url: string): string {
  const base = getClientAppUrl();
  if (isLocalHost(url) && !isLocalHost(base)) return sanitizePublicUrl(url, base);
  return url;
}

/**
 * One search result.
 *
 * The card leads with what the organiser is actually looking for at the
 * moment they search: the name, how many the invitation admits, and the code
 * they can read down a phone line. Sharing is one tap; anything destructive
 * lives behind the overflow menu and asks first.
 */

interface GuestResultCardProps {
  eventId: string;
  card: SearchResultCard;
  /** Ranges to embolden in the name, from the current query. */
  highlight?: [number, number][];
  onChanged: (card: SearchResultCard) => void;
}

export function GuestResultCard({ eventId, card, highlight, onChanged }: GuestResultCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  const shareUrl = publicInviteUrl(card.inviteUrl);
  const whatsAppText = `Dear ${card.name},\n\nYou are personally invited. Open your invitation:\n${shareUrl}`;
  const emailBody = card.admissionCode
    ? `${whatsAppText}\n\nYour admission code: ${card.admissionCode}`
    : whatsAppText;

  async function copyLink() {
    const ok = await copyText(shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setError("");
      return;
    }
    setError("Could not copy automatically, tap the link field and copy it.");
  }

  async function runLifecycle(action: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setError("");
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/invitations/${card.invitationId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "That did not work.");
        return;
      }
      if (json.data?.deleted) {
        onChanged({
          ...card,
          archivedAt: new Date().toISOString(),
          passRevoked: true,
        });
        return;
      }
      if (json.data?.card) onChanged(json.data.card as SearchResultCard);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function resetAdmission() {
    if (
      !window.confirm(
        `Reset admission for ${card.name}?\n\nUse this when they left the venue and need to re-enter.\n• Their QR / code can be scanned again like the first time\n• Event Companion locks\n• Their invite link starts from the invitation intro again`
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/invitations/${card.invitationId}/admission/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "entire",
          reason: "Organiser reset for exit / re-entry",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not reset admission.");
        return;
      }
      onChanged({
        ...card,
        tags: card.tags ?? [],
        admittedCount: 0,
        members: card.members.map((m) => ({ ...m, admitted: false })),
        guestStatus:
          card.guestStatus === "CHECKED_IN"
            ? ("ACCEPTED" as SearchResultCard["guestStatus"])
            : card.guestStatus,
      });
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const canResetAdmission =
    card.admittedCount > 0 ||
    card.guestStatus === "CHECKED_IN" ||
    card.members.some((m) => m.admitted);
  const showResetAdmission = !card.archivedAt;

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-xl border p-3 transition-colors ${
        card.archivedAt ? "border-slate-200 bg-slate-50 opacity-75" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            <HighlightedName name={card.name} ranges={highlight} />
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 shrink-0" /> {describeAllowance(card.partySize)}
            </span>
            {card.admittedCount > 0 && (
              <span className="text-emerald-600">{card.admittedCount} admitted</span>
            )}
            {card.admissionCode && (
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <KeyRound className="h-3 w-3 shrink-0" /> {card.admissionCode}
              </span>
            )}
            {card.tableNumber && (
              <span className="break-words">
                {tableDisplayName(card.tableNumber)}
                {card.seatLabel ? ` · seat ${card.seatLabel}` : ""}
              </span>
            )}
            <span className="max-w-full break-all">{card.email || card.phone || "No contact"}</span>
          </div>

          {(card.tags?.length ?? 0) > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {card.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-brand-200 bg-brand-50/80 px-2 py-0.5 text-[10px] font-medium text-brand-800"
                  title="Private organizer tag — guests never see this"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Why this result appeared, when it was not the obvious name match. */}
          {card.matchedField !== "name" && (
            <p className="mt-1 text-xs text-brand-600">{card.matchReason}</p>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {card.archivedAt && <Badge variant="outline">Archived</Badge>}
          {card.passRevoked && !card.archivedAt && <Badge variant="destructive">Pass revoked</Badge>}
          {card.status === "DRAFT" && <Badge variant="warning">Draft</Badge>}
          {canResetAdmission && (
            <Badge variant="success" className="text-[10px]">
              Admitted
            </Badge>
          )}

          {showResetAdmission && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-200 text-amber-900 hover:bg-amber-50"
              onClick={() => void resetAdmission()}
              disabled={busy}
              title="Reset this invitation so they can re-enter; invite link starts from the intro again"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Reset invitation</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            disabled={busy || Boolean(card.archivedAt)}
            title="Edit name, party size, and contact details"
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" /> Edit
          </Button>
          {card.archivedAt ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => runLifecycle("RESTORE")}
              disabled={busy}
            >
              <ArchiveRestore className="h-3.5 w-3.5 shrink-0" /> Restore
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-200 text-amber-900 hover:bg-amber-50"
              onClick={() =>
                runLifecycle(
                  "ARCHIVE",
                  `Archive ${card.name}? The invitation is hidden and the pass stops working. You can restore it later — nothing is permanently deleted.`
                )
              }
              disabled={busy}
              title="Archive invitation (soft remove — restoreable)"
            >
              <Archive className="h-3.5 w-3.5 shrink-0" /> Archive
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() =>
              runLifecycle(
                "DELETE",
                `Permanently delete ${card.name}?\n\nThis removes the guest invitation, their entry pass, and CRM row for this event.\nThis cannot be undone.\n\nTip: use Archive if you may need them again.`
              )
            }
            disabled={busy}
            title="Permanently delete this guest invitation"
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete
          </Button>
          <Button size="sm" variant="outline" onClick={copyLink} disabled={busy}>
            <Copy className="h-3.5 w-3.5 shrink-0" /> {copied ? "Copied" : "Link"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E] hover:border-[#25D366]/70 hover:bg-[#25D366]/20 hover:text-[#075E54]"
            asChild
          >
            <a
              href={`https://wa.me/${(card.phone ?? "").replace(/\D+/g, "")}?text=${encodeURIComponent(whatsAppText)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share invitation with ${card.name} on WhatsApp`}
              title="Share on WhatsApp"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span className="sr-only">WhatsApp</span>
            </a>
          </Button>

          <div className="relative" ref={menuRef}>
            <Button
              size="sm"
              variant="ghost"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`More actions for ${card.name}`}
              onClick={() => setMenuOpen((open) => !open)}
              disabled={busy}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 w-[min(14rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                <MenuItem icon={ExternalLink} href={card.invitePath}>
                  Open invitation
                </MenuItem>
                <MenuItem
                  icon={Mail}
                  href={`mailto:${card.email ?? ""}?subject=${encodeURIComponent(`Your invitation, ${card.name}`)}&body=${encodeURIComponent(emailBody)}`}
                >
                  Email invitation
                </MenuItem>
                <MenuItem
                  icon={Download}
                  href={`/api/qr/image?data=${encodeURIComponent(shareUrl)}&mode=pass&size=1024&download=1`}
                >
                  Download QR
                </MenuItem>
                <MenuItem icon={Pencil} onClick={() => { setEditing(true); setMenuOpen(false); }}>
                  Edit name & party size
                </MenuItem>
                {canResetAdmission && (
                  <MenuItem
                    icon={RotateCcw}
                    destructive
                    onClick={() => void resetAdmission()}
                  >
                    Reset admission (re-entry)
                  </MenuItem>
                )}

                <div className="my-1 border-t border-slate-100" />

                {!card.passRevoked && (
                  <MenuItem
                    icon={ShieldOff}
                    destructive
                    onClick={() =>
                      runLifecycle(
                        "REVOKE_PASS",
                        `Revoke ${card.name}'s entry pass? Their QR will be refused at the gate.`
                      )
                    }
                  >
                    Revoke entry pass
                  </MenuItem>
                )}
                {card.passRevoked && !card.archivedAt && (
                  <MenuItem icon={KeyRound} onClick={() => runLifecycle("REISSUE_PASS")}>
                    Issue a new pass
                  </MenuItem>
                )}
                {card.archivedAt ? (
                  <MenuItem icon={ArchiveRestore} onClick={() => runLifecycle("RESTORE")}>
                    Restore invitation
                  </MenuItem>
                ) : (
                  <MenuItem
                    icon={Archive}
                    destructive
                    onClick={() =>
                      runLifecycle(
                        "ARCHIVE",
                        `Archive ${card.name}? The invitation is hidden and the pass stops working. You can restore it later — nothing is permanently deleted.`
                      )
                    }
                  >
                    Archive invitation
                  </MenuItem>
                )}
                <MenuItem
                  icon={Trash2}
                  destructive
                  onClick={() =>
                    runLifecycle(
                      "DELETE",
                      `Permanently delete ${card.name}?\n\nThis removes the guest invitation, their entry pass, and CRM row for this event.\nThis cannot be undone.\n\nTip: use Archive if you may need them again.`
                    )
                  }
                >
                  Delete permanently
                </MenuItem>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {editing && (
        <EditPanel
          eventId={eventId}
          card={card}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            onChanged(next);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  href,
  destructive,
}: {
  icon: typeof Copy;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
}) {
  const className = `flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
    destructive ? "text-red-600" : "text-slate-700"
  }`;

  if (href) {
    return (
      <a role="menuitem" href={href} target="_blank" rel="noopener noreferrer" className={className}>
        <Icon className="h-3.5 w-3.5" /> {children}
      </a>
    );
  }
  return (
    <button role="menuitem" type="button" onClick={onClick} className={className}>
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

/** Inline edit. The link is never regenerated, see the personalisation route. */
function EditPanel({
  eventId,
  card,
  onClose,
  onSaved,
}: {
  eventId: string;
  card: SearchResultCard;
  onClose: () => void;
  onSaved: (card: SearchResultCard) => void;
}) {
  const [name, setName] = useState(card.name);
  const [partySize, setPartySize] = useState(card.partySize);
  const [phone, setPhone] = useState(card.phone ?? "");
  const [email, setEmail] = useState(card.email ?? "");
  const [tagIds, setTagIds] = useState<string[]>(() => (card.tags ?? []).map((tag) => tag.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!card.guestId && tagIds.length > 0) {
      setError("This invitation has no guest row to tag yet.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/invitations/${card.invitationId}/personalisation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          partySize,
          phone: phone.trim() || null,
          email: email.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not save the changes.");
        return;
      }

      let nextCard = (json.data?.card as SearchResultCard | undefined) ?? {
        ...card,
        name,
        partySize,
        phone: phone.trim() || null,
        email: email.trim() || null,
        tags: card.tags ?? [],
      };

      if (card.guestId) {
        const tagRes = await fetch(`/api/guests/${card.guestId}/tags`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds }),
        });
        const tagJson = await tagRes.json();
        if (!tagRes.ok) {
          setError(tagJson.error ?? "Details saved, but tags could not be updated.");
          if (tagJson.data?.card) onSaved(tagJson.data.card as SearchResultCard);
          else onSaved(nextCard);
          return;
        }
        if (tagJson.data?.card) {
          nextCard = tagJson.data.card as SearchResultCard;
        } else {
          nextCard = {
            ...nextCard,
            tags: (tagJson.data?.tags as SearchResultCard["tags"]) ?? [],
          };
        }
      }

      onSaved(nextCard);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="space-y-1">
        <Label htmlFor={`edit-name-${card.invitationId}`}>Guest or invitation name</Label>
        <Input
          id={`edit-name-${card.invitationId}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <PartyAllowanceField value={partySize} onChange={setPartySize} label="Number of people admitted" />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`edit-phone-${card.invitationId}`}>Phone</Label>
          <Input
            id={`edit-phone-${card.invitationId}`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`edit-email-${card.invitationId}`}>Email</Label>
          <Input
            id={`edit-email-${card.invitationId}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {card.guestId ? (
        <GuestTagPicker
          eventId={eventId}
          selectedIds={tagIds}
          onChange={setTagIds}
          disabled={saving}
        />
      ) : (
        <p className="text-xs text-slate-500">
          Tags become available once this invitation has a guest record.
        </p>
      )}

      <p className="text-xs text-slate-500">
        The invitation link stays exactly the same, so anything you have already sent keeps working.
      </p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving || name.trim().length < 2}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function HighlightedName({ name, ranges }: { name: string; ranges?: [number, number][] }) {
  if (!ranges || ranges.length === 0) return <>{name}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    if (start > cursor) parts.push(name.slice(cursor, start));
    parts.push(
      <mark key={index} className="rounded bg-brand-100 px-0.5 text-brand-800">
        {name.slice(start, end)}
      </mark>
    );
    cursor = end;
  });
  if (cursor < name.length) parts.push(name.slice(cursor));

  return <>{parts}</>;
}
