import type { Metadata } from "next";
import Link from "next/link";
import { getVendorTeamPassByPublicToken } from "@/services/vendor-pass/vendor-team-pass.service";
import { VendorPassCard } from "@/components/vendor-pass/vendor-pass-card";
import { VendorPassPublicActions } from "@/components/vendor-pass/vendor-pass-public-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function PassUnavailable({
  title = "Vendor pass not found",
  detail = "This link is invalid, expired, or was created in a different environment. Ask the organizer to open View Pass again and resend the link.",
  statusLabel,
}: {
  title?: string;
  detail?: string;
  statusLabel?: string | null;
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
        Celeventic · Vendor Pass
      </p>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">{title}</h1>
      {statusLabel ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {statusLabel}
        </p>
      ) : null}
      <p className="mt-4 text-slate-600">{detail}</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        Go to Celeventic
      </Link>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if (!token?.trim()) {
    return { title: "Vendor Pass", robots: { index: false } };
  }
  const result = await getVendorTeamPassByPublicToken(token);
  if (!result || result.invalid) {
    return { title: "Vendor Pass", robots: { index: false } };
  }
  return {
    title: `${result.pass.title} · Vendor Pass`,
    robots: { index: false, follow: false },
  };
}

export default async function VendorPassPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = rawToken?.trim() ?? "";

  if (!token) {
    return (
      <PassUnavailable
        title="Vendor pass link incomplete"
        detail="This URL is missing the pass ID. Use the full link from the organizer (View Pass / WhatsApp / Email)."
      />
    );
  }

  const result = await getVendorTeamPassByPublicToken(token);
  if (!result) {
    return (
      <PassUnavailable
        title="Vendor pass not found"
        detail="This link is invalid, revoked, or belongs to another environment (for example a local test pass opened on the live site). Ask the organizer to resend the pass from Guest CRM → Vendors."
      />
    );
  }

  if (result.invalid) {
    return (
      <PassUnavailable
        title={result.title}
        detail={`${result.vendorName}${result.eventTitle ? ` · ${result.eventTitle}` : ""}`}
        statusLabel={`This pass is ${result.status.toLowerCase()} and cannot be used for entry.`}
      />
    );
  }

  return (
    <main className="mx-auto max-w-lg bg-ivory px-4 py-8 sm:py-12 print:max-w-none print:bg-white print:px-0 print:py-0">
      <VendorPassPublicActions
        title={result.pass.title}
        vendorName={result.pass.vendorName}
        eventTitle={result.pass.eventTitle}
        admissionCode={result.pass.admissionCode}
        publicToken={result.pass.publicToken}
      />
      <VendorPassCard
        title={result.pass.title}
        vendorName={result.pass.vendorName}
        eventTitle={result.pass.eventTitle}
        passMode={result.pass.passMode}
        passType={result.pass.passType}
        categoryLabel={result.pass.categoryLabel}
        teamCapacity={result.pass.teamCapacity}
        admittedCount={result.pass.admittedCount}
        admissionCode={result.pass.admissionCode}
        accessZones={result.pass.accessZones}
        validUntil={result.pass.validUntil}
        contactName={result.pass.contactName}
        publicToken={result.pass.publicToken}
        status={result.pass.status}
      />
    </main>
  );
}
