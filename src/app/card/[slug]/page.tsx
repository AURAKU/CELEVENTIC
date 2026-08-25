import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DigitalCardPublicView } from "@/components/digital-business-card/digital-card-public-view";
import {
  getDigitalCardBySlug,
  incrementDigitalCardView,
  toPublicPayload,
} from "@/services/digital-business-card/digital-business-card.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getDigitalCardBySlug(slug);
  if (!card) return { title: "SmartCard" };
  return {
    title: `${card.displayName} · Celeventic SmartCard`,
    description:
      card.bio ||
      [card.title, card.company].filter(Boolean).join(" · ") ||
      "Celeventic SmartCard — your identity, one tap away",
  };
}

export default async function DigitalBusinessCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await getDigitalCardBySlug(slug);
  if (!card) notFound();

  void incrementDigitalCardView(card.id).catch(() => undefined);

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  return <DigitalCardPublicView card={toPublicPayload(card)} origin={origin} />;
}
