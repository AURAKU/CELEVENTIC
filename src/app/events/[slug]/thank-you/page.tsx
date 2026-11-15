import type { Metadata } from "next";
import { getServerAppUrl } from "@/lib/app-url";
import {
  buildThankYouOpenGraphMetadata,
  buildThankYouShareCopy,
} from "@/lib/thank-you/share-metadata";
import { thankYouService } from "@/services/thank-you/thank-you.service";
import ThankYouBySlugClient from "./thank-you-by-slug-client";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await thankYouService.getPublishedBySlug(slug);
    if (!page) {
      return { title: "Thank You | Celeventic", robots: { index: false, follow: false } };
    }
    const appUrl = await getServerAppUrl();
    const formatted = thankYouService.formatPublicPage(page);
    const hosts =
      formatted?.hostNames?.trim() ||
      page.event?.hostName ||
      page.event?.title ||
      "";
    const copy = buildThankYouShareCopy({
      title: formatted?.title,
      hostNames: formatted?.hostNames,
      hostName: page.event?.hostName,
      eventTitle: page.event?.title,
      message: formatted?.message,
    });
    const imageUrl =
      formatted?.hostPhotoUrl ||
      formatted?.heroImageUrl ||
      formatted?.flyerUrl ||
      page.event?.coverImageUrl ||
      page.event?.logoUrl ||
      null;
    const canonicalUrl = `${appUrl.replace(/\/$/, "")}/events/${encodeURIComponent(slug)}/thank-you`;

    return buildThankYouOpenGraphMetadata({
      title: copy.title,
      description: copy.description,
      canonicalUrl,
      imageUrl,
      imageAlt: hosts || copy.title,
    });
  } catch {
    return { title: "Thank You | Celeventic" };
  }
}

export default function EventThankYouBySlugPage() {
  return <ThankYouBySlugClient />;
}
