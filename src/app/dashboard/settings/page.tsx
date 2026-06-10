import { getSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Name</span><span>{session?.user?.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{session?.user?.email || "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Phone</span><span>{session?.user?.phone || "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Role</span><Badge>{session?.user?.role}</Badge></div>
        </CardContent>
      </Card>
      <TwoFactorSettings />
    </div>
  );
}
