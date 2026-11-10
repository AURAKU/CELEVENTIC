"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DIGITAL_CARD_THEMES } from "@/lib/digital-business-card/themes";

type Detail = {
  card: {
    id: string;
    cardholderName: string;
    email: string | null;
    slug: string;
    publicProfileUrl: string;
    canonicalUrl: string;
    qrImageSrc: string;
    cardImageSrc: string;
    subscriptionStatus: string;
    activationStatus: string;
    publicationStatus: string;
    expirationDate: string | null;
    lifecycle: string;
    administrativeRestrictions: string[];
    unclaimed: boolean;
  };
  owner: { id: string | null; name: string; email: string | null; unclaimed?: boolean } | null;
  designs: { id: string; label: string; themeId: string; status: string; createdAt: string }[];
  entitlements: {
    id: string;
    kind: string;
    planId: string | null;
    months: number | null;
    startsAt: string;
    expiresAt: string;
    reason: string;
    grantedByUserId: string;
    approvalRef: string | null;
    createdAt: string;
  }[];
  invites: { id: string; email: string; expiresAt: string; consumedAt: string | null }[];
  connections: { id: string; visitorName: string; status: string; createdAt: string }[];
  activity: { id: string; kind: string; createdAt: string }[];
  privacy: { accessCodeCount: number; accessGrantCount: number; accessRequestCount: number; connectionCount: number };
  sharing: { publicUrl: string; canonicalUrl: string; qrImageSrc: string; cardImageSrc: string };
  profile: {
    displayName: string;
    title: string | null;
    company: string | null;
    bio: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    themeId: string;
  };
};

const TABS = ["Overview", "Card Designs", "Subscription", "Sharing", "Connections", "Activity", "Support"] as const;

