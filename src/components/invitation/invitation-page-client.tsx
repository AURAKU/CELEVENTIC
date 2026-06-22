"use client";

import type { InvitationDesignConfig } from "@/types/invitation-design";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import { InvitationRenderer } from "./invitation-renderer";

interface InvitationPageClientProps {
  invitation: {
    id: string;
    name: string;
    message: string | null;
    uniqueLink: string;
  };
  event: {
    title: string;
    hostName: string;
    description: string | null;
    startDate: string;
    startDateRaw?: string;
    venueName: string | null;
    landmark: string | null;
    mapsLink: string | null;
    contactPhone: string | null;
    dressCode: string | null;
    coverImageUrl?: string | null;
  };
  designConfig?: InvitationDesignConfig | null;
  templateSlug?: string | null;
  guestId?: string;
  guestName?: string;
  qrDataUrl?: string;
}

export function InvitationPageClient({
  invitation,
  event,
  designConfig,
  templateSlug,
  guestId,
  guestName,
  qrDataUrl,
}: InvitationPageClientProps) {
  const design = designConfig ?? getDefaultDesignConfig(templateSlug ?? undefined);

  return (
    <InvitationRenderer
      invitation={invitation}
      event={event}
      design={design}
      guestId={guestId}
      guestName={guestName}
      qrDataUrl={qrDataUrl}
    />
  );
}
