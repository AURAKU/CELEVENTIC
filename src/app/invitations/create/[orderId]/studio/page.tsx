"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { MvpShell } from "@/components/invitation-mvp/mvp-shell";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { InvitationStudioHub } from "@/components/invitation-studio/invitation-studio-hub";
import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import type { MusicSelection } from "@/lib/music/music-types";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import type { InvitationDesignConfig } from "@/types/invitation-design";

export default function StudioPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [design, setDesign] = useState<InvitationDesignConfig | null>(null);
  const [musicSelection, setMusicSelection] = useState<MusicSelection | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/invitation-orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOrder(d.data);
          const template = getCatalogTemplate(d.data.templateSlug as string);
          const base =
            (d.data.designConfig as InvitationDesignConfig) ??
            getDefaultDesignConfig(template?.layoutSlug);
          setDesign(base);
          setGalleryUrls((d.data.galleryUrls as string[]) ?? []);
          const resolved = resolveInvitationMusic({
            orderSelection: d.data.musicSelection,
            legacyMusicUrl: d.data.musicPreference as string | null,
            design: base,
          });
          setMusicSelection(resolved.musicSelection);
        }
      });
  }, [orderId]);

  if (!order || !design) return <PageLoader label="Loading studio…" className="min-h-screen" />;

  const hostName =
    order.coupleName1 && order.coupleName2
      ? `${order.coupleName1} & ${order.coupleName2}`
      : (order.hostName as string) ?? "Host";

  const previewEvent = {
    title: (order.eventTitle as string) ?? "Your Event",
    hostName,
    description: (order.story as string) ?? null,
    startDate: order.eventDate ? new Date(order.eventDate as string).toLocaleDateString() : "TBD",
    startDateRaw: order.eventDate ? new Date(order.eventDate as string).toISOString() : undefined,
    venueName: (order.venueName as string) ?? null,
    landmark: (order.landmark as string) ?? null,
    mapsLink: (order.mapsLink as string) ?? null,
    contactPhone: (order.contactPhone as string) ?? null,
    dressCode: (order.dressCode as string) ?? null,
  };

  async function save() {
    setSaving(true);
    await fetch(`/api/invitation-orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designConfig: design, musicSelection, galleryUrls }),
    });
    setSaving(false);
    router.push(`/invitations/create/${orderId}/preview`);
  }

  function handleMusicChange(selection: MusicSelection | null) {
    setMusicSelection(selection);
    if (selection?.libraryTrackId) {
      setDesign((prev) =>
        prev
          ? {
              ...prev,
              experience: {
                ...prev.experience,
                defaultAudioTrackId: selection.libraryTrackId,
                experienceCustomized: true,
              },
            }
          : prev
      );
    }
  }

  return (
    <MvpShell step={4} title="Design Studio" subtitle="Templates, media, colors, fonts, reveal flow, and music">
      <InvitationStudioHub
        design={design}
        event={previewEvent}
        message={(order.story as string) ?? ""}
        eventType={(order.eventType as string) ?? undefined}
        musicSelection={musicSelection}
        onMusicChange={handleMusicChange}
        galleryUrls={galleryUrls}
        onGalleryChange={setGalleryUrls}
        onChange={setDesign}
        onSave={save}
        saving={saving}
      />
      <div className="max-w-md mx-auto mt-8 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => router.push(`/invitations/create/${orderId}/blocks`)}>
          Back
        </Button>
        <Button className="flex-1 bg-[#0B8A83]" onClick={() => void save()} disabled={saving}>
          Continue
        </Button>
      </div>
    </MvpShell>
  );
}
