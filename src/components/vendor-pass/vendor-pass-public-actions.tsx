"use client";

export function VendorPassPublicActions({
  title,
  vendorName,
  eventTitle,
  admissionCode,
}: {
  title: string;
  vendorName: string;
  eventTitle?: string | null;
  admissionCode: string;
}) {
  const shareText = `${title}\n${vendorName}\nAccess code ${admissionCode}`;
  const mailBody = `Your vendor pass for ${eventTitle ?? "the event"}.\nAccess code: ${admissionCode}\n`;

  return (
    <div className="mb-4 flex flex-wrap gap-2 print:hidden">
      <a
        className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium"
        href={`mailto:?subject=${encodeURIComponent(`${title} Vendor Pass`)}&body=${encodeURIComponent(mailBody)}`}
      >
        Email Pass
      </a>
      <a
        className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium"
        href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noreferrer"
      >
        Share via WhatsApp
      </a>
      <button
        type="button"
        className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium"
        onClick={() => window.print()}
      >
        Print / PDF
      </button>
      <button
        type="button"
        className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium"
        onClick={() => void navigator.clipboard.writeText(window.location.href)}
      >
        Copy Secure Link
      </button>
    </div>
  );
}
