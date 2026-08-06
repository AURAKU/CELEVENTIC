import type { Metadata } from "next";
import { eventGuideService } from "@/services/event-guide/event-guide.service";
import { resolveTabFromQuery } from "@/lib/event-guide/types";
import { EventGuideExperience } from "@/components/event-guide/event-guide-experience";
import { GuideUnavailable } from "@/components/event-guide/guide-unavailable";

export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ publicToken: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The unified Event Guide.
 *
 * Renders the *published snapshot* only — a draft edit is unreachable here by
 * construction. Any problem resolves to a themed unavailable page rather than a
 * 404 shell or a 500, because a guest meets this page standing at a venue.
 */
export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { publicToken } = await params;
  const result = await eventGuideService.resolvePublic(publicToken).catch(() => null);

  if (!result?.available) {
    return { title: "Event Guide", robots: { index: false, follow: false } };
  }

  return {
    title: `${result.payload.header.eventTitle} — Event Guide`,
    description: "Programme, seating and menu for this celebration.",
    // A guide token is a private link handed out on a printed sign.
    robots: { index: false, follow: false },
  };
}

export default async function EventGuidePage({ params, searchParams }: Ctx) {
  const { publicToken } = await params;
  const query = await searchParams;

  let result: Awaited<ReturnType<typeof eventGuideService.resolvePublic>>;
  try {
    result = await eventGuideService.resolvePublic(publicToken);
  } catch {
    // A database hiccup must still show a calm page, never a stack trace.
    return <GuideUnavailable reason="NOT_FOUND" />;
  }

  if (!result.available) {
    return <GuideUnavailable reason={result.reason} />;
  }

  const initialTab = resolveTabFromQuery(query.tab, result.payload.defaultTab);

  return (
    <EventGuideExperience
      publicToken={publicToken}
      initialPayload={result.payload}
      initialTab={
        initialTab === "seating" && !result.payload.seating.enabled ? "programme" : initialTab
      }
    />
  );
}
