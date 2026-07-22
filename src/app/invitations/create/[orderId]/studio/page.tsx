"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { MvpShell } from "@/components/invitation-mvp/mvp-shell";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import {
  InvitationStudioHub,
  type InvitationStudioHubHandle,
} from "@/components/invitation-studio/invitation-studio-hub";
import { getCatalogTemplate } from "@/lib/invitation-mvp/catalogue";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import type { MusicSelection } from "@/lib/music/music-types";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { useStudioHistory } from "@/hooks/use-studio-history";
import { useStudioAutosave } from "@/hooks/use-studio-autosave";
import { hasFullPackageAccess } from "@/lib/access/package-access";

const UNLOCKED = new Set([
  "PAID",
  "IN_PRODUCTION",
  "APPROVED",
  "PUBLISHED",
  "REVISION_REQUESTED",
]);

export default function StudioPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const orderId = params.orderId as string;
  const hubRef = useRef<InvitationStudioHubHandle>(null);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [saving, setSaving] = useState(false);

  const history = useStudioHistory(null, orderId);
  const snapshot = history.present;

  useEffect(() => {
    let cancelled = false;

    async function bootstrapOrder(data: Record<string, unknown>) {
      if (cancelled) return;
      setOrder(data);
      setGateMessage(null);
      const template = getCatalogTemplate(data.templateSlug as string);
      const base =
        (data.designConfig as InvitationDesignConfig) ??
        getDefaultDesignConfig((data.templateSlug as string) ?? template?.slug);
      const gallery = (data.galleryUrls as string[]) ?? [];
      const resolved = resolveInvitationMusic({
        orderSelection: data.musicSelection,
        legacyMusicUrl: data.musicPreference as string | null,
        design: base,
        catalogSlug: (data.templateSlug as string) ?? template?.slug ?? null,
      });
      history.reset({
        design: base,
        musicSelection: resolved.musicSelection,
        galleryUrls: gallery,
      });
      setBootstrapped(true);
    }

    async function load() {
      const res = await fetch(`/api/invitation-orders/${orderId}`);
      const d = await res.json();
      if (!d.success || cancelled) return;
      const status = d.data.status as string;

      if (!UNLOCKED.has(status)) {
        if (hasFullPackageAccess(session?.user?.role)) {
          const unlock = await fetch(`/api/invitation-orders/${orderId}/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acceptTerms: true, portfolioConsent: false }),
          });
          const unlockData = await unlock.json();
          if (unlockData.success && unlockData.data?.unlockStudio) {
            const refreshed = await fetch(`/api/invitation-orders/${orderId}`).then((r) => r.json());
            if (refreshed.success) {
              await bootstrapOrder(refreshed.data);
              return;
            }
          }
        }
        setGateMessage("Complete checkout to unlock Design Studio.");
        setOrder(d.data);
        return;
      }

      await bootstrapOrder(d.data);
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per order/session role
  }, [orderId, session?.user?.role]);

  const persist = useCallback(
    async (value: NonNullable<typeof snapshot>) => {
      const res = await fetch(`/api/invitation-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designConfig: value.design,
          musicSelection: value.musicSelection,
          galleryUrls: value.galleryUrls,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
    },
    [orderId]
  );

  const autosave = useStudioAutosave({
    value: snapshot,
    enabled: bootstrapped && Boolean(snapshot),
    debounceMs: 1800,
    save: async (value) => {
      if (!value) return;
      await persist(value);
    },
  });

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (autosave.status === "dirty" || autosave.status === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [autosave.status]);

  const hostName = useMemo(() => {
    if (!order) return "Host";
    return order.coupleName1 && order.coupleName2
      ? `${order.coupleName1} & ${order.coupleName2}`
      : ((order.hostName as string) ?? "Host");
  }, [order]);

  const previewEvent = useMemo(() => {
    if (!order) {
      return {
        title: "Your Event",
        hostName: "Host",
        startDate: "TBD",
      };
    }
    return {
      title: (order.eventTitle as string) ?? "Your Event",
      hostName,
      description: (order.story as string) ?? null,
      startDate: order.eventDate
        ? new Date(order.eventDate as string).toLocaleDateString()
        : "TBD",
      startDateRaw: order.eventDate
        ? new Date(order.eventDate as string).toISOString()
        : undefined,
      venueName: (order.venueName as string) ?? null,
      landmark: (order.landmark as string) ?? null,
      mapsLink: (order.mapsLink as string) ?? null,
      contactPhone: (order.contactPhone as string) ?? null,
      dressCode: (order.dressCode as string) ?? null,
    };
  }, [order, hostName]);

  async function saveAndGoPreview() {
    if (!snapshot) return;
    setSaving(true);
    try {
      await persist(snapshot);
      autosave.markBaseline(snapshot);
      router.push(`/invitations/create/${orderId}/preview`);
    } finally {
      setSaving(false);
    }
  }

  function handleDesignChange(design: InvitationDesignConfig) {
    if (!snapshot) return;
    history.commit({ ...snapshot, design });
  }

  function handleMusicChange(selection: MusicSelection | null) {
    if (!snapshot) return;
    let nextDesign = snapshot.design;
    if (selection?.libraryTrackId) {
      nextDesign = {
        ...snapshot.design,
        experience: {
          ...snapshot.design.experience,
          defaultAudioTrackId: selection.libraryTrackId,
          experienceCustomized: true,
        },
      };
    }
    history.commit({
      ...snapshot,
      design: nextDesign,
      musicSelection: selection,
    });
  }

  function handleGalleryChange(urls: string[]) {
    if (!snapshot) return;
    history.commit({ ...snapshot, galleryUrls: urls });
  }

  if (gateMessage) {
    return (
      <MvpShell step={5} title="Design Studio" subtitle="Locked until checkout">
        <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-slate-700">{gateMessage}</p>
          <Button
            className="mt-6 bg-[#0B8A83]"
            onClick={() => router.push(`/invitations/create/${orderId}/checkout`)}
          >
            Go to Checkout
          </Button>
        </div>
      </MvpShell>
    );
  }

  if (!order || !snapshot || !bootstrapped) {
    return <PageLoader label="Loading studio…" className="min-h-screen" />;
  }

  const catalogSlug = (order.templateSlug as string) ?? null;

  return (
    <MvpShell
      step={5}
      variant="workspace"
      title="Invitation Studio"
      subtitle="Design the guest experience — live preview matches publish"
    >
      <InvitationStudioHub
        ref={hubRef}
        design={snapshot.design}
        event={previewEvent}
        message={(order.story as string) ?? ""}
        eventType={(order.eventType as string) ?? undefined}
        musicSelection={snapshot.musicSelection}
        onMusicChange={handleMusicChange}
        galleryUrls={snapshot.galleryUrls}
        onGalleryChange={handleGalleryChange}
        onChange={handleDesignChange}
        onSave={saveAndGoPreview}
        saving={saving}
        orderId={orderId}
        catalogSlug={catalogSlug}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        saveStatus={autosave.status}
        lastSavedAt={autosave.lastSavedAt}
        onSaveNow={() => void autosave.saveNow()}
        onRequestPreview={() => void saveAndGoPreview()}
        versions={history.versions}
        onSaveVersion={history.saveNamedVersion}
        onRestoreVersion={history.restoreVersion}
        publishContext={{
          design: snapshot.design,
          eventTitle: previewEvent.title,
          eventDate: previewEvent.startDateRaw ?? previewEvent.startDate,
          hostName: previewEvent.hostName,
          galleryUrls: snapshot.galleryUrls,
          musicSelection: snapshot.musicSelection,
          mapsLink: previewEvent.mapsLink,
          venueName: previewEvent.venueName,
        }}
      />
      <div className="mx-auto mt-3 flex max-w-md gap-3 px-1">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push(`/invitations/create/${orderId}/checkout`)}
        >
          Back
        </Button>
        <Button
          className="flex-1 bg-[#0B8A83]"
          onClick={() => hubRef.current?.openPublishChecklist()}
          disabled={saving}
        >
          Preview & Publish
        </Button>
      </div>
    </MvpShell>
  );
}
