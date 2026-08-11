"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  KeyRound,
  Loader2,
  Palette,
  Plug,
  Shield,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { SettingsTabs, type SettingsTab } from "@/components/settings/settings-tabs";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { useEventContext } from "@/hooks/use-event-context";
import { isAdminRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

const VALID_TABS: SettingsTab[] = [
  "account",
  "organization",
  "team",
  "permissions",
  "branding",
  "integrations",
  "privacy",
  "security",
  "billing",
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    "Full platform access",
    "Admin panel & integrations",
    "All events and packages",
    "Team & billing oversight",
  ],
  ADMIN: ["Admin panel", "All events", "Team management", "Integrations"],
  ORGANIZER: [
    "Create and manage events",
    "Invitations, guests & seating",
    "Memory vault & gift campaigns",
    "Event wallet & QR admission",
  ],
  AGENCY: ["Multi-client workspaces", "Team collaboration", "Event production tools"],
  VENDOR: ["Vendor portal", "Bookings & portfolio", "Earnings"],
  STAFF: ["Assigned events", "QR admission", "Guest check-in"],
  GUEST: ["RSVP", "Upload memories"],
};

function formatRole(role?: string | null) {
  if (!role) return "Member";
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function displayOrUnset(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Not set";
}

function formatWhen(value?: string | Date | null) {
  if (!value) return "Never";
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

const SALES_MAILTO =
  "mailto:support@celeventic.com?subject=Celeventic%20plan%20upgrade&body=Hi%20Celeventic%20team%2C%0A%0AI%27d%20like%20to%20upgrade%20my%20organization%20plan.%0A%0A";

function collaboratorInviteHref(eventId: string) {
  return eventId
    ? `/dashboard/events/${eventId}/workspace?tab=team`
    : "/dashboard/events";
}

function SectionMessage({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: string;
}) {
  return (
    <p
      className={cn(
        "text-sm rounded-xl px-3 py-2",
        tone === "success" && "bg-emerald-50 text-emerald-800",
        tone === "error" && "bg-red-50 text-red-700",
        tone === "info" && "bg-slate-50 text-slate-600"
      )}
      role="status"
    >
      {children}
    </p>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof Wallet;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 transition hover:border-[#0B8A83]/35 hover:bg-[#0B8A83]/5"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-[#0B8A83]/15 group-hover:text-[#0B8A83]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
          {title}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
        </span>
        <span className="block text-xs text-slate-500 mt-0.5">{description}</span>
      </span>
    </Link>
  );
}

function SettingsHubContent() {
  const searchParams = useSearchParams();
  const upgradeParam = searchParams.get("upgrade");
  const rawTab = searchParams.get("tab") ?? (upgradeParam ? "billing" : "account");
  const tab: SettingsTab = VALID_TABS.includes(rawTab as SettingsTab)
    ? (rawTab as SettingsTab)
    : "account";

  return (
    <DashboardPageShell
      title="Settings"
      description="Manage your Celeventic account, workspace, security, and the services that power invitations, guests, and the gate."
      className="max-w-5xl"
    >
      <SettingsTabs active={tab} />
      <div className="mt-6 space-y-6">
        {tab === "account" && <AccountSection />}
        {tab === "organization" && <OrganizationSection />}
        {tab === "team" && <TeamSection />}
        {tab === "permissions" && <PermissionsSection />}
        {tab === "branding" && <BrandingSection />}
        {tab === "integrations" && <IntegrationsSection />}
        {tab === "privacy" && <PrivacySection />}
        {tab === "security" && <SecuritySection />}
        {tab === "billing" && <BillingSection upgradeHighlight={upgradeParam} />}
      </div>
    </DashboardPageShell>
  );
}

function AccountSection() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/account")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success || !d.data?.user) return;
        const user = d.data.user;
        setName(user.name ?? "");
        setPhone(user.phone ?? "");
        setEmail(user.email);
        setRole(user.role);
        setStatus(user.status);
        setLastLoginAt(user.lastLoginAt);
        setTwoFactorEnabled(Boolean(user.twoFactorEnabled));
        setOrgName(d.data.organizationName);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: d.error ?? "Could not update profile" });
        return;
      }
      setMessage({ tone: "success", text: "Profile saved. Changes apply across your dashboard." });
      await update?.({ name: d.data?.name });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-br from-[#0B8A83]/8 via-white to-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserRound className="h-5 w-5 text-[#0B8A83]" />
                Account profile
              </CardTitle>
              <CardDescription className="mt-1">
                Your identity on invitations, team invites, and organizer messages.
              </CardDescription>
            </div>
            <Badge className="bg-[#0B8A83]/12 text-[#0B8A83] hover:bg-[#0B8A83]/12">
              {formatRole(role ?? session?.user?.role)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Email</p>
              <p className="mt-1 text-sm font-medium text-slate-900 break-all">
                {displayOrUnset(email ?? session?.user?.email)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Workspace</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {displayOrUnset(orgName)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Status</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{status ?? "ACTIVE"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Last login</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatWhen(lastLoginAt)}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Display name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-phone">Phone</Label>
              <Input
                id="settings-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233…"
                autoComplete="tel"
              />
              <p className="text-xs text-slate-500">
                Used for login and host contact on invitations when provided.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
              2FA {twoFactorEnabled ? "on" : "off"}
            </Badge>
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[#0B8A83]">
              <Link href="/dashboard/settings?tab=security">Manage security</Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={saving || name.trim().length < 2} className="bg-[#0B8A83]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save profile"}
            </Button>
            <Button asChild variant="outline" size="default">
              <Link href="/dashboard/settings?tab=privacy">Privacy Center</Link>
            </Button>
          </div>
          {message && <SectionMessage tone={message.tone}>{message.text}</SectionMessage>}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        <QuickLink
          href="/dashboard/messages"
          title="Messages"
          description="Threads with vendors, organizers, and leads"
          icon={Users}
        />
        <QuickLink
          href="/dashboard/settings?tab=security"
          title="Security"
          description="Two-factor authentication and sessions"
          icon={Shield}
        />
      </div>
    </div>
  );
}

function OrganizationSection() {
  const [org, setOrg] = useState<{
    name: string;
    country: string;
    plan: string;
    slug: string;
    logoUrl?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/organization")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrg(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: org.name,
          country: org.country,
          logoUrl: org.logoUrl || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage({ tone: "error", text: d.error ?? "Update failed" });
        return;
      }
      setOrg(d.data);
      setMessage({ tone: "success", text: "Organization updated." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;
  if (!org) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-slate-500">
          Could not load organization.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#0B8A83]" />
          Organization workspace
        </CardTitle>
        <CardDescription>
          Shared identity for your events, collaborators, and billing plan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Organization name</Label>
              <Input
                value={org.name}
                onChange={(e) => setOrg({ ...org, name: e.target.value })}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country code</Label>
              <Input
                value={org.country}
                onChange={(e) => setOrg({ ...org, country: e.target.value.toUpperCase() })}
                maxLength={2}
                placeholder="GH"
              />
              <p className="text-xs text-slate-500">Used for currency defaults and regional tooling.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Logo URL (optional)</Label>
            <Input
              value={org.logoUrl ?? ""}
              onChange={(e) => setOrg({ ...org, logoUrl: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Plan</span>
            <Badge variant="secondary">{org.plan}</Badge>
            <span className="text-slate-400">· slug {org.slug}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving} className="bg-[#0B8A83]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save organization"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings?tab=billing">View billing</Link>
            </Button>
          </div>
          {message && <SectionMessage tone={message.tone}>{message.text}</SectionMessage>}
        </form>
      </CardContent>
    </Card>
  );
}

function TeamSection() {
  const { eventId } = useEventContext();
  const inviteHref = collaboratorInviteHref(eventId);
  const [members, setMembers] = useState<
    Array<{
      id: string;
      name: string;
      email: string | null;
      role: string;
      status: string;
      lastLoginAt?: string | null;
    }>
  >([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/team")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMembers(d.data.members ?? []);
          setCanManage(Boolean(d.data.canManage));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#0B8A83]" />
              Team members
            </CardTitle>
            <CardDescription>
              People in your organization who can collaborate on events and check-ins.
            </CardDescription>
          </div>
          {canManage && (
            <Button asChild size="sm" className="bg-[#0B8A83] shrink-0">
              <Link href={inviteHref}>Invite collaborators</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {!eventId && (
            <SectionMessage tone="info">
              Pick an event from Events, then invite collaborators from that event&apos;s workspace
              team tab.
            </SectionMessage>
          )}
          {members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
              <p className="text-sm text-slate-600">No teammates in this workspace yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Invite collaborators from an event workspace so they can help plan and run
                celebrations.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={inviteHref}>
                    {eventId ? "Open event team workspace" : "Choose an event"}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/dashboard/invitations/workspace">Pending collaboration invites</Link>
                </Button>
              </div>
            </div>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-500 truncate">{displayOrUnset(m.email)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Last login {formatWhen(m.lastLoginAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{formatRole(m.role)}</Badge>
                  <Badge variant={m.status === "ACTIVE" ? "secondary" : "destructive"}>
                    {m.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-xs text-slate-500">
          Event-level staff for the gate still live under each event&apos;s QR Admission and seating
          tools — organization team is your shared workspace roster.
        </p>
        <Link
          href="/dashboard/invitations/workspace"
          className="text-xs font-medium text-[#0B8A83] hover:underline shrink-0"
        >
          Pending collaboration invites
        </Link>
      </div>
    </div>
  );
}

function PermissionsSection() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "ORGANIZER";
  const perms = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.ORGANIZER;

  return (
    <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[#0B8A83]" />
          Role permissions
        </CardTitle>
        <CardDescription>
          Capabilities for <strong>{formatRole(role)}</strong> on Celeventic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2.5">
          {perms.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#0B8A83] shrink-0" />
              {p}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {isAdminRole(role as UserRole) && (
            <Button asChild size="sm" className="bg-[#0B8A83]">
              <Link href="/admin">Open Admin Panel</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/getting-started">Getting started guide</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandingSection() {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/account").then((r) => r.json()),
      fetch("/api/settings/organization").then((r) => r.json()),
    ])
      .then(([account, org]) => {
        if (account.success) {
          setAvatarUrl(account.data.user?.avatarUrl ?? "");
          setOrgName(account.data.organizationName);
        }
        if (org.success) {
          setLogoUrl(org.data.logoUrl ?? "");
          setOrgName((prev) => prev ?? org.data.name);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const [accountRes, orgRes] = await Promise.all([
        fetch("/api/settings/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: avatarUrl || null }),
        }),
        fetch("/api/settings/organization", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logoUrl: logoUrl || null }),
        }),
      ]);
      const accountData = await accountRes.json().catch(() => ({}));
      const orgData = await orgRes.json().catch(() => ({}));
      if (!accountRes.ok || !orgRes.ok) {
        setMessage({
          tone: "error",
          text: accountData.error ?? orgData.error ?? "Could not save branding",
        });
        return;
      }
      setMessage({ tone: "success", text: "Branding updated." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-[#0B8A83]" />
            Branding
          </CardTitle>
          <CardDescription>
            Profile photo and organization logo. Event invitation design lives in Design Studio and
            per-event QR branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {orgName && (
            <p className="text-sm text-slate-600">
              Organization: <strong>{orgName}</strong>
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Avatar URL</Label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
              />
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-slate-100 border border-dashed border-slate-200" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Organization logo URL</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://…"
              />
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-16 w-auto max-w-[140px] object-contain rounded-lg border border-slate-200 bg-white p-1"
                />
              ) : (
                <div className="h-16 w-28 rounded-lg bg-slate-100 border border-dashed border-slate-200" />
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={saving} className="bg-[#0B8A83]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save branding"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/design-studio">Design Studio</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/qr-admission">QR branding</Link>
            </Button>
          </div>
          {message && <SectionMessage tone={message.tone}>{message.text}</SectionMessage>}
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsSection() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role && isAdminRole(session.user.role as UserRole);
  const [items, setItems] = useState<
    Array<{
      provider: string;
      label: string;
      category: string;
      description: string;
      configured: boolean;
      docsUrl?: string;
      isCustom?: boolean;
    }>
  >([]);
  const [manageUrl, setManageUrl] = useState("/admin/integrations");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setItems(d.data.integrations ?? d.data);
          if (d.data.manageUrl) setManageUrl(d.data.manageUrl);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const connected = useMemo(() => items.filter((i) => i.configured), [items]);
  const pending = useMemo(() => items.filter((i) => !i.configured), [items]);

  if (loading) return <PageLoader />;

  return (
    <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-[#0B8A83]" />
            Integrations
          </CardTitle>
          <CardDescription>
            Payments, messaging, storage, and AI services used across invitations and the gate.
          </CardDescription>
        </div>
        {isAdmin && (
          <Button asChild size="sm" className="shrink-0 bg-[#0B8A83]">
            <Link href={manageUrl}>Manage APIs</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{connected.length} connected</Badge>
          <Badge variant="outline">{pending.length} not configured</Badge>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.provider}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 p-3.5"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {item.category}
                  </Badge>
                  {item.isCustom && (
                    <Badge variant="outline" className="text-[10px]">
                      Custom
                    </Badge>
                  )}
                </div>
              </div>
              <Badge
                className={cn(
                  "shrink-0",
                  item.configured
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                )}
              >
                {item.configured ? "Connected" : "Not configured"}
              </Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {isAdmin
            ? "Configure Paystack, Resend, SMS, WhatsApp, AWS S3, OpenAI, or custom APIs in Admin → Integrations. Secrets are encrypted."
            : "Only platform admins can change API keys. Ask your Celeventic admin if a service shows “Not configured”."}
        </p>
      </CardContent>
    </Card>
  );
}

function PrivacySection() {
  return (
    <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#0B8A83]" />
          Privacy & data
        </CardTitle>
        <CardDescription>
          Consent history, cookie preferences, data export, and deletion requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          Celeventic keeps organizer and guest data under your Privacy Center controls. Export a copy
          of your account data or request deletion when you leave the platform.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <QuickLink
            href="/dashboard/privacy-center"
            title="Open Privacy Center"
            description="Consents, export, and deletion"
            icon={Shield}
          />
          <QuickLink
            href="/legal/privacy"
            title="Privacy policy"
            description="How Celeventic handles personal data"
            icon={ExternalLink}
          />
        </div>
        <Button asChild className="bg-[#0B8A83]">
          <Link href="/dashboard/privacy-center">Go to Privacy Center</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-4">
      <TwoFactorSettings />
      <Card className="border-slate-200/80">
        <CardHeader>
          <CardTitle className="text-base">Sessions & access</CardTitle>
          <CardDescription>How Celeventic keeps organizer accounts safe.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>Signed-in sessions expire after 30 days of inactivity.</p>
          <p>
            Use a strong unique password. Enable two-factor authentication for admin and organizer
            accounts that manage guest lists and gate admission.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href="/auth/forgot-password">Reset password</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingSection({ upgradeHighlight }: { upgradeHighlight?: string | null }) {
  const billingRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<{
    currentPlan: string;
    eventCount: number;
    organizationName?: string | null;
    adminFullAccess?: boolean;
    packages: Array<{ name: string; slug: string; price: number; guestLimit: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/billing")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!upgradeHighlight || loading) return;
    billingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [upgradeHighlight, loading]);

  if (loading) return <PageLoader />;
  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-slate-500">
          Could not load billing.
        </CardContent>
      </Card>
    );
  }

  return (
    <div ref={billingRef} className="space-y-4">
      {upgradeHighlight && (
        <SectionMessage tone="info">
          {`Upgrade your plan to unlock ${upgradeHighlight.replace(/_/g, " ").toLowerCase()}. Contact sales or compare packages below.`}
        </SectionMessage>
      )}
      <Card
        className={cn(
          "border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)]",
          upgradeHighlight && "ring-2 ring-[#0B8A83]/40"
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#0B8A83]" />
            Billing & plan
          </CardTitle>
          <CardDescription>
            {data.organizationName ? `${data.organizationName} · ` : ""}
            Current plan{" "}
            <Badge className="ml-1 align-middle">
              {data.adminFullAccess ? "Admin · full access" : data.currentPlan}
            </Badge>{" "}
            · {data.eventCount} event{data.eventCount === 1 ? "" : "s"}
            {data.adminFullAccess ? " · packages unlocked" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="bg-[#0B8A83] gap-1.5">
            <Link href="/dashboard/wallet">
              <Wallet className="h-4 w-4" /> Event Wallet
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/marketplace">Marketplace</Link>
          </Button>
          {upgradeHighlight && (
            <Button asChild variant="outline" size="sm">
              <a href={SALES_MAILTO}>Contact sales to upgrade</a>
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {data.packages.map((pkg) => {
          const current = data.adminFullAccess || pkg.slug === data.currentPlan;
          return (
            <Card
              key={pkg.slug}
              className={cn(
                "border-slate-200/80",
                current && "ring-2 ring-[#0B8A83]/40 shadow-[0_8px_24px_rgba(11,138,131,0.12)]"
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{pkg.name}</CardTitle>
                <CardDescription>
                  {pkg.guestLimit.toLocaleString()} guests ·{" "}
                  {data.adminFullAccess ? "Included (admin)" : `GHS ${pkg.price}/mo`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.adminFullAccess ? (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                    Unlocked
                  </Badge>
                ) : pkg.slug === data.currentPlan ? (
                  <Badge className="bg-[#0B8A83]/12 text-[#0B8A83] hover:bg-[#0B8A83]/12">
                    Current plan
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <a href={SALES_MAILTO}>Upgrade — contact sales</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsHubClient() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SettingsHubContent />
    </Suspense>
  );
}
