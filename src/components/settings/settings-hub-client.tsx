"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { SettingsTabs, type SettingsTab } from "@/components/settings/settings-tabs";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

const VALID_TABS: SettingsTab[] = [
  "account", "organization", "team", "permissions", "branding",
  "integrations", "security", "billing",
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["Full platform access", "Admin panel", "All events", "Integrations", "Billing"],
  ADMIN: ["Admin panel", "All events", "Team management", "Integrations"],
  ORGANIZER: ["Create events", "Invitations", "Guests", "Memory vault", "Wallet"],
  VENDOR: ["Vendor portal", "Bookings", "Portfolio", "Earnings"],
  STAFF: ["Assigned events", "QR admission", "Guest check-in"],
  GUEST: ["RSVP", "Upload memories"],
};

function SettingsHubContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "account";
  const tab: SettingsTab = VALID_TABS.includes(rawTab as SettingsTab)
    ? (rawTab as SettingsTab)
    : "account";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <DashboardPageShell
        title="Settings"
        description="Manage your account, organization, security, and platform preferences."
      >
        <SettingsTabs active={tab} />
        <div className="mt-6">
          {tab === "account" && <AccountSection />}
          {tab === "organization" && <OrganizationSection />}
          {tab === "team" && <TeamSection />}
          {tab === "permissions" && <PermissionsSection />}
          {tab === "branding" && <BrandingSection />}
          {tab === "integrations" && <IntegrationsSection />}
          {tab === "security" && <SecuritySection />}
          {tab === "billing" && <BillingSection />}
        </div>
      </DashboardPageShell>
    </div>
  );
}

