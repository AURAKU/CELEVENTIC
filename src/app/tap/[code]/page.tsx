import type { Metadata } from "next";
import { normalizeTapSecret } from "@/lib/celeyou-proximity/join-code";
import { TAP_MODE_HEADING, TAP_MODE_SUPPORT } from "@/lib/celeyou-proximity/product";
import { getTapGuestLanding } from "@/services/digital-business-card/proximity.service";
import { CeleYouTapGuestView } from "@/components/digital-business-card/celeyou-tap-guest-view";
import { celeYouGuestOrigin, getServerAppUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code: raw } = await params;
  const code = normalizeTapSecret(raw || "");
  const landing = await getTapGuestLanding(code);
  if (landing.status !== 200) {
    return {
      title: "Connection closed · CeleYou",
      description: TAP_MODE_SUPPORT,
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Connect with ${landing.data.host.displayName} · CeleYou`,
    description: TAP_MODE_HEADING,
    robots: { index: false, follow: false },
  };
}

export default async function TapJoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = normalizeTapSecret(raw || "");
  const origin = celeYouGuestOrigin(await getServerAppUrl());
  const landing = await getTapGuestLanding(code, { recordOpen: true });
  return (
    <CeleYouTapGuestView
      joinCode={code}
      origin={origin}
      landing={landing.status === 200 ? landing.data : null}
      error={landing.status === 200 ? null : landing.error}
    />
  );
}
