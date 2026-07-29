"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartyAllowanceField } from "./party-allowance-field";
import { GuestResultCard } from "./guest-result-card";
import { suggestAllowance } from "@/lib/guest-search/party-allowance";
import type {
  DuplicateWarning,
  QuickInvitePreview,
  SearchResultCard,
} from "@/lib/guest-search/types";
import { getClientAppUrl, isLocalHost, sanitizePublicUrl } from "@/lib/app-url";
import { copyText } from "@/lib/clipboard";

/** Absolute invite URL safe for copy/WhatsApp/email, never localhost on live. */
function publicInviteUrl(url: string): string {
  const base = getClientAppUrl();
  if (isLocalHost(url) && !isLocalHost(base)) return sanitizePublicUrl(url, base);
  return url;
}

/**
 * Add Guest — one create path for the whole CRM.
 *
 * Creates a personalised invitation (link, entry pass, place card). Name is
 * the only required field; allowance is suggested from the typed name.
 */

interface QuickCreateCardProps {
  eventId: string | null;
  onCreated: (card: SearchResultCard) => void;
  onChanged: (card: SearchResultCard) => void;
}

const PREVIEW_DEBOUNCE_MS = 350;

export function QuickCreateCard({ eventId, onCreated, onChanged }: QuickCreateCardProps) {
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [allowanceTouched, setAllowanceTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [preview, setPreview] = useState<QuickInvitePreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([]);
  const [createdCard, setCreatedCard] = useState<SearchResultCard | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [confirmDifferentPerson, setConfirmDifferentPerson] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);
  const suggestion = suggestAllowance(name);

  useEffect(() => {
    if (!allowanceTouched) setPartySize(suggestion.partySize);
  }, [suggestion.partySize, allowanceTouched]);

  useEffect(() => {
    if (!eventId || name.trim().length < 2) {
      setPreview(null);
      setDuplicates([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/invitations/quick/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, name, partySize, phone, email }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (res.ok) {
          setPreview(json.data as QuickInvitePreview);
          setDuplicates((json.data as QuickInvitePreview).duplicates);
          setConfirmDifferentPerson(false);
        }
      } catch {
        // Aborted / failed preview must not interrupt typing.
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [eventId, name, partySize, phone, email]);

  const reset = useCallback(() => {
    setName("");
    setPartySize(1);
    setAllowanceTouched(false);
    setPhone("");
    setEmail("");
    setPreview(null);
    setPreviewOpen(false);
    setDuplicates([]);
    setConfirmDifferentPerson(false);
    nameRef.current?.focus();
  }, []);

  async function submit(acknowledgeDuplicates: boolean) {
    if (!eventId) return;
    if (duplicates.length > 0 && !acknowledgeDuplicates) {
      setError(
        "This name is already on the list. Adjust the name if this is someone else, or tick the confirmation below to create a separate invitation."
      );
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/invitations/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name,
          partySize,
          phone: phone.trim() || null,
          email: email.trim() || null,
          acknowledgeDuplicates,
        }),
      });
      const json = await res.json();

      if (res.status === 409) {
        setDuplicates(json.duplicates ?? []);
        setConfirmDifferentPerson(false);
        setError(
          json.error ??
            "This guest may already be on the list. Adjust the name, or confirm they are a different person."
        );
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Could not create the invitation.");
        return;
      }

      const card = json.data.card as SearchResultCard | undefined;
      if (card) {
        setCreatedCard(card);
        onCreated(card);
        const shareUrl = publicInviteUrl(card.inviteUrl);
        const ok = await copyText(shareUrl);
        setLinkCopied(ok);
        if (ok) setTimeout(() => setLinkCopied(false), 2500);
      }
      reset();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    Boolean(eventId) &&
    name.trim().length >= 2 &&
    !submitting &&
    (duplicates.length === 0 || confirmDifferentPerson);
  const needsAcknowledgement = duplicates.length > 0 && confirmDifferentPerson;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" /> Add Guest
        </CardTitle>
        <p className="text-xs text-slate-500">
          Creates a personalised invitation with a share link, entry pass and place card.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {createdCard && !createdCard.archivedAt && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
              <Check className="h-4 w-4" />
              {createdCard.name} is invited
              {linkCopied ? " · link copied" : ""}
            </p>
            <GuestResultCard
              card={createdCard}
              onChanged={(next) => {
                setCreatedCard(next.archivedAt ? null : next);
                onChanged(next);
              }}
            />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(needsAcknowledgement);
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label htmlFor="quick-name">Guest or invitation name *</Label>
            <Input
              id="quick-name"
              ref={nameRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setConfirmDifferentPerson(false);
              }}
              placeholder="Mr Kofi Obuah"
              autoComplete="off"
              disabled={!eventId}
              required
            />
          </div>

          <PartyAllowanceField
            value={partySize}
            onChange={(next) => {
              setAllowanceTouched(true);
              setPartySize(next);
            }}
            disabled={!eventId}
            hint={preview?.hint ?? suggestion.hint}
            needsConfirmation={
              preview ? !preview.allowanceConfirmed : !suggestion.confirmed
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="quick-phone">Phone number, optional</Label>
              <Input
                id="quick-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="024 412 3456"
                inputMode="tel"
                autoComplete="off"
                disabled={!eventId}
              />
              {preview?.normalizedPhone && (
                <p className="text-xs text-slate-500">Will be saved as {preview.normalizedPhone}</p>
              )}
              {preview?.phoneWarning && (
                <p className="text-xs text-amber-600">{preview.phoneWarning}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="quick-email">Email address, optional</Label>
              <Input
                id="quick-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kofi@example.com"
                autoComplete="off"
                disabled={!eventId}
              />
              {preview?.emailWarning && (
                <p className="text-xs text-amber-600">{preview.emailWarning}</p>
              )}
            </div>
          </div>

          {duplicates.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" /> Name already on this event
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-amber-700">
                {duplicates.slice(0, 4).map((duplicate) => (
                  <li key={`${duplicate.kind}-${duplicate.id}`}>{duplicate.message}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-800">
                If this is a different person, add a distinguishing detail to the name
                (for example &quot;Kofi Mensah (Kumasi)&quot;) — or find and edit the existing
                guest instead of minting a second invitation.
              </p>
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-amber-900">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={confirmDifferentPerson}
                  onChange={(e) => setConfirmDifferentPerson(e.target.checked)}
                />
                <span>
                  This is a different person — create a separate invitation anyway
                </span>
              </label>
            </div>
          )}

          {previewOpen && preview && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-slate-700">
                <Sparkles className="h-3.5 w-3.5" /> {preview.displayName || "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  Admits {preview.partySize} {preview.partySize === 1 ? "person" : "people"}
                </Badge>
                <Badge variant="outline">{preview.partyType.replace("_", " ").toLowerCase()}</Badge>
                <Badge variant="outline">Entry pass + place card</Badge>
              </div>
              {preview.memberNames.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Party members: {preview.memberNames.join(", ")}
                </p>
              )}
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen((open) => !open)}
              disabled={!preview}
            >
              <Eye className="h-4 w-4" /> {previewOpen ? "Hide preview" : "Preview"}
            </Button>
            <Button type="submit" disabled={!canSubmit} className="flex-1 sm:flex-none">
              {submitting
                ? "Creating…"
                : needsAcknowledgement
                  ? "Create separate invitation"
                  : "Add guest"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
