import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { MemorialPageClient } from "./memorial-page-client";
import { formatLifeDates } from "@/lib/funeral-experience/terminology";
import { resolveMemorialExperience } from "@/lib/funeral-experience/experience-config";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await prisma.event.findUnique({
      where: { slug },
      include: { funeralProfile: true },
    });
    if (!event?.funeralProfile || event.funeralProfile.privacyStatus === "PRIVATE") {
      return { title: "Memorial | Celeventic", robots: { index: false, follow: false } };
    }
    const p = event.funeralProfile;
    const resolved = resolveMemorialExperience({
      theme: p.theme,
      templateSlug: p.templateSlug,
      revealStyle: p.revealStyle,
      familyContacts: p.familyContacts,
    });
    const name = [resolved.experience.honorificTitle, p.deceasedName].filter(Boolean).join(" ");
    const dates = formatLifeDates({
      dateOfBirth: p.dateOfBirth,
      dateOfPassing: p.dateOfPassing,
      format: resolved.experience.lifeDateFormat ?? "sunrise-sunset",
    });
    const title = `Funeral Invitation — ${name}`;
    const description =
      (p.familyInformation || "").slice(0, 160) ||
      `The family respectfully invites you to honour ${name}${dates ? ` · ${dates}` : ""}.`;
    const images = p.photoUrl ? [{ url: p.photoUrl, width: 800, height: 1000, alt: name }] : undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: p.photoUrl ? [p.photoUrl] : undefined,
      },
      robots:
        p.privacyStatus === "UNLISTED"
          ? { index: false, follow: false }
          : { index: true, follow: true },
    };
  } catch {
    return { title: "Memorial | Celeventic" };
  }
}

export default function MemorialPage() {
  return <MemorialPageClient />;
}
