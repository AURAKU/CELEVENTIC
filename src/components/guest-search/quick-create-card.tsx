"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Mail,
  MessageCircle,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartyAllowanceField } from "./party-allowance-field";
import { suggestAllowance } from "@/lib/guest-search/party-allowance";
import type {
  DuplicateWarning,
  QuickInvitePreview,
  QuickInviteResult,
  SearchResultCard,
} from "@/lib/guest-search/types";
import { getClientAppUrl, isLocalHost, sanitizePublicUrl } from "@/lib/app-url";
import { copyText } from "@/lib/clipboard";

/** Absolute invite URL safe for copy/WhatsApp/email — never localhost on live. */
function publicInviteUrl(url: string): string {
  const base = getClientAppUrl();
  if (isLocalHost(url) && !isLocalHost(base)) return sanitizePublicUrl(url, base);
  return url;
}

/**
 * Create Personalised Invitation.
 *
 * One required field. The allowance is pre-filled from the name the moment it
 * is typed — "Mr & Mrs Obuah" arrives as two, "The Mensah Family" arrives as a
 * question — and the organiser can always overrule it.
 *
 * Preview is a real dry run against the server, not a client-side guess, so
 * the duplicate warning an organiser sees is the same check that will run when
 * they press Create.
 */

interface QuickCreateCardProps {
  eventId: string | null;
  onCreated: (card: SearchResultCard) => void;
}

const PREVIEW_DEBOUNCE_MS = 350;

export function QuickCreateCard({ eventId, onCreated }: QuickCreateCardProps) {
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [allowanceTouched, setAllowanceTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [preview, setPreview] = useState<QuickInvitePreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([]);
  const [created, setCreated] = useState<QuickInviteResult | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyHint, setCopyHint] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);

  // Local suggestion keeps the stepper responsive between server previews;
  // the server remains the authority on duplicates.
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
        }
      } catch {
        // An aborted or failed preview is not worth interrupting typing over.
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
    nameRef.current?.focus();
  }, []);

  async function submit(acknowledgeDuplicates: boolean) {
    if (!eventId) return;
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
        setError(json.error ?? "This guest may already be on the list.");
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Could not create the invitation.");
        return;
      }

      const invitation = json.data.invitation as QuickInviteResult;
      setCreated(invitation);
      if (json.data.card) onCreated(json.data.card as SearchResultCard);
      reset();
      // Hand the link over immediately — organisers create then paste into WhatsApp.
      void copyLink(publicInviteUrl(invitation.inviteUrl));
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink(url: string) {
    setCopyHint("");
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }
    // Keep the invite link visible/selectable — never block sharing on clipboard quirks.
    setCopyHint("Select the link below and copy it, or use WhatsApp / Email.");
  }

  const canSubmit = Boolean(eventId) && name.trim().length >= 2 && !submitting;
  const needsAcknowledgement = duplicates.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" /> Create Personalised Invitation
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {created && (
          <CreatedSummary
            result={created}
            copied={copied}
            copyHint={copyHint}
            onCopy={copyLink}
            onDismiss={() => {
              setCreated(null);
              setCopyHint("");
            }}
          />
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
              onChange={(e) => setName(e.target.value)}
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
              <Label htmlFor="quick-phone">Phone number — optional</Label>
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
              <Label htmlFor="quick-email">Email address — optional</Label>
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
                <AlertTriangle className="h-4 w-4" /> This may already be on the list
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-amber-700">
                {duplicates.slice(0, 4).map((duplicate) => (
                  <li key={`${duplicate.kind}-${duplicate.id}`}>{duplicate.message}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-700">
                Two guests really can share a name. Creating anyway makes a separate invitation.
              </p>
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
              <Eye className="h-4 w-4" /> {previewOpen ? "Hide preview" : "Preview Invitation"}
            </Button>
            <Button type="submit" disabled={!canSubmit} className="flex-1 sm:flex-none">
              {submitting
                ? "Creating…"
                : needsAcknowledgement
                  ? "Create anyway"
                  : "Create Invitation"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** Success state: the link, the code, and the three ways to hand it over. */
function CreatedSummary({
  result,
  copied,
  copyHint,
  onCopy,
  onDismiss,
}: {
  result: QuickInviteResult;
  copied: boolean;
  copyHint: string;
  onCopy: (url: string) => void;
  onDismiss: () => void;
}) {
  const shareUrl = publicInviteUrl(result.inviteUrl);
  const whatsAppText = `Dear ${result.name},\n\nYou are personally invited. Open your invitation:\n${shareUrl}`;
  const emailBody = `${whatsAppText}${
    result.admissionCode ? `\n\nYour admission code: ${result.admissionCode}` : ""
  }`;
  const qrHref = result.qrImageUrl.includes("localhost")
    ? `/api/qr/image?data=${encodeURIComponent(shareUrl)}&mode=pass&size=1024&download=1`
    : `${result.qrImageUrl}&download=1`;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <Check className="h-4 w-4" /> {result.name} is invited
          </p>
          <p className="mt-0.5 text-xs text-brand-700">
            Admits {result.partySize} {result.partySize === 1 ? "person" : "people"}
            {result.admissionCode ? ` · code ${result.admissionCode}` : ""}
            {copied ? " · link copied" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-brand-700 underline underline-offset-2"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-2.5 flex gap-2">
        <Input
          readOnly
          value={shareUrl}
          aria-label="Invitation link"
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.currentTarget.select()}
          className="h-9 flex-1 truncate bg-white font-mono text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => void onCopy(shareUrl)}
        >
          <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {copyHint ? <p className="mt-1.5 text-xs text-amber-700">{copyHint}</p> : null}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" asChild>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsAppText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a
            href={`mailto:?subject=${encodeURIComponent(`Your invitation — ${result.name}`)}&body=${encodeURIComponent(emailBody)}`}
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={qrHref} target="_blank" rel="noopener noreferrer">
            <Download className="h-3.5 w-3.5" /> QR
          </a>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href={result.invitePath} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" /> Open pass
          </a>
        </Button>
      </div>
    </div>
  );
}
