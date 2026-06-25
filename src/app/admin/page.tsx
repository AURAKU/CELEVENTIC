import Link from "next/link";
import { getSession } from "@/lib/auth";
import { invitationAdminService } from "@/services/admin/invitation-admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield, Mail, CreditCard, Palette, Package, BarChart3, Star, RefreshCw,
  FileText, Phone, TrendingUp, Clock, Music, Key,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const session = await getSession();
  const analytics = await invitationAdminService.getInvitationAnalytics();

  const quickLinks = [
    { href: "/admin/invitation-orders", label: "Invitation Orders", icon: Mail, desc: "Assign designers, update production" },
    { href: "/admin/invitation-templates", label: "Catalog Templates", icon: Palette, desc: "Create, feature, enable templates" },
    { href: "/admin/commerce", label: "Packages & Add-ons", icon: Package, desc: "Pricing, currencies, exchange rates" },
    { href: "/admin/music", label: "Music Library", icon: Music, desc: "Invitation audio tracks for organizers" },
    { href: "/admin/payments", label: "Payments", icon: CreditCard, desc: "Logs, webhooks, export reports" },
    { href: "/admin/integrations", label: "Integrations & API", icon: Key, desc: "Connect Paystack, email, intelligence services, maps, and custom APIs" },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3, desc: "Revenue, funnel, best sellers" },
    { href: "/admin/revisions", label: "Revisions", icon: RefreshCw, desc: "Track and approve revisions" },
    { href: "/admin/reviews", label: "Reviews", icon: Star, desc: "Moderate and feature reviews" },
    { href: "/admin/legal", label: "Legal Center", icon: FileText, desc: "Policies in EN/FR" },
    { href: "/admin/contact", label: "Contact Settings", icon: Phone, desc: "Phone, email, hours" },
    { href: "/admin/translations", label: "Languages", icon: TrendingUp, desc: "EN/FR translations & emails" },
  ];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl sidebar-gradient p-6 sm:p-8 text-white shadow-[0_12px_40px_rgba(15,23,42,0.4)] border border-white/10">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-gold-400" />
            <span className="text-sm font-medium text-white/70">Invitation Business Administration</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Admin Command Center</h1>
          <p className="text-white/60 mt-1">Welcome, {session?.user?.name}. Control orders, templates, commerce, and content — no code required.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{analytics.totalOrders}</p><p className="text-xs text-slate-500">Total Orders</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold text-[#0B8A83]">{formatCurrency(analytics.totalRevenue)}</p><p className="text-xs text-slate-500">Revenue (GHS)</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{formatCurrency(analytics.averageOrderValue)}</p><p className="text-xs text-slate-500">Avg Order Value</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold text-amber-600">{analytics.pendingProduction}</p><p className="text-xs text-slate-500 flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Pending Production</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{analytics.paymentSuccessRate}%</p><p className="text-xs text-slate-500">Payment Success</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold capitalize">{analytics.bestPackage?.slug ?? "—"}</p><p className="text-xs text-slate-500">Best Package</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{analytics.paidOrders}</p><p className="text-xs text-slate-500">Paid Orders</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="text-3xl font-bold">{analytics.conversionFunnel.published}</p><p className="text-xs text-slate-500">Published Invites</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Management</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="p-4 rounded-xl border hover:border-[#0B8A83] hover:bg-[#0B8A83]/5 transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                <item.icon className="h-4 w-4 text-[#0B8A83]" />
                <span className="font-medium text-sm group-hover:text-[#0B8A83]">{item.label}</span>
              </div>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
