"use client";

import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import type { NfcTapOutcome } from "@/lib/digital-business-card/nfc-device";
import { useLocale } from "@/components/i18n/locale-provider";

export function DigitalCardNfcTapView({
  outcome,
}: {
  outcome: Exclude<NfcTapOutcome, "open" | "profile">;
}) {
  const { t } = useLocale();
  const copy = {
    heading: t(`celeyou.nfc_${outcome}_heading`),
    body: t(`celeyou.nfc_${outcome}_body`),
  };
  return (
    <main className="min-h-app-viewport grid place-items-center bg-stone-100 px-4">
      <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <CeleYouBrandMark variant="lockup" tone="light" markClassName="h-16 w-auto" className="mb-4 justify-center" />
        <h1 className="font-display text-xl font-semibold text-stone-900">{copy.heading}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">{copy.body}</p>
      </div>
    </main>
  );
}
