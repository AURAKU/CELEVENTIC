"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminToolbar } from "@/components/admin/admin-toolbar";

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
          {services.map((service) => {
            const enabled = (service.value as { enabled?: boolean })?.enabled ?? false;
            return (
              <div key={service.key} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium capitalize">{service.key.replace("services.", "").replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500">{service.key}</p>
                </div>
                <Button
                  size="sm"
                  variant={enabled ? "default" : "outline"}
                  onClick={() => toggleService(service.key, !enabled)}
                >
                  {enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {pricing.map((item) => {
            const val = item.value as { price?: number; percent?: number };
            const display = val.percent ?? val.price ?? 0;
            const label = item.key.replace("pricing.", "").replace(/_/g, " ");
            return (
              <div key={item.key} className="flex flex-wrap items-end gap-3 p-4 rounded-lg border">
                <div className="flex-1 min-w-[200px]">
                  <Label className="capitalize">{label}</Label>
                  <p className="text-xs text-slate-500">Current: {display}{val.percent !== undefined ? "%" : " GHS"}</p>
                </div>
                <Input
                  type="number"
                  className="w-32"
                  placeholder="New value"
                  value={pricingEdits[item.key] ?? ""}
                  onChange={(e) => setPricingEdits({ ...pricingEdits, [item.key]: e.target.value })}
                />
                <Button size="sm" onClick={() => savePricing(item.key)}>Update</Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
