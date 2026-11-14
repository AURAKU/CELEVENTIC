import { notFound, permanentRedirect, redirect } from "next/navigation";
import { DEMO_CARD_SLUG, getDemoCardBySlug, isDemoCardSlug } from "@/lib/digital-business-card/demo-card";
import { resolveCeleYouPublicHandle } from "@/services/digital-business-card/username.service";

export const dynamic = "force-dynamic";

export default async function CeleYouUsernameWalletPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  if (isDemoCardSlug(username)) redirect(`/card/${DEMO_CARD_SLUG}/wallet`);
  if (getDemoCardBySlug(username)) redirect(`/card/${username}/wallet`);
  const resolved = await resolveCeleYouPublicHandle(username);
  if (resolved.kind === "alias") permanentRedirect(`/u/${resolved.redirectTo}/wallet`);
  if (resolved.kind === "card") redirect(`/card/${resolved.slug}/wallet`);
  notFound();
}
