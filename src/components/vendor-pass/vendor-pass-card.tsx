"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { formatAdmissionCode } from "@/lib/admission/pass-code";

export function VendorPassCard({
  title,
  vendorName,
  eventTitle,
  passMode,
  passType,
  teamCapacity,
  admittedCount,
  admissionCode,
  accessZones,
  validUntil,
  contactName,
  token,
  status,
}: {
  title: string;
  vendorName: string;
  eventTitle?: string | null;
  passMode: string;
  passType: string;
  teamCapacity: number;
  admittedCount?: number;
  admissionCode: string;
  accessZones: string[];
  validUntil?: string | null;
  contactName?: string | null;
  token?: string | null;
  status?: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const code = useMemo(() => formatAdmissionCode(admissionCode), [admissionCode]);

  useEffect(() => {
    if (!token) return;
    void QRCode.toDataURL(token, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 360,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [token]);

  const remaining = Math.max(0, teamCapacity - (admittedCount ?? 0));

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] print:shadow-none">
      <header className="border-b border-slate-100 bg-slate-950 px-5 py-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
          Celeventic · Vendor Pass
        </p>
        {eventTitle ? <p className="mt-2 text-sm text-slate-300">{eventTitle}</p> : null}
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-base font-medium text-slate-200">{vendorName}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal-300">
          {passMode === "INDIVIDUAL" ? "Individual Pass" : "Team Pass"} ·{" "}
          {passType.replace(/_/g, " ")}
        </p>
      </header>

      <div className="flex flex-col items-center px-5 py-6">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt={`QR for ${title}`}
            className="h-56 w-56 rounded-2xl border border-slate-200 bg-white p-2 sm:h-64 sm:w-64"
          />
        ) : (
          <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
            Preparing QR…
          </div>
        )}

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Access Code
        </p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums tracking-wider text-slate-900">
          {code}
        </p>

        <p className="mt-4 text-sm font-semibold text-slate-800">
          {passMode === "INDIVIDUAL"
            ? "1 person authorized"
            : `Team Size: ${teamCapacity} · ${admittedCount ?? 0} admitted · ${remaining} remaining`}
        </p>
        {status ? (
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{status}</p>
        ) : null}
      </div>

      <footer className="space-y-2 border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-700">
        <p>
          <span className="font-semibold text-slate-900">Access: </span>
          {accessZones.join(" · ") || "General Event Area"}
        </p>
        {validUntil ? (
          <p>
            <span className="font-semibold text-slate-900">Valid until: </span>
            {new Date(validUntil).toLocaleString()}
          </p>
        ) : null}
        {contactName ? (
          <p>
            <span className="font-semibold text-slate-900">Contact: </span>
            {contactName}
          </p>
        ) : null}
      </footer>
    </article>
  );
}
