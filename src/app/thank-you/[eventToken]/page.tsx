"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";
import { CeleventicIntroExperience } from "@/components/invitations/CeleventicIntroExperience";
import { ThankYouPublicView } from "@/components/thank-you/thank-you-public-view";
import type { ThankYouTemplate } from "@/lib/thank-you/templates";
import type { ResolvedThankYouDesign } from "@/lib/thank-you/types";
import type { ThankYouGuestbookConfig, ThankYouSectionConfig, ThankYouSharingConfig } from "@/lib/thank-you/types";

type PublicThankYouPayload = {
  page: {
    id?: string;
    eventId?: string;
    title: string | null;
    message: string | null;
    eyebrow?: string | null;
    subtitle?: string | null;
    closingMessage?: string | null;
    signatureLine?: string | null;
    hostNames?: string | null;
    eventHashtag?: string | null;
    footerText?: string | null;
    flyerUrl: string | null;
    hostPhotoUrl: string | null;
    heroImageUrl?: string | null;
    signatureImageUrl?: string | null;
    audioUrl: string | null;
    shareToken?: string | null;
    template: ThankYouTemplate;
    design?: ResolvedThankYouDesign;
    sectionConfig?: ThankYouSectionConfig;
    guestbookConfig?: ThankYouGuestbookConfig;
    sharingConfig?: ThankYouSharingConfig;
    featuredMemories?: Array<{
      id: string;
      mediaUrl: string;
      mediaType: string;
      caption?: string | null;
      uploaderName?: string | null;
      thumbnailUrl?: string | null;
    }>;
  };
  event: {
    title: string;
    hostName: string;
    logoUrl?: string | null;
    startDate?: string | Date | null;
    slug?: string;
  };
  uploadUrl?: string;
  memoriesUrl?: string;
};

export default function ThankYouByTokenPage() {
  const params = useParams();
  const token = params.eventToken as string;
  const [phase, setPhase] = useState<"intro" | "content">("intro");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicThankYouPayload | null>(null);

  useEffect(() => {
    fetch(`/api/public/thank-you/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <PageLoader />;
  if (!data) return <p className="py-20 text-center text-slate-500">Thank-you page not found.</p>;

  const qrImageUrl = data.uploadUrl
    ? `/api/qr/image?data=${encodeURIComponent(data.uploadUrl)}&size=256`
    : undefined;

  if (phase === "intro") {
    return (
      <CeleventicIntroExperience
        logoUrl={data.event.logoUrl ?? undefined}
        onComplete={() => setPhase("content")}
        themeColors={{
          accent: data.page.design?.accentColor ?? data.page.template.accentColor,
        }}
      />
    );
  }

  return (
    <ThankYouPublicView
      title={data.page.title}
      message={data.page.message}
      eyebrow={data.page.eyebrow}
      subtitle={data.page.subtitle}
      closingMessage={data.page.closingMessage}
      signatureLine={data.page.signatureLine}
      hostNames={data.page.hostNames}
      eventHashtag={data.page.eventHashtag}
      footerText={data.page.footerText}
      hostName={data.event.hostName}
      eventTitle={data.event.title}
      startDate={data.event.startDate}
      logoUrl={data.event.logoUrl}
      flyerUrl={data.page.flyerUrl}
      hostPhotoUrl={data.page.hostPhotoUrl}
      heroImageUrl={data.page.heroImageUrl}
      signatureImageUrl={data.page.signatureImageUrl}
      audioUrl={data.page.audioUrl}
      template={data.page.template}
      design={data.page.design}
      sectionConfig={data.page.sectionConfig}
      guestbookConfig={data.page.guestbookConfig}
      sharingConfig={data.page.sharingConfig}
      featuredMemories={data.page.featuredMemories}
      eventId={data.page.eventId}
      shareToken={data.page.shareToken ?? token}
      uploadUrl={data.uploadUrl}
      memoriesUrl={data.memoriesUrl}
      qrImageUrl={qrImageUrl}
    />
  );
}
