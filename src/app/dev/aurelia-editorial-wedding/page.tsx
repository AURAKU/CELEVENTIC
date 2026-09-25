import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AureliaEditorialRuntimeClient } from "./aurelia-editorial-runtime-client";
import { ensureDemoMemoryLinks } from "@/lib/memory/ensure-event-memory-links";
import { withAureliaAlbumQrCenter } from "@/lib/experience/aurelia-editorial";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aurelia Editorial Wedding · Dev preview",
  robots: { index: false, follow: false },
};

export default async function AureliaEditorialRuntimePage({
  searchParams,
}: {
  searchParams: Promise<{ skipIntro?: string; reduced?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_RUNTIME !== "1") {
    notFound();
  }
  const params = await searchParams;
  const memory = await ensureDemoMemoryLinks("Enock & Ruth").catch(() => null);
  return (
    <AureliaEditorialRuntimeClient
      skipIntro={params.skipIntro === "1"}
      reduced={params.reduced === "1"}
      memoryUploadUrl={memory?.uploadUrl ?? null}
      memoryAlbumUrl={memory?.albumUrl ?? null}
      memoryUploadQrImageUrl={withAureliaAlbumQrCenter(memory?.uploadQrImageUrl)}
      memoryEventId={memory?.eventId ?? null}
      memoryAlbumTitle={memory?.eventTitle ?? "Enock & Ruth"}
    />
  );
}
