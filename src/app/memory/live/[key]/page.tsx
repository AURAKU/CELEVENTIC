import type { Metadata } from "next";
import { LiveAlbumPageShell } from "@/components/memory/live-album-experience";
import { invitationFontVars } from "@/lib/invitation-fonts";
import { liveAlbumKey } from "@/lib/memory/live-album";

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
  return (
    <div className={invitationFontVars}>
      <LiveAlbumPageShell
        invitationId={liveAlbumKey(key)}
        eventTitle="The shared album"
        openLens={query.lens === "1"}
      />
    </div>
  );
}
