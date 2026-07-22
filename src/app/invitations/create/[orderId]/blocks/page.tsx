"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { MvpShell } from "@/components/invitation-mvp/mvp-shell";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { BlockEditor } from "@/components/invitation-blocks/block-editor";
import { useLocale } from "@/components/i18n/locale-provider";
import { FunnelSummaryBar } from "@/components/invitation-mvp/funnel-summary-bar";
import type { InvitationBlockDto, BlockRenderContext } from "@/lib/invitation-blocks/block-types";

export default function BlocksEditorPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const { t } = useLocale();
  const [blocks, setBlocks] = useState<InvitationBlockDto[]>([]);
  const [available, setAvailable] = useState<{ blockType: string; en: string; fr: string; category: string }[]>([]);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [blockRes, orderRes] = await Promise.all([
      fetch(`/api/invitation-orders/${orderId}/blocks`),
      fetch(`/api/invitation-orders/${orderId}`),
    ]);
    const blockData = await blockRes.json();
    const orderData = await orderRes.json();
    if (blockData.success) {
      setBlocks(blockData.data.blocks);
      setAvailable(blockData.data.available);
    }
    if (orderData.success) setOrder(orderData.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [orderId]);

  const context = useMemo<BlockRenderContext>(() => {
    if (!order) return { eventTitle: "", hostName: "" };
    const hostName =
      order.coupleName1 && order.coupleName2
        ? `${order.coupleName1} & ${order.coupleName2}`
        : (order.hostName as string) ?? "Host";
    return {
      eventTitle: (order.eventTitle as string) ?? "Your Event",
      hostName,
      eventDate: order.eventDate ? new Date(order.eventDate as string).toLocaleDateString() : undefined,
      eventDateRaw: order.eventDate ? new Date(order.eventDate as string).toISOString() : undefined,
      eventTime: order.eventTime as string | undefined,
      venueName: order.venueName as string | undefined,
      landmark: order.landmark as string | undefined,
      mapsLink: order.mapsLink as string | undefined,
      dressCode: order.dressCode as string | undefined,
      story: order.story as string | undefined,
      contactPhone: order.contactPhone as string | undefined,
      contactEmail: order.contactEmail as string | undefined,
      coupleName1: order.coupleName1 as string | undefined,
      coupleName2: order.coupleName2 as string | undefined,
      deceasedName: order.deceasedName as string | undefined,
    };
  }, [order]);

  if (loading) return <PageLoader label={t("common.loading")} className="min-h-screen" />;

  return (
    <MvpShell
      step={2}
      title="Choose Invitation Sections"
      subtitle="Select and customize the story sections for your invitation"
    >
      <FunnelSummaryBar
        packageSlug={(order?.packageSlug as string) ?? null}
        addonSlugs={Array.isArray(order?.addonSlugs) ? (order?.addonSlugs as string[]) : []}
      />
      <BlockEditor
        orderId={orderId}
        blocks={blocks}
        available={available}
        context={context}
        onChange={load}
      />
      <div className="max-w-md mx-auto mt-10 pb-16">
        <Button
          className="w-full bg-[#0B8A83] hover:bg-[#097068]"
          size="lg"
          onClick={() => router.push(`/invitations/create/${orderId}/addons`)}
        >
          Continue to optional extras →
        </Button>
      </div>
    </MvpShell>
  );
}
