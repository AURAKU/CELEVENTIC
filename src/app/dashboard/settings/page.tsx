import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DashboardPageShell
        title="Settings"
        description="Manage your profile, security, and account preferences."
      >
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Name</span><span>{session?.user?.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{session?.user?.email || "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Phone</span><span>{session?.user?.phone || "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Role</span><Badge>{session?.user?.role}</Badge></div>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href="/dashboard/privacy-center">Privacy Center</Link>
          </Button>
        </CardContent>
      </Card>
      <TwoFactorSettings />
      </DashboardPageShell>
    </div>
  );
}
