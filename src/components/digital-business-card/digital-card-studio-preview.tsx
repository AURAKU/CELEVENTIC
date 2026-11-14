"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PreviewSurface = "plate" | "guest";
type PreviewDevice = "phone" | "tablet" | "desktop";
type PreviewAxis = "portrait" | "landscape";

const DEVICES: { id: PreviewDevice; label: string }[] = [
  { id: "phone", label: "Phone" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

export function DigitalCardStudioPreview({
  plate,
  guest,
  stageBackground,
  status,
}: {
  plate: ReactNode;
  guest?: ReactNode;
  stageBackground?: string;
  status?: string | null;
}) {
  const [surface, setSurface] = useState<PreviewSurface>("plate");
  const [device, setDevice] = useState<PreviewDevice>("phone");
  const [axis, setAxis] = useState<PreviewAxis>("portrait");
  const landscape = device !== "desktop" && axis === "landscape";
  const width =
    device === "desktop" ? "100%" : device === "tablet" ? (landscape ? "36rem" : "22rem") : landscape ? "22.5rem" : "17.5rem";

  return (
    <div className="celecard-studio-preview-stage space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Live preview</p>
        {status ? <p className="text-[11px] font-medium text-[#0B8A83]">{status}</p> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DEVICES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setDevice(item.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              device === item.id ? "bg-[#0B8A83] text-white" : "bg-slate-100 text-slate-600"
            )}
          >
            {item.label}
          </button>
        ))}
        {device !== "desktop" ? (
          <button
            type="button"
            onClick={() => setAxis((current) => (current === "portrait" ? "landscape" : "portrait"))}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
          >
            {axis === "portrait" ? "Portrait" : "Landscape"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setSurface("plate")}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium",
            surface === "plate" ? "bg-[#0B8A83] text-white" : "bg-slate-100 text-slate-600"
          )}
        >
          Card
        </button>
        <button
          type="button"
          onClick={() => setSurface("guest")}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium",
            surface === "guest" ? "bg-[#0B8A83] text-white" : "bg-slate-100 text-slate-600"
          )}
        >
          Guest page
        </button>
      </div>
      <div
        className={cn("celecard-studio-device mx-auto overflow-hidden rounded-[1.6rem] border border-slate-200 p-3", landscape && "celecard-studio-device-wide")}
        style={{ background: stageBackground || "#e8eef4", width, maxWidth: "100%" }}
      >
        <div className="celecard-studio-device-screen min-w-0">
          {surface === "plate" ? plate : (
            <div className="space-y-3">
              {plate}
              {guest}
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        The ID-1 card stays in ratio so the QR remains scannable. There is no reverse face. Guest page shows the same plate plus published taps.
      </p>
    </div>
  );
}
