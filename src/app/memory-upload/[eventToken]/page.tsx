"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";
import { GuestMemoryUpload } from "@/components/memory/guest-memory-upload";
import { readOrCreateClientGuestKey } from "@/lib/memory/memory-guest-identity";

export default function MemoryUploadPage() {
  const params = useParams();
  const token = params.eventToken as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    event: { title: string; hostName: string; slug: string };
    invitationLink: string | null;
    viewToken?: string;
    hasConsent?: boolean;
    theme?: { cssVars?: CSSProperties };
    settings: {
      maxPhotosPerGuest: number;
      maxVideosPerGuest: number;
      maxImageSizeMb: number;
      maxVideoSizeMb: number;
      allowAnonymousUploads: boolean;
      approvalRequired?: boolean;
      isEnabled: boolean;
      windowOpen: boolean;
    };
  } | null>(null);

  useEffect(() => {
    const guestKey = readOrCreateClientGuestKey();
    fetch(`/api/public/memory-upload/${token}?guestKey=${encodeURIComponent(guestKey)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-center py-20 text-slate-500">Upload link invalid or expired.</p>;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const memoriesUrl = data.viewToken
    ? `${baseUrl}/memory/${data.viewToken}`
    : `${baseUrl}/events/${data.event.slug}/memories`;
  const invitationUrl = data.invitationLink
    ? `${baseUrl}/invite/${data.invitationLink}`
    : `${baseUrl}/events/${data.event.slug}`;

  return (
    <div className="min-h-screen py-8 px-4" style={data.theme?.cssVars}>
      <GuestMemoryUpload
        token={token}
        eventTitle={data.event.title}
        hostName={data.event.hostName}
        maxPhotosPerGuest={data.settings.maxPhotosPerGuest}
        maxVideosPerGuest={data.settings.maxVideosPerGuest}
        maxImageSizeMb={data.settings.maxImageSizeMb}
        maxVideoSizeMb={data.settings.maxVideoSizeMb}
        allowAnonymousUploads={data.settings.allowAnonymousUploads}
        windowOpen={data.settings.windowOpen && data.settings.isEnabled}
        memoriesUrl={memoriesUrl}
        invitationUrl={invitationUrl}
        themeVars={data.theme?.cssVars}
        initialHasConsent={Boolean(data.hasConsent)}
        approvalRequired={Boolean(data.settings.approvalRequired)}
      />
    </div>
  );
}
