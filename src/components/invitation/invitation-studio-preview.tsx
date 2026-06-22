"use client";

import type { InvitationDesignConfig, InvitationEventData } from "@/types/invitation-design";
import { InvitationRenderer } from "./invitation-renderer";

interface InvitationStudioPreviewProps {
  design: InvitationDesignConfig;
  event: Partial<InvitationEventData>;
  message: string;
  invitationName: string;
}

export function InvitationStudioPreview({ design, event, message, invitationName }: InvitationStudioPreviewProps) {
  const sampleEvent: InvitationEventData = {
    title: event.title ?? "Olivia & Yanis Wedding",
    hostName: event.hostName ?? "Olivia Wilson & Yanis Petros",
    description: event.description ?? null,
    startDate: event.startDate ?? "Saturday, 10 September 2026 at 2:30 pm",
    startDateRaw: event.startDateRaw ?? new Date().toISOString(),
    venueName: event.venueName ?? "Royal Palm Events Centre",
    landmark: event.landmark ?? "East Legon, Accra",
    mapsLink: event.mapsLink ?? null,
    contactPhone: event.contactPhone ?? "+233 25 766 0734",
    dressCode: event.dressCode ?? null,
    coverImageUrl: event.coverImageUrl ?? null,
  };

  return (
    <div className="relative rounded-xl border overflow-hidden bg-slate-100 shadow-inner">
      <div className="absolute top-2 right-2 z-20 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
        Live Preview
      </div>
      <div className="max-h-[600px] overflow-y-auto scale-[0.85] origin-top sm:scale-90">
        <InvitationRenderer
          invitation={{ id: "preview", name: invitationName || "Preview", message: message || null, uniqueLink: "preview" }}
          event={sampleEvent}
          design={design}
        />
      </div>
    </div>
  );
}
