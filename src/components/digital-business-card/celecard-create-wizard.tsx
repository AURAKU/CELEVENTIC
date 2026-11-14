"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DigitalCardThemePicker } from "@/components/digital-business-card/digital-card-theme-picker";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { DigitalCardCompanyLogoField } from "@/components/digital-business-card/digital-card-company-logo-field";
import { SMARTCARD_PLANS } from "@/lib/digital-business-card/plans";
import { persistCompanyLogoUrl } from "@/lib/digital-business-card/socials";
import { resolveDigitalCardTheme, type DigitalCardThemeId } from "@/lib/digital-business-card/themes";
import { demoCardPreviewExplorePath, demoCardPreviewQrSrc } from "@/lib/digital-business-card/demo-card";

type UserHit = { id: string; name: string; email: string | null; phone: string | null };

const STEPS = [
  "Customer",
  "Profile",
  "Design",
  "Access",
  "Activation",
  "Share",
  "Deliver",
];

export function CeleCardCreateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserHit[]>([]);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [unclaimedEmail, setUnclaimedEmail] = useState("");
  const [unclaimedPhone, setUnclaimedPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [booking, setBooking] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [momo, setMomo] = useState("");
  const [paypal, setPaypal] = useState("");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [themeId, setThemeId] = useState<DigitalCardThemeId>("elegant-frost");
  const [connectBackEnabled, setConnectBackEnabled] = useState(true);
  const [activationKind, setActivationKind] = useState<"draft" | "payment" | "complimentary" | "promotional" | "manual">(
    "draft"
  );
  const [planId, setPlanId] = useState("monthly");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{
    publicProfileUrl?: string;
    canonicalUrl?: string;
    qrImageSrc?: string;
    cardImageSrc?: string;
    claimUrl?: string | null;
    id?: string;
  } | null>(null);

  async function searchUsers() {
    if (query.trim().length < 2) return;
    const res = await fetch(`/api/admin/celecard/users?search=${encodeURIComponent(query)}`);
    const payload = await res.json().catch(() => ({}));
    setUsers(payload.data?.items ?? []);
  }

  const activation = useMemo(() => {
    if (activationKind === "draft" || activationKind === "payment") return { kind: activationKind };
    return { kind: activationKind, planId, reason };
  }, [activationKind, planId, reason]);

  async function submit() {
    setBusy(true);
    setError(null);
    const savedLogo = persistCompanyLogoUrl(companyLogoUrl);
    const res = await fetch("/api/admin/celecard/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerUserId,
        unclaimedEmail: ownerUserId ? null : unclaimedEmail,
        unclaimedPhone: ownerUserId ? null : unclaimedPhone,
        displayName,
        title,
        company,
        bio,
        email: email || unclaimedEmail || null,
        phone: phone || unclaimedPhone || null,
        website,
        socials: {
          linkedin,
          instagram,
          website: website || booking,
          momo,
          paypal,
          ...(savedLogo ? { companyLogoUrl: savedLogo } : {}),
        },
        avatarUrl: avatarUrl || null,
        themeId,
        connectBackEnabled,
        isPublished: activationKind !== "draft",
        activation,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(payload.error || "Could not create this CeleYou.");
      return;
    }
    setResult({
      ...payload.data.card,
      claimUrl: payload.data.claimUrl,
    });
    setStep(5);
  }

  async function sendInvite() {
    if (!result?.id) return;
    setBusy(true);
    const res = await fetch(`/api/admin/celecard/cards/${result.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_invitation" }),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(payload.error || "Invitation was not sent.");
      return;
    }
    if (payload.data?.claimUrl) setResult((current) => ({ ...current, claimUrl: payload.data.claimUrl }));
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 ${index === step ? "bg-[#0B8A83] text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {step === 0 ? (
        <section className="space-y-4 rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Select customer</h2>
          <p className="text-sm text-slate-600">
            Search a registered account, or start an unclaimed card. This does not create a password or sign anyone in.
          </p>
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" />
            <Button type="button" onClick={searchUsers}>
              Search
            </Button>
          </div>
          <ul className="space-y-2">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOwnerUserId(user.id);
                    setDisplayName(user.name);
                    setEmail(user.email || "");
                    setPhone(user.phone || "");
                    setUnclaimedEmail("");
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left ${ownerUserId === user.id ? "border-[#0B8A83] bg-[#0B8A83]/5" : "border-slate-200"}`}
                >
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </button>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Invitation email for a new customer</Label>
              <Input
                value={unclaimedEmail}
                onChange={(e) => {
                  setUnclaimedEmail(e.target.value);
                  setOwnerUserId(null);
                }}
                placeholder="customer@email.com"
              />
            </div>
            <div>
              <Label>Invitation phone</Label>
              <Input value={unclaimedPhone} onChange={(e) => setUnclaimedPhone(e.target.value)} />
            </div>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Cardholder information</h2>
          <div className="sm:col-span-2">
            <Label>Full name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <Label>Professional title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Company</Label>
            <div className="mt-1.5 flex items-start gap-3">
              <DigitalCardCompanyLogoField
                value={companyLogoUrl}
                onChange={setCompanyLogoUrl}
                company={company}
                theme={resolveDigitalCardTheme(themeId)}
                compact
              />
              <div className="min-w-0 flex-1 space-y-1">
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Upload a square mark. It sits on the profile picture on the card.
                </p>
              </div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Biography</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div>
            <Label>LinkedIn</Label>
            <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>
          <div>
            <Label>Booking link</Label>
            <Input value={booking} onChange={(e) => setBooking(e.target.value)} />
          </div>
          <div>
            <Label>Profile photograph URL</Label>
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
          <div>
            <Label>MoMo payment</Label>
            <Input value={momo} onChange={(e) => setMomo(e.target.value)} />
          </div>
          <div>
            <Label>PayPal</Label>
            <Input value={paypal} onChange={(e) => setPaypal(e.target.value)} />
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 font-semibold">Select card design</h2>
          <DigitalCardThemePicker value={themeId} onChange={setThemeId} />
          <div className="mt-4 flex gap-2">
            <Button type="button" variant={viewport === "desktop" ? "default" : "outline"} onClick={() => setViewport("desktop")}>
              Desktop
            </Button>
            <Button type="button" variant={viewport === "mobile" ? "default" : "outline"} onClick={() => setViewport("mobile")}>
              Mobile
            </Button>
          </div>
          <div className={`mt-4 ${viewport === "mobile" ? "mx-auto w-[280px]" : "w-full max-w-xl"}`}>
            <DigitalCardFace
              themeId={themeId}
              displayName={displayName || "Cardholder"}
              title={title}
              company={company}
              avatarUrl={avatarUrl || null}
              companyLogo
              companyLogoUrl={companyLogoUrl}
              qrSrc={demoCardPreviewQrSrc()}
              qrHref={demoCardPreviewExplorePath()}
              compact={viewport === "mobile"}
            />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            This preview uses the existing CeleYou renderer. Save as draft if the card should stay unpublished.
          </p>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Access permissions</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={connectBackEnabled}
              onChange={(e) => setConnectBackEnabled(e.target.checked)}
            />
            Allow visitors to send connection requests
          </label>
          <p className="text-sm text-slate-600">
            Public profile fields stay on the card. Private access codes are not shown here and cannot be retrieved by ordinary administrators.
          </p>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Assign activation</h2>
          {[
            ["draft", "Leave as draft"],
            ["payment", "Activate through verified payment"],
            ["complimentary", "Assign complimentary activation"],
            ["promotional", "Assign promotional entitlement"],
            ["manual", "Apply a manual subscription override"],
          ].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="activation"
                checked={activationKind === value}
                onChange={() => setActivationKind(value as typeof activationKind)}
              />
              {label}
            </label>
          ))}
          {activationKind !== "draft" && activationKind !== "payment" ? (
            <>
              <Label>Plan</Label>
              <select className="w-full rounded-md border px-3 py-2" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {SMARTCARD_PLANS.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.label} · GH₵{plan.priceGhs}
                  </option>
                ))}
              </select>
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required for entitlement adjustments" />
            </>
          ) : null}
        </section>
      ) : null}

      {step === 5 || step === 6 ? (
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">{step === 5 ? "Sharing assets" : "Deliver to customer"}</h2>
          {!result ? (
            <p className="text-sm text-slate-600">Create the card to generate the permanent URL, QR code, and invitation.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <p>
                Public URL: <a className="text-[#0B8A83] underline" href={result.publicProfileUrl}>{result.publicProfileUrl}</a>
              </p>
              <p>
                Canonical QR destination: <span className="font-mono text-xs">{result.canonicalUrl}</span>
              </p>
              {result.claimUrl ? (
                <p>
                  Claim link (shown once): <span className="break-all font-mono text-xs">{result.claimUrl}</span>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => result.publicProfileUrl && navigator.clipboard.writeText(result.publicProfileUrl)}>
                  Copy card URL
                </Button>
                {result.qrImageSrc ? (
                  <Button asChild variant="outline">
                    <a href={result.qrImageSrc}>Download QR</a>
                  </Button>
                ) : null}
                {result.cardImageSrc ? (
                  <Button asChild variant="outline">
                    <a href={result.cardImageSrc}>Download card image</a>
                  </Button>
                ) : null}
                <Button type="button" onClick={sendInvite} disabled={busy}>
                  Send invitation
                </Button>
              </div>
              <p className="text-xs text-slate-500">Private access codes and payment details are never included in these messages.</p>
            </div>
          )}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        ) : null}
        {step < 4 ? (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !ownerUserId && !unclaimedEmail.includes("@")) || (step === 1 && displayName.trim().length < 2)}
          >
            Continue
          </Button>
        ) : null}
        {step === 4 ? (
          <Button type="button" onClick={submit} disabled={busy || !displayName}>
            {busy ? "Creating…" : "Create CeleYou"}
          </Button>
        ) : null}
        {result ? (
          <Button type="button" onClick={() => router.push(`/admin/celecard/${result.id}`)}>
            Open card detail
          </Button>
        ) : null}
      </div>
    </div>
  );
}
