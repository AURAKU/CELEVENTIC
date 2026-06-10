"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { MvpShell } from "@/components/invitation-mvp/mvp-shell";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { InvitationStudioPreview } from "@/components/invitation/invitation-studio-preview";
import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import type { InvitationDesignConfig } from "@/types/invitation-design";

export default function PreviewPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [view, setView] = useState<"mobile" | "desktop">("mobile");

  useEffect(() => {
    fetch(`/api/invitation-orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setOrder(d.data); });
  }, [orderId]);

  if (!order) return <PageLoader label="Building preview..." className="min-h-screen" />;

  const template = getCatalogTemplate(order.templateSlug as string);
  const design = (order.designConfig as InvitationDesignConfig) ?? getDefaultDesignConfig(template?.layoutSlug);
  const hostName =
    order.coupleName1 && order.coupleName2
      ? `${order.coupleName1} & ${order.coupleName2}`
      : (order.hostName as string) ?? "Host";

  const previewEvent = {
    title: (order.eventTitle as string) ?? "Your Event",
    hostName,
    description: (order.story as string) ?? null,
    startDate: order.eventDate ? new Date(order.eventDate as string).toLocaleDateString() : "TBD",
    venueName: (order.venueName as string) ?? null,
    landmark: (order.landmark as string) ?? null,
    mapsLink: (order.mapsLink as string) ?? null,
    contactPhone: (order.contactPhone as string) ?? null,
    dressCode: (order.dressCode as string) ?? null,
  };

  return (
    <MvpShell step={4} title="Live Preview" subtitle="Review before checkout">
      <div className="flex justify-center gap-2 mb-6">
        <Button variant={view === "mobile" ? "default" : "outline"} size="sm" onClick={() => setView("mobile")}>Mobile</Button>
        <Button variant={view === "desktop" ? "default" : "outline"} size="sm" onClick={() => setView("desktop")}>Desktop</Button>
      </div>
      <div className={`mx-auto transition-all ${view === "mobile" ? "max-w-sm" : "max-w-3xl"}`}>
        <InvitationStudioPreview
          design={design}
          event={previewEvent}
          message={(order.story as string) ?? ""}
          invitationName={(order.eventTitle as string) ?? "Preview"}
        />
      </div>
      <div className="max-w-md mx-auto mt-8">
        <Button
          className="w-full bg-[#0B8A83] hover:bg-[#097068]"
          size="lg"
          onClick={() => router.push(`/invitations/create/${orderId}/checkout`)}
        >
          Continue to Checkout
        </Button>
      </div>
    </MvpShell>
  );
}
