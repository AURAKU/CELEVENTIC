import { GUIDE_UNAVAILABLE_COPY, type GuideUnavailableReason } from "@/lib/event-guide/types";

/**
 * What a guest sees for an invalid, revoked, paused or unpublished guide.
 *
 * Deliberately calm and branded rather than a 404: someone standing at a
 * venue holding a phone should feel informed, not broken. It reveals nothing
 * about whether the token ever existed.
 */
export function GuideUnavailable({ reason }: { reason: GuideUnavailableReason }) {
  const copy = GUIDE_UNAVAILABLE_COPY[reason];

  return (
    <main
      data-testid="event-guide-unavailable"
      data-reason={reason}
      className="flex min-h-dvh items-center justify-center bg-[#fbf8f3] px-6 py-16"
    >
      <div className="w-full max-w-md text-center">
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d8cdb8] text-2xl text-[#8a7a5c]"
        >
          ✦
        </span>
        <p className="mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[#8a7a5c]">
          Event Guide
        </p>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-[#2b2118] sm:text-3xl">
          {copy.heading}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[#5c5346]">{copy.body}</p>
        <p className="mt-10 text-[0.65rem] uppercase tracking-[0.2em] text-[#a99b82]">
          Celeventic
        </p>
      </div>
    </main>
  );
}
