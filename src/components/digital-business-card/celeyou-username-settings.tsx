"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CeleYouUsernameField } from "@/components/digital-business-card/celeyou-username-field";
import { getCeleYouShareOrigin } from "@/lib/app-url";

type Identity = {
  displayName: string;
  username: string | null;
  publicPath: string | null;
  primaryCardId: string | null;
  needsUsername: boolean;
  cards: Array<{ id: string; slug: string; displayName: string; company: string | null }>;
};

export function CeleYouUsernameSettings({ displayName }: { displayName: string }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [username, setUsername] = useState("");
  const [primaryCardId, setPrimaryCardId] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const origin = getCeleYouShareOrigin();

  useEffect(() => {
    void fetch("/api/digital-business-cards/username")
      .then(async (res) => (res.ok ? ((await res.json()) as { data?: Identity }).data : null))
      .then((data) => {
        if (!data) return;
        setIdentity(data);
        setUsername(data.username ?? "");
        setPrimaryCardId(data.primaryCardId ?? data.cards[0]?.id ?? "");
      })
      .catch(() => undefined);
  }, []);

  async function save(confirm = false) {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/digital-business-cards/username", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        confirm,
        primaryCardId: primaryCardId || undefined,
        displayName,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      needsConfirm?: boolean;
      data?: Identity;
    };
    setSaving(false);
    if (res.status === 409 && json.needsConfirm) {
      setConfirming(true);
      setError(json.error ?? "Confirm this username change.");
      return;
    }
    if (!res.ok) {
      setError(json.error ?? "Could not save that username.");
      return;
    }
    setConfirming(false);
    if (json.data) {
      setIdentity(json.data);
      setUsername(json.data.username ?? username);
    }
    setMessage("Username saved. QR and NFC links stay the same.");
  }

  async function savePrimary() {
    if (!primaryCardId) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/digital-business-cards/username", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryCardId }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; data?: Identity };
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Could not set the primary card.");
      return;
    }
    if (json.data) setIdentity(json.data);
    setMessage("Primary public card updated.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CeleYou username</CardTitle>
        <CardDescription>
          Your display name can match other people. Your username is unique. Changing it moves
          celeventic.com/u/yourname. Permanent card links, QR codes, and NFC tags keep working.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CeleYouUsernameField
          value={username}
          onChange={(next) => {
            setUsername(next);
            setConfirming(false);
          }}
          displayName={displayName}
          currentUsername={identity?.username}
          publicOrigin={origin}
        />
        {identity?.cards.length ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="celeyou-primary-card">
              Primary public card
            </label>
            <select
              id="celeyou-primary-card"
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              value={primaryCardId}
              onChange={(event) => setPrimaryCardId(event.target.value)}
            >
              {identity.cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.displayName}
                  {card.company ? ` · ${card.company}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              /u/{identity.username || "yourname"} opens this card. Other cards stay independently shareable.
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="bg-[#0B8A83]"
            disabled={saving || username.trim().length < 3}
            onClick={() => void save(confirming)}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : confirming ? "Confirm new username" : "Save username"}
          </Button>
          {identity?.cards.length ? (
            <Button type="button" variant="outline" disabled={saving || !primaryCardId} onClick={() => void savePrimary()}>
              Save primary card
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
