"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, Images, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";
import { TM_PALETTE } from "@/components/invitation/templates/traditional-marriage-palette";

export type MemoryAlbumCardProps = {
  eventTitle: string;
  uploadUrl?: string | null;
  albumUrl?: string | null;
  uploadQrImageUrl?: string | null;
  className?: string;
  /** Compact chip-style for invitation template docks */
  compact?: boolean;
  /** Traditional Marriage linen / bronze editorial treatment */
  editorial?: boolean;
};

/**
 * Guest-facing Memory Vault / Album card.
 * Guests scan the QR or tap below to upload; the shared album stays open for the event.
 */
export function InvitationMemoryAlbumCard({
  eventTitle,
  uploadUrl,
  albumUrl,
  uploadQrImageUrl,
  className,
  compact = false,
  editorial = false,
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
        <p className="text-[11px] tracking-[0.28em] uppercase text-[#8B6914] mb-1 flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Memory Vault
        </p>
        <p className="text-sm font-medium text-[#5C3D2E] mb-1">
          Share the event through your eyes.
        </p>
        <p className="text-sm text-[#5C3D2E]/80 leading-relaxed">
          Scan the QR code at the event or tap below to upload photos and videos as the celebration
          happens.
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

  if (editorial) {
    return (
      <div
        className={cn(
          "tm-section-rise relative overflow-hidden rounded-sm border p-6 sm:p-7 text-center",
          className
        )}
        style={{
          borderColor: TM_PALETTE.border,
          background: `linear-gradient(168deg, ${TM_PALETTE.linen} 0%, ${TM_PALETTE.peach} 48%, ${TM_PALETTE.peachDeep} 100%)`,
          boxShadow: "0 22px 48px -28px rgba(92,61,46,0.35)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-3 rounded-sm border opacity-30"
          style={{ borderColor: `${TM_PALETTE.mustard}55` }}
          aria-hidden
        />

        <header className="relative space-y-2">
          <h2
            className="font-[family-name:var(--font-great-vibes)] text-[2.45rem] sm:text-[2.75rem] leading-none"
            style={{ color: TM_PALETTE.bronze }}
          >
            Memory Vault
          </h2>
          <p
            className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.36em] uppercase"
            style={{ color: TM_PALETTE.bronzeDeep }}
          >
            Share the event through your eyes.
          </p>
          <div
            className="tm-hairline mx-auto mt-3 h-px w-14"
            style={{ backgroundColor: `${TM_PALETTE.mustard}70` }}
            aria-hidden
          />
        </header>

        <p
          className="relative mt-5 font-[family-name:var(--font-cormorant)] text-sm leading-relaxed max-w-md mx-auto"
          style={{ color: TM_PALETTE.dress }}
        >
          Scan the QR code at the event or tap below to upload photos and videos as the celebration
          happens. Guests can view the shared album for this event and enjoy the memories together.
        </p>

        {uploadQrImageUrl && canUpload ? (
          <Link
            href={uploadUrl!}
            className="relative mt-5 inline-flex flex-col items-center gap-2 group"
            aria-label="Open album upload — take or share photos and videos"
          >
            <span
              className="rounded-sm bg-white p-2 border shadow-sm transition-colors"
              style={{ borderColor: TM_PALETTE.border }}
            >
              <Image
                src={uploadQrImageUrl}
                alt={`Album QR for ${eventTitle}`}
                width={148}
                height={148}
                className="rounded-sm"
                unoptimized
              />
            </span>
            <span
              className="text-[11px] uppercase tracking-[0.16em] font-semibold group-hover:underline"
              style={{ color: TM_PALETTE.bronzeDeep }}
            >
              Tap QR to upload photos &amp; videos
            </span>
          </Link>
        ) : uploadQrImageUrl && staticPreview ? (
          <div className="relative mt-5 inline-flex flex-col items-center gap-2">
            <span
              className="rounded-sm bg-white p-2 border shadow-sm"
              style={{ borderColor: TM_PALETTE.border }}
            >
              <Image
                src={uploadQrImageUrl}
                alt={`Album QR for ${eventTitle}`}
                width={148}
                height={148}
                className="rounded-sm"
                unoptimized
              />
            </span>
          </div>
        ) : (
          <div
            className="relative mt-5 mx-auto w-[148px] h-[148px] rounded-sm border border-dashed flex items-center justify-center text-xs px-3"
            style={{
              borderColor: `${TM_PALETTE.bronze}66`,
              backgroundColor: `${TM_PALETTE.linen}`,
              color: TM_PALETTE.bronzeDeep,
            }}
          >
            Album QR activates when this invitation is published
          </div>
        )}

        <div className="relative mt-5 flex flex-wrap justify-center gap-2">
          {canUpload && (
            <Button
              className="hover:opacity-90"
              style={{ backgroundColor: TM_PALETTE.bronzeDeep, color: TM_PALETTE.linen }}
              asChild
            >
              <Link href={uploadUrl!}>
                <Camera className="h-4 w-4 mr-2" /> Upload
              </Link>
            </Button>
          )}
          {canView && (
            <Button
              variant="outline"
              className="bg-white/70"
              style={{ borderColor: TM_PALETTE.border, color: TM_PALETTE.bronzeDeep }}
              asChild
            >
              <Link href={albumUrl!}>
                <Images className="h-4 w-4 mr-2" /> View album
              </Link>
            </Button>
          )}
        </div>

        <p
          className="relative mt-4 text-[11px] leading-relaxed"
          style={{ color: `${TM_PALETTE.bronzeDeep}99` }}
        >
          Your uploads will remain in the album unless the host removes them.
        </p>
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
      <h2 className="font-display text-lg font-bold text-[#0F172A] mb-1">Memory Vault</h2>
      <p className="text-sm font-medium text-slate-700 mb-3">
        Share the event through your eyes.
      </p>
      <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
        Scan the QR code at the event or tap below to upload photos and videos as the celebration
        happens. Guests can view the shared album for this event and enjoy the memories together.
      </p>

      {uploadQrImageUrl && canUpload ? (
        <Link
          href={uploadUrl!}
          className="mt-5 inline-flex flex-col items-center gap-2 group"
          aria-label="Open album upload — take or share photos and videos"
        >
          <span className="rounded-xl bg-white p-2 border border-slate-200 shadow-sm group-hover:border-slate-400 transition-colors">
            <Image
              src={uploadQrImageUrl}
              alt={`Album QR for ${eventTitle}`}
              width={148}
              height={148}
              className="rounded-md"
              unoptimized
            />
          </span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-600 font-semibold group-hover:underline">
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
          <Button className="bg-slate-800 hover:bg-slate-900" asChild>
            <Link href={uploadUrl!}>
              <Camera className="h-4 w-4 mr-2" /> Upload
            </Link>
          </Button>
        )}
        {canView && (
          <Button variant="outline" asChild>
            <Link href={albumUrl!}>
              <Images className="h-4 w-4 mr-2" /> View album
            </Link>
          </Button>
        )}
      </div>

      <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
        Your uploads will remain in the album unless the host removes them.
      </p>
    </div>
  );
}
