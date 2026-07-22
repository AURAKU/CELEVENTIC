"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { MvpShell } from "@/components/invitation-mvp/mvp-shell";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { InvitationStudioPreview } from "@/components/invitation/invitation-studio-preview";
import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import type { InvitationDesignConfig } from "@/types/invitation-design";

export default function PreviewPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [view, setView] = useState<"mobile" | "desktop">("mobile");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/invitation-orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrder(d.data);
      });
  }, [orderId]);

  if (!order) return <PageLoader label="Building preview..." className="min-h-screen" />;

  const template = getCatalogTemplate(order.templateSlug as string);
  const design =
    (order.designConfig as InvitationDesignConfig) ??
    getDefaultDesignConfig((order.templateSlug as string) ?? template?.slug);
  const { musicSelection } = resolveInvitationMusic({
    orderSelection: order.musicSelection,
    legacyMusicUrl: order.musicPreference as string | null,
    design,
    catalogSlug: (order.templateSlug as string) ?? template?.slug ?? null,
  });
  const hostName =
    order.coupleName1 && order.coupleName2
      ? `${order.coupleName1} & ${order.coupleName2}`
      : ((order.hostName as string) ?? "Host");

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

  async function publish() {
    setPublishing(true);
    setError("");
    const res = await fetch(`/api/invitation-orders/${orderId}/publish`, { method: "POST" });
    const data = await res.json();
    setPublishing(false);
    if (!data.success) {
      setError(data.error || "Publish failed");
      return;
    }
    router.push(`/invitations/create/${orderId}/success?url=${encodeURIComponent(data.data.shareUrl)}`);
  }

  return (
    <MvpShell step={6} title="Live Preview" subtitle="Same renderer as your published invitation · Preview Mode">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          Preview Mode — RSVP, payments and bookings are disabled
        </span>
      </div>
      <div className="mb-6 flex justify-center gap-2">
        <Button variant={view === "mobile" ? "default" : "outline"} size="sm" onClick={() => setView("mobile")}>
          Mobile
        </Button>
        <Button variant={view === "desktop" ? "default" : "outline"} size="sm" onClick={() => setView("desktop")}>
          Desktop
        </Button>
      </div>
      <div className={`mx-auto transition-all ${view === "mobile" ? "max-w-sm" : "max-w-3xl"}`}>
        <InvitationStudioPreview
          design={design}
          event={previewEvent}
          message={(order.story as string) ?? ""}
          invitationName={(order.eventTitle as string) ?? "Preview"}
          musicSelection={musicSelection}
          galleryUrls={(order.galleryUrls as string[]) ?? []}
          catalogSlug={(order.templateSlug as string) ?? template?.slug ?? null}
        />
      </div>
      {error && (
        <p className="mx-auto mt-4 max-w-md text-center text-sm text-red-600">{error}</p>
      )}
      <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
        <Button
          className="w-full bg-[#0B8A83] hover:bg-[#097068]"
          size="lg"
          disabled={publishing}
          onClick={() => {
            if (order.shareUrl) {
              router.push(
                `/invitations/create/${orderId}/success?url=${encodeURIComponent(String(order.shareUrl))}`
              );
              return;
            }
            void publish();
          }}
        >
          {publishing ? "Publishing…" : order.shareUrl ? "Continue to Share" : "Approve & Publish"}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/invitations/create/${orderId}/studio`)}>
          Back to Studio
        </Button>
      </div>
    </MvpShell>
  );
}
