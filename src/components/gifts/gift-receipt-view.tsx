"use client";

import { Printer, ShieldCheck } from "lucide-react";
import type { GiftReceiptSnapshot } from "@/services/gifts/gift-receipt.service";
import type { GiftThemeCssVars } from "@/lib/gifts/gift-theme";

/**
 * The guest's receipt. Rendered from an immutable snapshot captured when the
 * gift was confirmed, so it never changes even if the organiser later edits the
 * campaign copy.
 */
export function GiftReceiptView({
  snapshot,
  themeVars,
  revoked,
}: {
  snapshot: GiftReceiptSnapshot;
  themeVars: GiftThemeCssVars;
  revoked: boolean;
}) {
  const paidAt = snapshot.paidAt ?? snapshot.issuedAt;

  return (
    <main className="gift-shell" style={themeVars as React.CSSProperties}>
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-14">
        <article className="gift-card p-8">
          <header className="text-center">
            <p
              className="text-[11px] uppercase tracking-[0.32em]"
              style={{ color: "var(--gift-color-ink-muted)" }}
            >
              Gift receipt
            </p>
            <h1 className="gift-display mt-3 text-2xl">{snapshot.event.title}</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--gift-color-ink-muted)" }}>
              {snapshot.event.hostName}
            </p>
            <div className="gift-rule mx-auto mt-5 w-24" />
          </header>

          {revoked && (
            <p
              className="mt-6 rounded-lg px-4 py-3 text-center text-xs"
              style={{ background: "color-mix(in srgb, #b91c1c 8%, transparent)", color: "#b91c1c" }}
            >
              This gift was refunded. The receipt is kept for your records.
            </p>
          )}

          <p className="gift-script mt-8 text-center text-3xl" style={{ color: "var(--gift-color-accent)" }}>
            {snapshot.amountFormatted}
          </p>

          <dl className="mt-8 space-y-3 text-sm">
            <Row label="Receipt number">{snapshot.receiptNumber}</Row>
            <Row label="Reference">{snapshot.reference}</Row>
            <Row label="Gift type">{snapshot.giftTypeLabel}</Row>
            <Row label="From">
              {snapshot.isAnonymous ? "Anonymous" : snapshot.guestName ?? "A guest"}
            </Row>
            <Row label="Date">
              {new Date(paidAt).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Row>
          </dl>

          {snapshot.guestMessage && (
            <>
              <div className="gift-rule my-6" />
              <p className="text-center text-sm italic leading-relaxed">
                &ldquo;{snapshot.guestMessage}&rdquo;
              </p>
            </>
          )}

          <div className="gift-rule my-6" />

          <p className="text-center text-sm leading-relaxed">
            {snapshot.campaign.thankYouMessage}
          </p>

          <button
            type="button"
            onClick={() => window.print()}
            className="gift-cta mt-8 inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Save or print
          </button>

          <p
            className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs"
            style={{ color: "var(--gift-color-ink-muted)" }}
          >
            <ShieldCheck className="h-3 w-3" aria-hidden />
            This receipt is private to you.
          </p>
        </article>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt style={{ color: "var(--gift-color-ink-muted)" }}>{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
