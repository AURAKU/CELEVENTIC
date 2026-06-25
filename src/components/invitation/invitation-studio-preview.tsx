"use client";

import { InvitationRenderer } from "./invitation-renderer";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import type { InvitationDesignConfig, InvitationEventData } from "@/types/invitation-design";

interface InvitationStudioPreviewProps {
  design: InvitationDesignConfig;
  event: Partial<InvitationEventData>;
  message: string;
  invitationName: string;
}

export function InvitationStudioPreview({ design, event, message, invitationName }: InvitationStudioPreviewProps) {
  const fallback = buildLivePreviewProps(design.layout ?? "classic-gold");
  const sampleEvent: InvitationEventData = {
    ...fallback.event,
    ...event,
    title: event.title ?? fallback.event.title,
    hostName: event.hostName ?? fallback.event.hostName,
    startDate: event.startDate ?? fallback.event.startDate,
    startDateRaw: event.startDateRaw ?? fallback.event.startDateRaw,
    venueName: event.venueName ?? fallback.event.venueName,
    landmark: event.landmark ?? fallback.event.landmark,
  };

  return (
    <div className="relative rounded-xl border overflow-hidden bg-slate-100 shadow-inner">
      <div className="absolute top-2 right-2 z-20 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
        Live Preview
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        <InvitationRenderer
          invitation={{ id: "preview", name: invitationName || "Preview", message: message || null, uniqueLink: "preview" }}
          event={sampleEvent}
          design={design}
        />
      </div>
    </div>
  );
}
