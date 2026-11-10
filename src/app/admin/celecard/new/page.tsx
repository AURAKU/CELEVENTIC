import { CeleCardCreateWizard } from "@/components/digital-business-card/celecard-create-wizard";

export default function AdminCreateCeleCardPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B8A83]">Assisted creation</p>
        <h1 className="font-display text-3xl font-bold text-slate-900">Create CeleYou for Customer</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Prepare a card, assign an entitlement if authorized, and send a claim link. No password is created for an unverified person.
        </p>
      </div>
      <CeleCardCreateWizard />
    </div>
  );
}
