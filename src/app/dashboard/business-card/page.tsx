import { DigitalCardStudioClient } from "@/components/digital-business-card/digital-card-studio-client";

export const metadata = {
  title: "CeleYou · Celeventic",
  description: "Design your living CeleYou. Share with QR, NFC, Wallet, or link.",
};

export default function DigitalBusinessCardDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DigitalCardStudioClient />
    </div>
  );
}
