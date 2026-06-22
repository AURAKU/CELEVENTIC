"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";
import { CeleventicIntroExperience } from "@/components/invitations/CeleventicIntroExperience";
import { ThankYouPublicView } from "@/components/memory/public-memories-gallery";
import type { ThankYouTemplate } from "@/lib/thank-you/templates";

export default function ThankYouByTokenPage() {
  const params = useParams();
  const token = params.eventToken as string;
  const [phase, setPhase] = useState<"intro" | "content">("intro");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    page: {
      title: string | null;
      message: string | null;
      flyerUrl: string | null;
      hostPhotoUrl: string | null;
      audioUrl: string | null;
      template: ThankYouTemplate;
    };
    event: { title: string; hostName: string; logoUrl?: string | null };
    uploadUrl?: string;
    memoriesUrl?: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/public/thank-you/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-center py-20 text-slate-500">Thank-you page not found.</p>;

  const qrImageUrl = data.uploadUrl
    ? `/api/qr/image?data=${encodeURIComponent(data.uploadUrl)}&size=256`
    : undefined;

  if (phase === "intro") {
    return (
      <CeleventicIntroExperience
        logoUrl={data.event.logoUrl ?? undefined}
        onComplete={() => setPhase("content")}
        themeColors={{ accent: data.page.template.accentColor }}
      />
    );
  }

  return (
    <ThankYouPublicView
      title={data.page.title}
      message={data.page.message}
      hostName={data.event.hostName}
      eventTitle={data.event.title}
      flyerUrl={data.page.flyerUrl}
      hostPhotoUrl={data.page.hostPhotoUrl}
      audioUrl={data.page.audioUrl}
      template={data.page.template}
      uploadUrl={data.uploadUrl}
      memoriesUrl={data.memoriesUrl}
      qrImageUrl={qrImageUrl}
    />
  );
}
