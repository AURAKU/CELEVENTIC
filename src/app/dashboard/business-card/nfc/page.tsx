import { Suspense } from "react";
import { CeleCardNfcManager } from "@/components/digital-business-card/celecard-nfc-manager";

export const metadata = {
  title: "CeleYou NFC cards · Celeventic",
  description: "Pause, report lost, or replace a physical NFC card without changing your QR or profile URL.",
};

export default function CeleYouNfcPage() {
  return (
    <div className="mx-auto max-w-5xl py-5 sm:py-8">
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <CeleCardNfcManager />
      </Suspense>
    </div>
  );
}
