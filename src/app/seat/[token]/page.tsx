"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, Download, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { SeatingTableVisual } from "@/components/seating/seating-table-visual";
import { GuestSeatingCard } from "@/components/seating/guest-seating-card";
import {
  tableDisplayName,
  type GuestAssignmentView,
  type SeatingTableConfig,
} from "@/lib/seating/seating-types";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { DEFAULT_STUDIO_SETTINGS, type StudioSettings } from "@/lib/seating/studio-types";

interface SeatLookupData {
  guest: { id: string; name: string; status?: string };
  event: {
    id: string;
    title: string;
    startDate: string;
    venueName: string | null;
  };
  assignment: {
    tableNumber: string;
    seatLabel: string | null;
    zone: string | null;
    notes: string | null;
    planName: string;
    admitted?: boolean;
  } | null;
  ceremonyAssignment?: {
    rowLabel: string;
    seatLabel: string | null;
    zone: string | null;
    planName: string;
  } | null;
  table: {
    label: string;
    shape: string;
    seatCount: number;
    zone?: string;
  } | null;
  planStatus?: "draft" | "published";
  settings?: Partial<StudioSettings>;
  party?: {
    allowance: number;
    admittedCount: number;
    members: Array<{ id: string; name: string; seatLabel?: string | null; admitted?: boolean }>;
  };
}

const FALLBACK_DESIGN: InvitationDesignConfig = {
  layout: "classic-gold",
  colors: {
    primary: "#0B8A83",
    secondary: "#D4A63A",
    accent: "#0B8A83",
    background: "#FFFFFF",
    text: "#0F172A",
  },
  fonts: {
    heading: "Cinzel",
    body: "Cormorant Garamond",
  },
};

export default function SeatLookupPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<SeatLookupData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/seating/${token}`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setData(payload.data);
        else setError(payload.error || "Not found");
      })
      .catch(() => setError("Could not load seating"));
  }, [token]);

  const tableConfig: SeatingTableConfig | null = useMemo(() => {
    if (!data?.table) return null;
    return {
      id: "guest-table",
      label: data.table.label,
      shape: (data.table.shape as SeatingTableConfig["shape"]) ?? "round",
      seatCount: data.table.seatCount,
      zone: data.table.zone,
    };
  }, [data?.table]);

  const guestAssignment: GuestAssignmentView[] = useMemo(() => {
    if (!data?.assignment) return [];
    return [
      {
        guestId: data.guest.id,
        guestName: data.guest.name,
        tableNumber: data.assignment.tableNumber,
        seatLabel: data.assignment.seatLabel ?? undefined,
        zone: data.assignment.zone ?? undefined,
        notes: data.assignment.notes ?? undefined,
        admitted: data.assignment.admitted,
        guestStatus: data.guest.status,
      },
    ];
  }, [data]);

  const highlightSeat = data?.assignment?.seatLabel
    ? parseInt(data.assignment.seatLabel, 10) || undefined
    : undefined;

  const settings = {
    ...DEFAULT_STUDIO_SETTINGS,
    ...(data?.settings as Partial<StudioSettings> | undefined),
  };
  const canDownloadMap =
    Boolean(data) &&
    settings.showMapToGuests &&
    data?.planStatus !== "draft" &&
    (Boolean(data?.ceremonyAssignment) || Boolean(data?.assignment));

  if (!data && !error) {
    return <PageLoader label="Finding your seat…" className="min-h-app-viewport" />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-app-viewport items-center justify-center bg-[#0F172A] p-6 text-white">
        <p className="text-center">{error || "Guest not found"}</p>
      </div>
    );
  }

  const { guest, event, assignment } = data;

  return (
    <div className="flex min-h-app-viewport flex-col items-center justify-center bg-gradient-to-b from-[#0F172A] via-[#0B3D3A] to-[#0F172A] p-6 text-white">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#D4A63A]">
          <Sparkles className="h-4 w-4" /> Celeventic Seating
        </div>
        <h1 className="font-display text-2xl">{guest.name}</h1>
        <p className="text-sm text-white/60">{event.title}</p>
        <div className="flex items-center justify-center gap-2 text-sm text-white/50">
          <Calendar className="h-4 w-4" />
          {formatDate(event.startDate)}
          {event.venueName && <span> · {event.venueName}</span>}
        </div>

        <GuestSeatingCard
          design={FALLBACK_DESIGN}
          guestName={guest.name}
          tableNumber={assignment?.tableNumber}
          seatLabel={assignment?.seatLabel}
          zone={assignment?.zone}
          ceremonyRowLabel={data.ceremonyAssignment?.rowLabel}
          ceremonySeatLabel={data.ceremonyAssignment?.seatLabel}
          ceremonyZone={data.ceremonyAssignment?.zone}
          receptionMode={
            (data.settings as { receptionMode?: "TABLE_ONLY" | "TABLE_AND_CHAIR" } | undefined)
              ?.receptionMode
          }
          guestStatus={guest.status}
          admittedCount={assignment?.admitted ? 1 : data.party?.admittedCount ?? 0}
          allowance={data.party?.allowance}
          members={data.party?.members}
          planStatus={data.planStatus ?? "published"}
          settings={data.settings}
          eventStartDate={event.startDate}
          className="text-left"
        />

        {canDownloadMap && (
          <div className="flex flex-wrap justify-center gap-2">
            {data.ceremonyAssignment && (
              <Button
                asChild
                variant="outline"
                className="border-[#D4A63A]/40 bg-white/5 text-white hover:bg-white/10"
              >
                <a href={`/api/seating/${token}/map?plan=CEREMONY`} download>
                  <Download className="h-4 w-4" /> Ceremony map
                </a>
              </Button>
            )}
            {assignment && (
              <Button
                asChild
                variant="outline"
                className="border-[#D4A63A]/40 bg-white/5 text-white hover:bg-white/10"
              >
                <a href={`/api/seating/${token}/map?plan=RECEPTION`} download>
                  <Download className="h-4 w-4" /> Reception map
                </a>
              </Button>
            )}
          </div>
        )}

        {assignment && tableConfig && (
          <div className="rounded-2xl border border-[#D4A63A]/30 bg-white/5 p-6 backdrop-blur">
            <p className="mb-4 text-xs uppercase tracking-widest text-white/50">
              {tableDisplayName(assignment.tableNumber)} map
            </p>
            <div className="flex justify-center [&_*]:text-slate-900 [&_.text-slate-400]:text-slate-500 [&_p]:text-slate-900">
              <SeatingTableVisual
                table={tableConfig}
                assignments={guestAssignment}
                highlightSeat={highlightSeat}
                interactive={false}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-white/40">
          {canDownloadMap
            ? "Download the venue map to navigate on the day — or save this page"
            : "Save this page or scan at the venue"}
        </p>
      </div>
    </div>
  );
}
