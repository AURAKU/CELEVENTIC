"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminQrBrandingCard } from "@/components/admin/admin-qr-branding-card";

interface ProviderRow {
  provider: string;
  isEnabled: boolean;
  envConfigured: boolean;
  updatedAt: string | null;
}

export function AdminApiSettingsClient() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);

  async function load() {
    const res = await fetch("/api/admin/api-settings");
    const d = await res.json();
    if (d.success) setProviders(d.data);
  }

  useEffect(() => { load(); }, []);

  async function toggle(provider: string, isEnabled: boolean) {
    await fetch("/api/admin/api-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, isEnabled }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="API Settings"
        subtitle="Enable providers and verify environment configuration. Secrets stay server-side only."
        onRefresh={load}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        {providers.map((p) => (
          <Card key={p.provider}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{p.provider}</CardTitle>
                <Badge variant={p.envConfigured ? "success" : "warning"}>
                  {p.envConfigured ? "Env configured" : "Env missing"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className={`text-sm font-medium ${p.isEnabled ? "text-green-600" : "text-slate-500"}`}>
                {p.isEnabled ? "Enabled in platform" : "Disabled"}
              </span>
              <Button size="sm" variant="outline" onClick={() => toggle(p.provider, !p.isEnabled)}>
                {p.isEnabled ? "Disable" : "Enable"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <AdminQrBrandingCard />
      <p className="text-xs text-slate-500">API keys are set via environment variables (.env). Never expose secrets in the UI.</p>
    </div>
  );
}
