import Link from "next/link";
import { getSession } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/rbac";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { getCeleCardCommandOverview } from "@/services/digital-business-card/admin-command.service";
import { CeleCardAdminPolicyForm } from "@/components/digital-business-card/celecard-admin-policy-form";
import { CeleCardCommandDirectory } from "@/components/digital-business-card/celecard-command-directory";
import { CeleCardPricingForm } from "@/components/digital-business-card/celecard-pricing-form";
import { Button } from "@/components/ui/button";

export default async function AdminCeleCardPage() {
  const [policy, overview, session] = await Promise.all([
    getCeleCardLifecyclePolicy(),
    getCeleCardCommandOverview(),
    getSession(),
  ]);
  const canEditPrices = Boolean(session?.user?.role && hasPermission({ role: session.user.role }, Permission.CELECARD_PRICING_MANAGE));
  const kpis = [
    ["Total CeleYou cards", overview.total],
    ["Active Cards", overview.activeCards],
    ["Courtesy Mode Cards", overview.courtesyModeCards],
    ["Suspended Cards", overview.suspendedCards],
    ["Unclaimed Cards", overview.unclaimedCards],
    ["Active Subscriptions", overview.activeSubscriptions],
    ["Expiring Soon", overview.expiringSoon],
    ["Pending Connection Requests", overview.pendingConnectionRequests],
    ["Concierge open", overview.conciergeOpen ?? 0],
  ] as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B8A83]">Administrative Control</p>
          <h1 className="font-display text-3xl font-bold text-slate-900">CeleYou Command Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Create, activate, and hand over CeleYou cards without changing payment history or private access codes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/celecard/new">Create CeleYou</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/celecard/concierge">Concierge queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/analytics">View Analytics</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, count]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{count}</p>
          </div>
        ))}
      </div>

      <CeleCardCommandDirectory />

      <CeleCardPricingForm canEdit={canEditPrices} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Catalog</h2>
        <p className="mt-1 text-xs text-slate-500">{overview.prepaidNote}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {overview.plans.map((plan) => (
            <li key={plan.id}>
              {plan.label}: GH₵{plan.priceGhs} · {plan.months} months
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">Courtesy reconnects: {overview.courtesyReconnects}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Policy</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Timezone</dt>
            <dd>{policy.timezone}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Grace period</dt>
            <dd>{policy.gracePeriodDays} days</dd>
          </div>
          <div>
            <dt className="text-slate-500">Expiring window</dt>
            <dd>{policy.expiringSoonDays} days</dd>
          </div>
          <div>
            <dt className="text-slate-500">Reminders (days)</dt>
            <dd>{policy.reminderOffsetsDays.join(", ")}</dd>
          </div>
        </dl>
      </section>

      <CeleCardAdminPolicyForm policy={policy} />
    </div>
  );
}
