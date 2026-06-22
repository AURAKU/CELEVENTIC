"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, Users, Eye, TrendingUp } from "lucide-react";

interface AnalyticsData {
  summary: {
    totalOrders: number;
    revenue: number;
    templateViews: number;
    inviteOpens: number;
    rsvpRate: number;
    openRate: number;
    checkoutConversion: number;
    checkoutAbandonment: number;
  };
  guestCrm: {
    invited: number;
    opened: number;
    accepted: number;
    declined: number;
    maybe: number;
    checkedIn: number;
    noResponse: number;
  };
  packageBreakdown: Record<string, number>;
  templateBreakdown: Record<string, number>;
  addonBreakdown: Record<string, number>;
}

export function InvitationAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch("/api/invitation-os/analytics")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); });
  }, []);

  if (!data) return <p className="text-slate-500 py-12 text-center">Loading InvitationOS analytics...</p>;

  const { summary, guestCrm } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-[#0B8A83]" />
          Invitation Analytics
        </h1>
        <p className="page-subtitle">RSVP rates, opens, revenue, and package performance across your celebrations.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-3xl font-bold">{summary.totalOrders}</p>
            <p className="text-xs text-slate-500">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-3xl font-bold text-[#0B8A83]">{formatCurrency(summary.revenue)}</p>
            <p className="text-xs text-slate-500">Revenue (GHS)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-3xl font-bold flex items-center gap-1">
              <Eye className="h-5 w-5 text-[#D4A63A]" />
              {summary.openRate}%
            </p>
            <p className="text-xs text-slate-500">Open Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-3xl font-bold flex items-center gap-1">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              {summary.rsvpRate}%
            </p>
            <p className="text-xs text-slate-500">RSVP Rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Guest CRM Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center text-sm">
            {[
              { label: "Invited", value: guestCrm.invited, color: "text-slate-700" },
              { label: "Opened", value: guestCrm.opened, color: "text-blue-600" },
              { label: "Accepted", value: guestCrm.accepted, color: "text-emerald-600" },
              { label: "Declined", value: guestCrm.declined, color: "text-red-600" },
              { label: "Maybe", value: guestCrm.maybe, color: "text-amber-600" },
              { label: "Checked In", value: guestCrm.checkedIn, color: "text-[#0B8A83]" },
              { label: "No Response", value: guestCrm.noResponse, color: "text-slate-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border p-3">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Packages</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(data.packageBreakdown).map(([k, v]) => (
              <div key={k} className="flex justify-between capitalize">
                <span>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Templates</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(data.templateBreakdown).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Add-ons</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.keys(data.addonBreakdown).length === 0 ? (
              <p className="text-slate-500">No add-on selections yet</p>
            ) : Object.entries(data.addonBreakdown).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Funnel</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
          <div><span className="text-slate-500">Template Views</span><p className="text-xl font-bold">{summary.templateViews}</p></div>
          <div><span className="text-slate-500">Invite Opens</span><p className="text-xl font-bold">{summary.inviteOpens}</p></div>
          <div><span className="text-slate-500">Checkout Abandonment</span><p className="text-xl font-bold">{summary.checkoutAbandonment}</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
