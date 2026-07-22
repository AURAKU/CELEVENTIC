"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, Images, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";

export type MemoryAlbumCardProps = {
  eventTitle: string;
  uploadUrl?: string | null;
  albumUrl?: string | null;
  uploadQrImageUrl?: string | null;
  className?: string;
  /** Compact chip-style for invitation template docks */
  compact?: boolean;
};

/**
 * Guest-facing Memory Vault / Album card.
 * Pre-informs guests to find the physical Album QR at the event,
 * and lets them tap the on-invite QR / buttons to open live upload or the shared album.
 */
export function InvitationMemoryAlbumCard({
  eventTitle,
  uploadUrl,
  albumUrl,
  uploadQrImageUrl,
  className,
  compact = false,
}: MemoryAlbumCardProps) {
  const staticPreview = useInvitationStaticPreview();
  const canUpload = Boolean(uploadUrl) && !staticPreview;
  const canView = Boolean(albumUrl) && !staticPreview;

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-[#E8C9B8] bg-white/85 px-4 py-4 text-center shadow-sm",
          className
        )}
      >
        <p className="text-[11px] tracking-[0.28em] uppercase text-[#8B6914] mb-2 flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Album
        </p>
        <p className="text-sm text-[#5C3D2E] leading-relaxed">
          Share your experience with us from your lens — find the Album QR at the event.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {canUpload && (
            <Button size="sm" className="bg-[#5C3D2E] hover:bg-[#4a3226]" asChild>
              <Link href={uploadUrl!}>
                <Camera className="h-3.5 w-3.5 mr-1.5" /> Upload
              </Link>
            </Button>
          )}
          {canView && (
            <Button size="sm" variant="outline" asChild>
              <Link href={albumUrl!}>
                <Images className="h-3.5 w-3.5 mr-1.5" /> View album
              </Link>
            </Button>
          )}
          {staticPreview && (
            <Button size="sm" variant="outline" disabled type="button">
              <Camera className="h-3.5 w-3.5 mr-1.5" /> Album
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 text-center shadow-sm",
        className
      )}
    >
      <div className="inline-flex items-center gap-2 rounded-full bg-[#0B8A83]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0B8A83] mb-3">
        <QrCode className="h-3.5 w-3.5" />
        Album
      </div>
      <h2 className="font-display text-lg font-bold text-[#0F172A] mb-2">Memory Vault</h2>
      <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
        Find the <span className="font-semibold text-[#0F172A]">Album</span> — share your experience
        with us from your lens. Scan the QR at the event (or tap below) to take photos &amp; videos
        live. Everyone can view the shared album for{" "}
        <span className="font-semibold text-[#0F172A]">{eventTitle}</span>. Uploads stay forever —
        only the host can remove them.
      </p>

      {uploadQrImageUrl && canUpload ? (
        <Link
          href={uploadUrl!}
          className="mt-5 inline-flex flex-col items-center gap-2 group"
          aria-label="Open Album upload — take or share photos and videos"
        >
          <span className="rounded-xl bg-white p-2 border border-slate-200 shadow-sm group-hover:border-[#0B8A83]/50 transition-colors">
            <Image
              src={uploadQrImageUrl}
              alt={`Album QR for ${eventTitle}`}
              width={148}
              height={148}
              className="rounded-md"
              unoptimized
            />
          </span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-[#0B8A83] font-semibold group-hover:underline">
            Tap QR to upload photos &amp; videos
          </span>
        </Link>
      ) : uploadQrImageUrl && staticPreview ? (
        <div className="mt-5 inline-flex flex-col items-center gap-2">
          <span className="rounded-xl bg-white p-2 border border-slate-200 shadow-sm">
            <Image
              src={uploadQrImageUrl}
              alt={`Album QR for ${eventTitle}`}
              width={148}
              height={148}
              className="rounded-md"
              unoptimized
            />
          </span>
        </div>
      ) : (
        <div className="mt-5 mx-auto w-[148px] h-[148px] rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400 px-3">
          Album QR activates when this invitation is published
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {canUpload && (
          <Button className="bg-[#0B8A83] hover:bg-[#097068]" asChild>
            <Link href={uploadUrl!}>
              <Camera className="h-4 w-4 mr-2" /> Share from your lens
            </Link>
          </Button>
        )}
        {canView && (
          <Button variant="outline" asChild>
            <Link href={albumUrl!}>
              <Images className="h-4 w-4 mr-2" /> View shared album
            </Link>
          </Button>
        )}
      </div>

      <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
        Look for the physical Album QR at the venue — same album, unique to this event.
      </p>
    </div>
  );
}