export function CeleCardCardDetail({ cardId }: { cardId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [data, setData] = useState<Detail | null>(null);
  const [reason, setReason] = useState("");
  const [planId, setPlanId] = useState("monthly");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({
    displayName: "",
    title: "",
    company: "",
    bio: "",
    email: "",
    phone: "",
    website: "",
    themeId: "elegant-frost",
  });
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/celecard/cards/${cardId}`);
    const payload = await res.json().catch(() => ({}));
    if (payload.success) {
      const next = payload.data as Detail;
      setData(next);
      if (next.profile) {
        setProfile({
          displayName: next.profile.displayName || "",
          title: next.profile.title || "",
          company: next.profile.company || "",
          bio: next.profile.bio || "",
          email: next.profile.email || "",
          phone: next.profile.phone || "",
          website: next.profile.website || "",
          themeId: next.profile.themeId || "elegant-frost",
        });
      }
    } else setError(payload.error || "Could not load this card.");
  }, [cardId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: string, extra?: Record<string, unknown>) {
    if ((action === "deactivate" || action === "suspend") && !window.confirm("This changes public availability. Continue?")) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/celecard/cards/${cardId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason, planId, ...extra }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(payload.error || "Action failed");
      return;
    }
    await load();
  }

  async function saveProfile() {
    setBusy(true);
    setError(null);
    setSaved(null);
    const res = await fetch(`/api/admin/celecard/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: profile.displayName.trim(),
        title: profile.title.trim() || null,
        company: profile.company.trim() || null,
        bio: profile.bio.trim() || null,
        email: profile.email.trim() || null,
        phone: profile.phone.trim() || null,
        website: profile.website.trim() || null,
        themeId: profile.themeId,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(payload.error || "Could not save this card.");
      return;
    }
    setSaved("Card profile saved. Public URL and QR destination are unchanged.");
    await load();
  }

  if (!data) return <p className="text-sm text-slate-500">{error || "Loading card…"}</p>;
  const card = data.card;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B8A83]">CeleYou</p>
        <h1 className="font-display text-3xl font-bold text-slate-900">{card.cardholderName}</h1>
        <p className="text-sm text-slate-600">{card.email} · {card.slug}</p>
      </div>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-3 py-1 text-sm ${tab === item ? "bg-[#0B8A83] text-white" : "bg-slate-100"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <section className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2">
          <p>Lifecycle: {card.lifecycle}</p>
          <p>Activation: {card.activationStatus}</p>
          <p>Publication: {card.publicationStatus}</p>
          <p>Subscription: {card.subscriptionStatus}</p>
          <p>Expiry: {card.expirationDate ? new Date(card.expirationDate).toLocaleDateString() : "None"}</p>
          <p>Restrictions: {card.administrativeRestrictions.join(", ") || "None"}</p>
          <p>Owner: {data.owner?.name} {data.owner?.unclaimed ? "(unclaimed)" : ""}</p>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button asChild variant="outline"><a href={card.publicProfileUrl} target="_blank" rel="noreferrer">Preview Card</a></Button>
            <Button disabled={busy} onClick={() => act("activate")}>Activate</Button>
            <Button disabled={busy} variant="outline" onClick={() => act("deactivate")}>Deactivate</Button>
            <Button disabled={busy} variant="outline" onClick={() => act("reactivate")}>Reactivate</Button>
            <Button disabled={busy} variant="outline" onClick={() => act("suspend")}>Suspend</Button>
            <Button disabled={busy} variant="outline" onClick={() => act("unsuspend")}>Unsuspend</Button>
          </div>
          <div className="sm:col-span-2 space-y-3 border-t pt-4">
            <p className="text-sm font-semibold">Edit cardholder profile</p>
            <p className="text-xs text-slate-500">
              Saves through Command Center. Changing the look does not change the public URL or QR destination.
            </p>
            {saved ? <p className="text-sm text-[#0B8A83]">{saved}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={profile.displayName} onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))} placeholder="Display name" />
              <Input value={profile.title} onChange={(e) => setProfile((p) => ({ ...p, title: e.target.value }))} placeholder="Title" />
              <Input value={profile.company} onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))} placeholder="Company" />
              <Input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
              <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
              <Input value={profile.website} onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))} placeholder="Website" />
              <select
                className="rounded-md border px-3 py-2 sm:col-span-2"
                value={profile.themeId}
                onChange={(e) => setProfile((p) => ({ ...p, themeId: e.target.value }))}
              >
                {DIGITAL_CARD_THEMES.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
              <Textarea
                className="sm:col-span-2"
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                placeholder="About"
              />
            </div>
            <Button disabled={busy || profile.displayName.trim().length < 2} onClick={() => void saveProfile()}>
              Save profile
            </Button>
          </div>
        </section>
      ) : null}

      {tab === "Card Designs" ? (
        <section className="rounded-2xl border bg-white p-5">
          <Button disabled={busy} onClick={() => act("duplicate_design")}>Duplicate Design</Button>
          <ul className="mt-3 space-y-2 text-sm">
            {data.designs.map((row) => (
              <li key={row.id}>{row.label} · {row.themeId} · {row.status}</li>
            ))}
            {!data.designs.length ? <li>No saved designs yet.</li> : null}
          </ul>
        </section>
      ) : null}

      {tab === "Subscription" ? (
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <p className="text-sm text-slate-600">Payment history is not rewritten here. Entitlements are recorded on a separate ledger.</p>
          <select className="rounded-md border px-3 py-2" value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="quarter">3 months</option>
            <option value="half">6 months</option>
            <option value="yearly">Yearly</option>
          </select>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for entitlement or subscription change" />
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => act("extend")}>Extend Subscription</Button>
            <Button disabled={busy} variant="outline" onClick={() => act("change_plan")}>Change Plan</Button>
            <Button disabled={busy} variant="outline" onClick={() => act("complimentary")}>Complimentary</Button>
            <Button disabled={busy} variant="outline" onClick={() => act("promotional")}>Promotional</Button>
            <Button disabled={busy} variant="outline" onClick={() => act("remind_renewal")}>Send renewal reminder</Button>
          </div>
          <ul className="space-y-2 text-sm">
            {data.entitlements.map((row) => (
              <li key={row.id}>
                {row.kind} · {row.planId} · {row.months} months · {row.reason}
              </li>
            ))}
            {!data.entitlements.length ? <li>No manual entitlements.</li> : null}
          </ul>
        </section>
      ) : null}

      {tab === "Sharing" ? (
        <section className="space-y-2 rounded-2xl border bg-white p-5 text-sm">
          <p>Public URL: {data.sharing.publicUrl}</p>
          <p>Canonical URL: {data.sharing.canonicalUrl}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(data.sharing.publicUrl)}>
              Copy Public URL
            </Button>
            <Button asChild variant="outline"><a href={data.sharing.qrImageSrc}>Generate QR</a></Button>
            <Button asChild variant="outline"><a href={data.sharing.cardImageSrc}>Shareable card image</a></Button>
          </div>
        </section>
      ) : null}

      {tab === "Connections" ? (
        <section className="rounded-2xl border bg-white p-5 text-sm">
          <p>Pending and recent requests: {data.privacy.connectionCount}</p>
          <ul className="mt-3 space-y-2">
            {data.connections.map((row) => (
              <li key={row.id}>{row.visitorName} · {row.status}</li>
            ))}
            {!data.connections.length ? <li>No connection requests.</li> : null}
          </ul>
        </section>
      ) : null}

      {tab === "Activity" ? (
        <section className="rounded-2xl border bg-white p-5 text-sm">
          <ul className="space-y-2">
            {data.activity.map((row) => (
              <li key={row.id}>{row.kind} · {new Date(row.createdAt).toLocaleString()}</li>
            ))}
            {!data.activity.length ? <li>No activity yet.</li> : null}
          </ul>
        </section>
      ) : null}

      {tab === "Support" ? (
        <section className="space-y-3 rounded-2xl border bg-white p-5 text-sm">
          <p>Access codes on file: {data.privacy.accessCodeCount} (values are not displayed).</p>
          <p>Access grants: {data.privacy.accessGrantCount}. Requests: {data.privacy.accessRequestCount}.</p>
          <p>Open invitations: {data.invites.filter((row) => !row.consumedAt).length}</p>
          <Button disabled={busy} onClick={() => act("send_invitation")}>Send Invitation</Button>
        </section>
      ) : null}
    </div>
  );
}
