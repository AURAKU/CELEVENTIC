"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { PaginatedSection } from "@/components/ui/paginated-section";

interface SettingRow {
  id: string;
  key: string;
  value: Record<string, unknown>;
  category: string;
}

export function AdminServicesClient({ initial }: { initial: SettingRow[] }) {
  const [settings, setSettings] = useState(initial);
  const [pricingEdits, setPricingEdits] = useState<Record<string, string>>({});

  async function reload() {
    const res = await fetch("/api/admin/settings");
    const d = await res.json();
    if (d.success) setSettings(d.data);
  }

  async function toggleService(key: string, enabled: boolean) {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: { enabled } }),
    });
    reload();
  }

  async function savePricing(key: string) {
    const val = parseFloat(pricingEdits[key]);
    if (isNaN(val)) return;
    const field = key.includes("commission") ? "percent" : "price";
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: { [field]: val } }),
    });
    reload();
  }

  const services = settings.filter((s) => s.category === "services");
  const pricing = settings.filter((s) => s.category === "pricing");

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Service Management"
        subtitle="Enable or disable platform modules and configure pricing."
        onRefresh={reload}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Platform Services</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <PaginatedSection
            items={services}
            limit={10}
            keyFor={(service) => service.key}
            renderItem={(service) => {
            const enabled = (service.value as { enabled?: boolean })?.enabled ?? false;
            return (
              <div className="stack-mobile p-4 rounded-lg border min-w-0">
                <div className="min-w-0">
                  <p className="font-medium capitalize truncate">{service.key.replace("services.", "").replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500 truncate">{service.key}</p>
                </div>
                <Button
                  size="sm"
                  variant={enabled ? "default" : "outline"}
                  className="touch-target shrink-0 w-full sm:w-auto"
                  onClick={() => toggleService(service.key, !enabled)}
                >
                  {enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>
            );
          }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <PaginatedSection
            items={pricing}
            limit={10}
            keyFor={(item) => item.key}
            renderItem={(item) => {
            const val = item.value as { price?: number; percent?: number };
            const display = val.percent ?? val.price ?? 0;
            const label = item.key.replace("pricing.", "").replace(/_/g, " ");
            return (
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 p-4 rounded-lg border min-w-0">
                <div className="flex-1 min-w-0">
                  <Label className="capitalize">{label}</Label>
                  <p className="text-xs text-slate-500 truncate">Current: {display}{val.percent !== undefined ? "%" : " GHS"}</p>
                </div>
                <Input
                  type="number"
                  className="w-full sm:w-32 min-w-0"
                  placeholder="New value"
                  value={pricingEdits[item.key] ?? ""}
                  onChange={(e) => setPricingEdits({ ...pricingEdits, [item.key]: e.target.value })}
                />
                <Button size="sm" className="touch-target shrink-0 w-full sm:w-auto" onClick={() => savePricing(item.key)}>Update</Button>
              </div>
            );
          }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
