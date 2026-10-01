import type { Metadata } from "next";
import { LiveAlbumPageShell } from "@/components/memory/live-album-experience";
import { invitationFontVars } from "@/lib/invitation-fonts";
import { liveAlbumKey } from "@/lib/memory/live-album";
import { resolveLiveAlbumPageChrome } from "@/lib/memory/live-album-chrome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared album",
  robots: { index: false, follow: false },
};

export default async function LiveAlbumPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ lens?: string }>;
}) {
  const { key } = await params;
  const query = await searchParams;
  const chrome = await resolveLiveAlbumPageChrome(key);
  return (
    <div className={invitationFontVars}>
      <LiveAlbumPageShell
        invitationId={liveAlbumKey(key)}
        eventTitle={chrome.identity.title}
        openLens={query.lens === "1"}
        identity={chrome.identity}
        cssVars={chrome.cssVars}
      />
    </div>
  );
}