function AccountSection() {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  async function save() {
    const res = await fetch("/api/settings/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setMessage(res.ok ? "Profile updated." : (await res.json()).error ?? "Update failed");
  }

  return (
    <Card>
      <CardHeader><CardTitle>Account</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-slate-500">Email</span><p>{session?.user?.email ?? "—"}</p></div>
          <div><span className="text-slate-500">Phone</span><p>{session?.user?.phone ?? "—"}</p></div>
          <div><span className="text-slate-500">Role</span><Badge className="mt-1">{session?.user?.role}</Badge></div>
        </div>
        <div className="space-y-1">
          <Label>Display name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={save} size="sm">Save profile</Button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/privacy-center">Privacy Center</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function OrganizationSection() {
  const [org, setOrg] = useState<{ name: string; country: string; plan: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/organization")
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrg(d.data); setLoading(false); });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    const res = await fetch("/api/settings/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: org.name, country: org.country }),
    });
    const d = await res.json();
    setMessage(res.ok ? "Organization updated." : d.error ?? "Update failed");
    if (res.ok) setOrg(d.data);
  }

  if (loading) return <PageLoader />;
  if (!org) return <p className="text-slate-500">Could not load organization.</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>Your workspace identity and plan tier.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1">
            <Label>Organization name</Label>
            <Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Country code</Label>
            <Input value={org.country} onChange={(e) => setOrg({ ...org, country: e.target.value })} maxLength={2} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Plan:</span>
            <Badge variant="secondary">{org.plan}</Badge>
            <span className="text-slate-400">· {org.slug}</span>
          </div>
          <Button type="submit" size="sm">Save organization</Button>
          {message && <p className="text-sm text-slate-600">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

function TeamSection() {
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string | null; role: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/team")
      .then((r) => r.json())
      .then((d) => { if (d.success) setMembers(d.data.members); setLoading(false); });
  }, []);

  if (loading) return <PageLoader />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>People in your organization workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <p className="text-sm text-slate-500">No team members yet. Invite colleagues from your organization settings.</p>
        ) : members.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-slate-500">{m.email ?? "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{m.role}</Badge>
              <Badge variant={m.status === "ACTIVE" ? "secondary" : "destructive"}>{m.status}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PermissionsSection() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "ORGANIZER";
  const perms = ROLE_PERMISSIONS[role] ?? ["Standard access"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>Capabilities for your role ({role}).</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {perms.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              {p}
            </li>
          ))}
        </ul>
        {isAdminRole(role as UserRole) && (
          <Button asChild className="mt-4" size="sm">
            <Link href="/admin">Open Admin Panel</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function BrandingSection() {
  const [data, setData] = useState<{ user: { name: string; avatarUrl: string | null }; organizationLogo: string | null; organizationName: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings/account")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
          setAvatarUrl(d.data.user.avatarUrl ?? "");
        }
      });
  }, []);

  async function save() {
    const res = await fetch("/api/settings/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: avatarUrl || null }),
    });
    setMessage(res.ok ? "Branding updated." : (await res.json()).error ?? "Update failed");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>Profile photo and organization visual identity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.organizationName && (
          <p className="text-sm text-slate-600">Organization: <strong>{data.organizationName}</strong></p>
        )}
        <div className="space-y-1">
          <Label>Avatar URL</Label>
          <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
        </div>
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar preview" className="h-16 w-16 rounded-full object-cover border" />
        )}
        <Button onClick={save} size="sm">Save branding</Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/design-studio">Design Studio</Link>
        </Button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </CardContent>
    </Card>
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

  if (loading) return <PageLoader />;

  const connected = items.filter((i) => i.configured);
  const pending = items.filter((i) => !i.configured);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Platform services used for payments, messaging, storage, and intelligence.
          </CardDescription>
        </div>
        {isAdmin && (
          <Button asChild size="sm" className="shrink-0 gap-1.5">
            <Link href={manageUrl}>
              Manage APIs
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="success">{connected.length} connected</Badge>
          <Badge variant="secondary">{pending.length} not configured</Badge>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.provider}
              className="flex items-start justify-between p-3 rounded-lg border text-sm gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{item.description}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                  {item.isCustom && (
                    <Badge variant="outline" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </div>
              </div>
              <Badge variant={item.configured ? "default" : "secondary"} className="shrink-0">
                {item.configured ? "Connected" : "Not configured"}
              </Badge>
            </div>
          ))}
        </div>
        {isAdmin ? (
          <p className="text-xs text-slate-500">
            Add Paystack, Resend, SMS, WhatsApp, AWS S3, OpenAI, or a custom API in Admin → Integrations.
            Secrets are encrypted in the database.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Only platform admins can add or change API keys. Contact your Celeventic admin if a service shows
            “Not configured”.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-4">
      <TwoFactorSettings />
      <Card>
        <CardHeader><CardTitle>Session & Access</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>Sessions expire after 30 days of inactivity.</p>
          <p>Use a strong unique password and enable two-factor authentication for admin accounts.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingSection() {
  const [data, setData] = useState<{
    currentPlan: string;
    eventCount: number;
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
      });
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Billing & Plan</CardTitle>
          <CardDescription>
            Current plan:{" "}
            <Badge>{data.adminFullAccess ? "Admin — full access" : data.currentPlan}</Badge> ·{" "}
            {data.eventCount} events
            {data.adminFullAccess ? " · all packages unlocked free" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link href="/dashboard/wallet">Event Wallet & Transactions</Link>
          </Button>
        </CardContent>
      </Card>
      <div className="grid sm:grid-cols-2 gap-4">
        {data.packages.map((pkg) => (
          <Card
            key={pkg.slug}
            className={
              data.adminFullAccess || pkg.slug === data.currentPlan ? "ring-2 ring-brand-500" : ""
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{pkg.name}</CardTitle>
              <CardDescription>
                {pkg.guestLimit} guests ·{" "}
                {data.adminFullAccess ? "Included (admin)" : `GHS ${pkg.price}/mo`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.adminFullAccess ? (
                <Badge>Unlocked</Badge>
              ) : pkg.slug === data.currentPlan ? (
                <Badge>Current plan</Badge>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Upgrade (contact sales)
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
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
