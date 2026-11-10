import { CeleCardConciergeIntake } from "@/components/digital-business-card/celecard-concierge-intake";

export default function DashboardCeleCardConciergePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B8A83]">Done for you</p>
        <h1 className="font-display text-3xl font-bold">CeleYou Concierge</h1>
      </div>
      <CeleCardConciergeIntake />
    </div>
  );
}
