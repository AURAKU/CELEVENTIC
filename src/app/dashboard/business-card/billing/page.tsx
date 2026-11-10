import { SmartCardBillingClient } from "@/components/digital-business-card/smartcard-billing-client";

export const metadata = {
  title: "CeleYou billing · Celeventic",
  description: "See CeleYou activation, renew a paid plan, and review Paystack charges.",
};

export default function SmartCardBillingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <SmartCardBillingClient />
    </div>
  );
}
