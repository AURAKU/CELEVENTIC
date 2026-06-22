"use client";

import { useState, useEffect } from "react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Award } from "lucide-react";

interface PackageRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  bestFor: string | null;
  priceGhs: string | number;
  revisions: number;
  deliveryDays: number;
  features: string[] | null;
  designerAssist: boolean;
  paymentRequiredToPublish: boolean;
  isActive: boolean;
  isPopular: boolean;
  isBestValue: boolean;
}

interface AddonRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  priceGhs: string | number;
  packageEligibility: string[] | null;
  deliveryImpactDays: number;
  isActive: boolean;
}

interface RateRow {
  id: string;
  targetCurrency: string;
  rate: string | number;
  source: string;
  updatedAt: string;
}

interface CurrencyRow {
  id: string;
  code: string;
  symbol: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
}

function AddonCreateForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priceGhs, setPriceGhs] = useState(0);
  const [packageEligibility, setPackageEligibility] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/commerce/addons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        category,
        priceGhs,
        packageEligibility: packageEligibility
          ? packageEligibility.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      }),
    });
    setName("");
    setDescription("");
    setCategory("general");
    setPriceGhs(0);
    setPackageEligibility("");
    setSaving(false);
    onCreated();
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Create Add-on</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Price (GHS)</Label><Input type="number" value={priceGhs} onChange={(e) => setPriceGhs(parseFloat(e.target.value))} min={0} /></div>
          <div><Label>Package Eligibility (slugs, comma-separated)</Label><Input value={packageEligibility} onChange={(e) => setPackageEligibility(e.target.value)} placeholder="starter,premium" /></div>
          <div className="flex items-end"><Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Add-on"}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminCommerceClient() {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [rates, setRates] = useState<RateRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [roundingRule, setRoundingRule] = useState("nearest_cent");
  const [addonSales, setAddonSales] = useState<{ slug: string; count: number }[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [pkgRes, addonRes, rateRes, currRes, analyticsRes] = await Promise.all([
      fetch("/api/admin/commerce/packages"),
      fetch("/api/admin/commerce/addons"),
      fetch("/api/admin/commerce/exchange-rates"),
      fetch("/api/admin/commerce/currencies"),
      fetch("/api/admin/invitation-analytics"),
    ]);
    const [pkg, addon, rate, curr, analytics] = await Promise.all([
      pkgRes.json(), addonRes.json(), rateRes.json(), currRes.json(), analyticsRes.json(),
    ]);
    if (pkg.success) setPackages(pkg.data);
    if (addon.success) setAddons(addon.data);
    if (rate.success) setRates(rate.data);
    if (curr.success) {
      setCurrencies(curr.data.currencies);
      setRoundingRule(curr.data.roundingRule);
    }
    if (analytics.success) setAddonSales(analytics.data.addonPerformance ?? []);
  }

  async function savePackage(pkg: PackageRow) {
    await fetch("/api/admin/commerce/packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: pkg.id,
        name: pkg.name,
        tagline: pkg.tagline,
        bestFor: pkg.bestFor,
        priceGhs: Number(pkg.priceGhs),
        revisions: pkg.revisions,
        deliveryDays: pkg.deliveryDays,
        designerAssist: pkg.designerAssist,
        paymentRequiredToPublish: pkg.paymentRequiredToPublish,
        isActive: pkg.isActive,
        isPopular: pkg.isPopular,
        isBestValue: pkg.isBestValue,
      }),
    });
    loadAll();
  }

  async function toggleAddon(id: string, isActive: boolean) {
    await fetch("/api/admin/commerce/addons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive }),
    });
    loadAll();
  }

  async function updateRate(targetCurrency: string, rate: number) {
    await fetch("/api/admin/commerce/exchange-rates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCurrency, rate, source: "manual" }),
    });
    loadAll();
  }

  async function toggleCurrency(code: string, enabled: boolean) {
    await fetch("/api/admin/commerce/currencies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, enabled }),
    });
    loadAll();
  }

  async function saveRoundingRule(rule: string) {
    setRoundingRule(rule);
    await fetch("/api/admin/commerce/currencies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundingRule: rule }),
    });
  }

  const salesMap = Object.fromEntries(addonSales.map((a) => [a.slug, a.count]));

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Packages, Add-ons & Currency"
        subtitle="Manage GHS pricing, exchange rates, package badges, and add-on eligibility"
        onRefresh={loadAll}
      />

      <Tabs defaultValue="packages">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="rates">Exchange Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-4 mt-4">
          <p className="text-sm text-slate-500">All prices stored in GHS. Mark packages as Popular or Best Value for catalogue display.</p>
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  {pkg.isPopular && <Badge className="bg-[#D4A63A] text-[#0F172A]"><Star className="h-3 w-3" /> Popular</Badge>}
                  {pkg.isBestValue && <Badge variant="success"><Award className="h-3 w-3" /> Best Value</Badge>}
                </div>
                <Badge variant={pkg.isActive ? "success" : "outline"}>{pkg.slug}</Badge>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><Label>Price (GHS)</Label><Input type="number" value={pkg.priceGhs} onChange={(e) => setPackages((p) => p.map((x) => x.id === pkg.id ? { ...x, priceGhs: e.target.value } : x))} /></div>
                <div><Label>Revisions</Label><Input type="number" value={pkg.revisions} onChange={(e) => setPackages((p) => p.map((x) => x.id === pkg.id ? { ...x, revisions: parseInt(e.target.value, 10) } : x))} /></div>
                <div><Label>Delivery Days</Label><Input type="number" value={pkg.deliveryDays} onChange={(e) => setPackages((p) => p.map((x) => x.id === pkg.id ? { ...x, deliveryDays: parseInt(e.target.value, 10) } : x))} /></div>
                <div><Label>Tagline</Label><Input value={pkg.tagline ?? ""} onChange={(e) => setPackages((p) => p.map((x) => x.id === pkg.id ? { ...x, tagline: e.target.value } : x))} /></div>
                <div className="sm:col-span-2"><Label>Best For</Label><Input value={pkg.bestFor ?? ""} onChange={(e) => setPackages((p) => p.map((x) => x.id === pkg.id ? { ...x, bestFor: e.target.value } : x))} /></div>
                <div className="sm:col-span-2 flex flex-wrap gap-4 items-center">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pkg.isActive} onChange={(e) => setPackages((p) => p.map((x) => x.id === pkg.id ? { ...x, isActive: e.target.checked } : x))} /> Active</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pkg.isPopular} onChange={(e) => setPackages((p) => p.map((x) => x.id === pkg.id ? { ...x, isPopular: e.target.checked } : x))} /> Popular</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pkg.isBestValue} onChange={(e) => setPackages((p) => p.map((x) => x.id === pkg.id ? { ...x, isBestValue: e.target.checked } : x))} /> Best Value</label>
                  <Button size="sm" onClick={() => savePackage(pkg)}>Save Package</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="addons" className="space-y-4 mt-4">
          <AddonCreateForm onCreated={loadAll} />
          {addons.map((addon) => (
            <Card key={addon.id} className={!addon.isActive ? "opacity-60" : ""}>
              <CardContent className="pt-6 flex flex-wrap justify-between gap-4">
                <div>
                  <p className="font-semibold">{addon.name}</p>
                  <p className="text-sm text-slate-500">{addon.description}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline">{addon.category}</Badge>
                    {addon.packageEligibility && (
                      <Badge variant="outline">{(addon.packageEligibility as string[]).join(", ")}</Badge>
                    )}
                    {salesMap[addon.slug] !== undefined && (
                      <Badge variant="success">{salesMap[addon.slug]} sales</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-bold text-[#0B8A83]">₵{Number(addon.priceGhs)}</p>
                  <Button size="sm" variant="outline" onClick={() => toggleAddon(addon.id, !addon.isActive)}>
                    {addon.isActive ? "Disable" : "Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="currencies" className="space-y-4 mt-4">
          <p className="text-sm text-slate-500">Base currency: GHS. Enable/disable display currencies. Paystack always settles in GHS.</p>
          <Card>
            <CardContent className="pt-6">
              <Label>Rounding Rule</Label>
              <Select value={roundingRule} onValueChange={saveRoundingRule}>
                <SelectTrigger className="mt-1 max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nearest_cent">Nearest cent (0.01)</SelectItem>
                  <SelectItem value="nearest_whole">Nearest whole number</SelectItem>
                  <SelectItem value="ceil">Round up</SelectItem>
                  <SelectItem value="floor">Round down</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          {currencies.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-6 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <p className="font-semibold">{c.symbol} {c.code} — {c.name}</p>
                  {c.isDefault && <Badge className="mt-1">Default</Badge>}
                </div>
                <Button
                  size="sm"
                  variant={c.enabled ? "outline" : "default"}
                  disabled={c.code === "GHS"}
                  onClick={() => toggleCurrency(c.code, !c.enabled)}
                >
                  {c.enabled ? "Enabled" : "Disabled"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rates" className="space-y-4 mt-4">
          <p className="text-sm text-slate-500">Manual exchange rate override. Rates apply to display pricing only.</p>
          {rates.map((rate) => (
            <Card key={rate.id}>
              <CardContent className="pt-6 flex flex-wrap items-end gap-4">
                <div>
                  <p className="font-semibold">GHS → {rate.targetCurrency}</p>
                  <p className="text-xs text-slate-400">Source: {rate.source}</p>
                </div>
                <div className="flex gap-2 items-end">
                  <div>
                    <Label>Rate</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      defaultValue={Number(rate.rate)}
                      id={`rate-${rate.targetCurrency}`}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById(`rate-${rate.targetCurrency}`) as HTMLInputElement;
                      updateRate(rate.targetCurrency, parseFloat(input.value));
                    }}
                  >
                    Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
