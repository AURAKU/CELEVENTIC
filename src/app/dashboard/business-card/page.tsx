import { DigitalCardStudioClient } from "@/components/digital-business-card/digital-card-studio-client";

export const metadata = {
  title: "Digital business card · Celeventic",
  description: "Create a shareable digital business card with QR, NFC, and social links.",
};

export default function DigitalBusinessCardDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DigitalCardStudioClient />
    </div>
  );
}
