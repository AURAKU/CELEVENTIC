"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Claim form for an open general-pass registration. */
export function JoinForm({
  token,
  requireName,
  requireContact,
}: {
  token: string;
  requireName: boolean;
  requireContact: boolean;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ inviteUrl: string; code: string | null; displayName: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch(`/api/join/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || undefined, contact: contact.trim() || undefined }),
    });
    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not issue your pass. Please try again.");
      return;
    }
    setIssued(data.data);
  }

  if (issued) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <Ticket className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <p className="text-lg font-semibold">Your pass is ready, {issued.displayName}</p>
          {issued.code && (
            <p className="mt-1 text-sm text-slate-500">
              Admission code <span className="font-mono font-semibold">{issued.code}</span>
            </p>
          )}
        </div>
        <Button asChild className="w-full">
          <a href={issued.inviteUrl}>
            Open my invitation <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
        <p className="text-xs text-slate-400">
          Save this link — it carries your QR code for the gate.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="join-name">Your name {requireName ? "" : "(optional)"}</Label>
        <Input
          id="join-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required={requireName}
          autoComplete="name"
          placeholder="Ama Serwaa"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="join-contact">
          Phone or email {requireContact ? "" : "(optional)"}
        </Label>
        <Input
          id="join-contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required={requireContact}
          autoComplete="tel"
          placeholder="0244 123 456"
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
        Get my entry pass
      </Button>
    </form>
  );
}
