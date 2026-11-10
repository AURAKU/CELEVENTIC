import { CeleCardConciergeQueue } from "@/components/digital-business-card/celecard-concierge-queue";

export default function AdminCeleCardConciergePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B8A83]">Premium service</p>
        <h1 className="font-display text-3xl font-bold text-slate-900">CeleYou Concierge</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Customers pay for professional design. Staff create, activate, and deliver the card. No developer is required, and no fake payment is written.
        </p>
      </div>
      <CeleCardConciergeQueue />
    </div>
  );
}
