"use client";

/**
 * Compact gift CTA for the public Event Guide.
 * Only rendered when the organiser has turned GIFT_WALLET on and placement allows it.
 */
export function GuideGiftCard({
  giftUrl,
  title,
  teaser,
  ctaLabel,
  fonts,
  colors,
  accentWash,
  onAccent,
}: {
  giftUrl: string;
  title: string;
  teaser: string;
  ctaLabel: string;
  fonts: { heading: string; body: string; eyebrow: string };
  colors: { primary: string; secondary: string; accent: string; text: string };
  accentWash: string;
  onAccent: string;
}) {
  if (!giftUrl) return null;

  return (
    <section
      data-testid="event-guide-gift-card"
      className="mx-auto mt-8 w-full max-w-xl"
      aria-labelledby="guide-gift-heading"
    >
      <div
        className="rounded-2xl px-5 py-5"
        style={{
          background: `linear-gradient(145deg, ${accentWash}, transparent)`,
          border: `1px solid ${colors.secondary}40`,
        }}
      >
        <p
          className="text-[0.68rem] font-semibold uppercase tracking-[0.28em]"
          style={{ fontFamily: fonts.eyebrow, color: colors.secondary }}
        >
          A gift, if you wish
        </p>
        <h2
          id="guide-gift-heading"
          className="mt-2 text-xl leading-snug sm:text-2xl"
          style={{ fontFamily: fonts.heading, color: colors.primary }}
        >
          {title}
        </h2>
        <p
          className="mt-2 text-[0.9rem] leading-relaxed opacity-90"
          style={{ fontFamily: fonts.body, color: colors.text }}
        >
          {teaser}
        </p>
        <a
          href={giftUrl}
          data-testid="event-guide-gift-cta"
          className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-5 text-[0.85rem] font-semibold tracking-wide sm:w-auto"
          style={{
            background: colors.accent,
            color: onAccent,
            fontFamily: fonts.eyebrow,
          }}
        >
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}
