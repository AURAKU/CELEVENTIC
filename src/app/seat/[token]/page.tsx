"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MapPin, Armchair, Sparkles, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PageLoader } from "@/components/ui/page-loader";

interface SeatLookupData {
  guest: { id: string; name: string };
  event: { id: string; title: string; startDate: string; venueName: string | null };
  assignment: {
    tableNumber: string;
    seatLabel: string | null;
    zone: string | null;
    notes: string | null;
    planName: string;
  } | null;
}

export default function SeatLookupPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<SeatLookupData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/seating/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setError(d.error || "Not found");
      })
      .catch(() => setError("Could not load seating"));
  }, [token]);

  if (!data && !error) return <PageLoader label="Finding your seat…" className="min-h-screen" />;

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white p-6">
        <p className="text-center">{error || "Guest not found"}</p>
      </div>
    );
  }

  const { guest, event, assignment } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] via-[#0B3D3A] to-[#0F172A] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex items-center gap-2 text-[#D4A63A] text-xs tracking-widest uppercase">
          <Sparkles className="h-4 w-4" /> Celeventic Seating
        </div>
        <h1 className="font-display text-2xl">{guest.name}</h1>
        <p className="text-white/60 text-sm">{event.title}</p>
        <div className="flex items-center justify-center gap-2 text-sm text-white/50">
          <Calendar className="h-4 w-4" />
          {formatDate(event.startDate)}
          {event.venueName && <span> · {event.venueName}</span>}
        </div>

        {assignment ? (
          <div className="rounded-2xl border border-[#D4A63A]/30 bg-white/5 backdrop-blur p-8 space-y-4 inv-fade-in">
            <Armchair className="h-10 w-10 mx-auto text-[#D4A63A]" />
            <div>
              <p className="text-xs uppercase tracking-widest text-white/50">Your table</p>
              <p className="font-display text-4xl text-[#D4A63A] mt-1">{assignment.tableNumber}</p>
            </div>
            {assignment.seatLabel && (
              <p className="text-lg text-white/80">Seat {assignment.seatLabel}</p>
            )}
            {assignment.zone && (
              <p className="text-sm text-white/60 flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4" /> {assignment.zone}
              </p>
            )}
            {assignment.notes && <p className="text-sm text-white/50 italic">{assignment.notes}</p>}
            <p className="text-[10px] text-white/30">{assignment.planName}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <p className="text-white/60">Your seat assignment will appear here once the host finalizes seating.</p>
          </div>
        )}

        <p className="text-xs text-white/40 mb-3">Save this page or scan at the venue</p>
        <p className="text-sm text-[#D4A63A] font-mono break-all">{typeof window !== "undefined" ? window.location.href : `/seat/${token}`}</p>
      </div>
    </div>
  );
}
