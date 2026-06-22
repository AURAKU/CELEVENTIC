"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { formatCurrency } from "@/lib/utils";

interface Analytics {
  totalOrders: number;
  paidOrders: number;
  pendingProduction: number;
  totalRevenue: number;
  averageOrderValue: number;
  paymentSuccessRate: number;
  bestPackage: { slug: string; count: number; revenue: number } | null;
  packageBreakdown: { slug: string; count: number; revenue: number }[];
  topTemplates: { slug: string; orders: number }[];
  addonPerformance: { slug: string; count: number }[];
  conversionFunnel: { draft: number; pendingPayment: number; paid: number; published: number };
  godTier?: {
    templateViews: number;
    checkoutStarts: number;
    checkoutAbandonmentRate: number;
    inviteOpens: number;
    paymentCount: number;
    paymentRevenue: number;
    topTemplates: { slug: string | null; views: number }[];
  };
}

export function AdminInvitationAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/admin/invitation-analytics").then((r) => r.json()).then((d) => {
      if (d.success) setData(d.data);
    });
  }, []);

  if (!data) return <p className="text-slate-500">Loading analytics...</p>;

  return (
    <div className="space-y-6">
      <AdminToolbar title="Invitation Analytics" subtitle="Revenue, conversion, packages, and production metrics" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{data.totalOrders}</p><p className="text-xs text-slate-500">Total Orders</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold text-[#0B8A83]">{formatCurrency(data.totalRevenue)}</p><p className="text-xs text-slate-500">Revenue (GHS)</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{formatCurrency(data.averageOrderValue)}</p><p className="text-xs text-slate-500">Avg Order Value</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{data.paymentSuccessRate}%</p><p className="text-xs text-slate-500">Payment Success</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold text-amber-600">{data.pendingProduction}</p><p className="text-xs text-slate-500">Pending Production</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{data.paidOrders}</p><p className="text-xs text-slate-500">Paid Orders</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-lg font-bold capitalize">{data.bestPackage?.slug ?? "—"}</p><p className="text-xs text-slate-500">Best Package ({data.bestPackage?.count ?? 0} orders)</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{data.conversionFunnel.published}</p><p className="text-xs text-slate-500">Published</p></CardContent></Card>
      </div>

      {data.godTier && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold">{data.godTier.templateViews}</p><p className="text-xs text-slate-500">Template Views</p></CardContent></Card>
          <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold">{data.godTier.inviteOpens}</p><p className="text-xs text-slate-500">Invite Opens</p></CardContent></Card>
          <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold">{data.godTier.checkoutAbandonmentRate}%</p><p className="text-xs text-slate-500">Checkout Abandon</p></CardContent></Card>
          <Card><CardContent className="pt-5 text-center"><p className="text-2xl font-bold text-[#0B8A83]">{formatCurrency(data.godTier.paymentRevenue)}</p><p className="text-xs text-slate-500">Event Revenue (tracked)</p></CardContent></Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(data.conversionFunnel).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="capitalize text-slate-600">{k.replace(/([A-Z])/g, " $1")}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Package Performance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.packageBreakdown.map((p) => (
              <div key={p.slug} className="flex justify-between">
                <span className="capitalize">{p.slug}</span>
                <span>{p.count} · {formatCurrency(p.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Templates</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.topTemplates.map((t) => (
              <div key={t.slug} className="flex justify-between"><span>{t.slug}</span><strong>{t.orders}</strong></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Best Add-ons</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.addonPerformance.length === 0 ? <p className="text-slate-500">No add-on data yet</p> : data.addonPerformance.slice(0, 8).map((a) => (
              <div key={a.slug} className="flex justify-between"><span>{a.slug}</span><strong>{a.count}</strong></div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
