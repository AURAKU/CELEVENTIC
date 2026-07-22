"use client";

import { InvitationStudioPreview } from "@/components/invitation/invitation-studio-preview";
import { cn } from "@/lib/utils";
import type { StudioDevice } from "@/components/invitation-studio/studio-toolbar";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import type { MusicSelection } from "@/lib/music/music-types";
import { SNAP_GUIDES, type SnapGuideId } from "@/lib/invitation-studio/studio-layers";

interface StudioCanvasProps {
  device: StudioDevice;
  design: InvitationDesignConfig;
  event: {
    title: string;
    hostName: string;
    description?: string | null;
    startDate: string;
    startDateRaw?: string;
    venueName?: string | null;
    landmark?: string | null;
    mapsLink?: string | null;
    contactPhone?: string | null;
    dressCode?: string | null;
  };
  message?: string;
  musicSelection?: MusicSelection | null;
  galleryUrls?: string[];
  catalogSlug?: string | null;
}

const DEVICE_FRAME: Record<
  StudioDevice,
  { maxW: string; label: string; radius: string; bezel: string }
> = {
  mobile: {
    maxW: "max-w-[390px]",
    label: "iPhone frame",
    radius: "rounded-[2rem]",
    bezel: "p-2 bg-slate-900 shadow-2xl",
  },
  tablet: {
    maxW: "max-w-[720px]",
    label: "Tablet frame",
    radius: "rounded-2xl",
    bezel: "p-2.5 bg-slate-800 shadow-2xl",
  },
  desktop: {
    maxW: "max-w-3xl",
    label: "Desktop",
    radius: "rounded-xl",
    bezel: "p-1 bg-slate-700/80 shadow-xl",
  },
};

function SnapGuideOverlay({ guideId }: { guideId?: string | null }) {
  if (!guideId || guideId === "none") return null;
  const guide = SNAP_GUIDES.find((g) => g.id === (guideId as SnapGuideId));
  if (!guide) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30" aria-hidden>
      <div
        className="absolute left-0 right-0 border-t border-dashed border-[#D4A63A]/70"
        style={{ top: `${guide.y}%` }}
      />
      <div
        className="absolute top-0 bottom-0 border-l border-dashed border-[#D4A63A]/70"
        style={{ left: `${guide.x}%` }}
      />
      <div
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4A63A] shadow"
        style={{ left: `${guide.x}%`, top: `${guide.y}%` }}
      />
    </div>
  );
}

export function StudioCanvas({
  device,
  design,
  event,
  message,
  musicSelection,
  galleryUrls,
  catalogSlug,
}: StudioCanvasProps) {
  const frame = DEVICE_FRAME[device];
  const snapGuideId = design.experience?.snapGuideId;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Soft studio atmosphere — not a flat fill */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(11,138,131,0.08),transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(212,166,58,0.1),transparent_45%),linear-gradient(160deg,#0f172a_0%,#1e293b_40%,#0f172a_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0V0zm39 0h1v40h-1V0z'/%3E%3Cpath d='M0 0h40v1H0V0zm0 39h40v1H0v-1z'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-[1] flex shrink-0 items-center justify-center gap-2 px-4 pt-3">
        <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium tracking-wide text-white/80 backdrop-blur-sm">
          Live canvas · {frame.label} · same renderer as published invite
        </span>
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-6">
        <div
          className={cn(
            "relative w-full transition-all duration-300 ease-out",
            frame.maxW,
            frame.bezel,
            frame.radius
          )}
        >
          <div className={cn("relative overflow-hidden bg-black", frame.radius)}>
            {device === "mobile" && (
              <div className="mx-auto mb-1 mt-1 h-1 w-16 rounded-full bg-white/20" aria-hidden />
            )}
            <InvitationStudioPreview
              design={design}
              event={event}
              message={message ?? ""}
              invitationName={event.title}
              musicSelection={musicSelection}
              galleryUrls={galleryUrls}
              catalogSlug={catalogSlug}
            />
            <SnapGuideOverlay guideId={snapGuideId} />
            <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-30 flex justify-center">
              <span className="rounded-full bg-black/60 px-2.5 py-1 text-[9px] font-medium tracking-wide text-white/90 backdrop-blur-sm">
                Preview-safe · RSVP & payments disabled
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
