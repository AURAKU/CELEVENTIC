import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVendorTeamPassByPublicToken } from "@/services/vendor-pass/vendor-team-pass.service";
import { formatAdmissionCode } from "@/lib/admission/pass-code";
import { VendorPassCard } from "@/components/vendor-pass/vendor-pass-card";
import { VendorPassPublicActions } from "@/components/vendor-pass/vendor-pass-public-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const result = await getVendorTeamPassByPublicToken(token);
  if (!result || result.invalid) return { title: "Vendor Pass", robots: { index: false } };
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
  const { token } = await params;
  const result = await getVendorTeamPassByPublicToken(token);
  if (!result) notFound();

  if (result.invalid) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Vendor Pass</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{result.title}</h1>
        <p className="mt-2 text-slate-600">{result.vendorName}</p>
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          This pass is {result.status.toLowerCase()} and cannot be used for entry.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:py-12 print:max-w-none print:px-0 print:py-0">
      <VendorPassPublicActions
        title={result.pass.title}
        vendorName={result.pass.vendorName}
        eventTitle={result.pass.eventTitle}
        admissionCode={result.pass.admissionCode}
      />
      <VendorPassCard
        title={result.pass.title}
        vendorName={result.pass.vendorName}
        eventTitle={result.pass.eventTitle}
        passMode={result.pass.passMode}
        passType={result.pass.passType}
        teamCapacity={result.pass.teamCapacity}
        admittedCount={result.pass.admittedCount}
        admissionCode={formatAdmissionCode(result.pass.admissionCode)}
        accessZones={result.pass.accessZones}
        validUntil={result.pass.validUntil}
        contactName={result.pass.contactName}
        token={result.pass.token}
        status={result.pass.status}
      />
    </main>
  );
}
