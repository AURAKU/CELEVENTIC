import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRegistrationPage } from "@/services/guest-import/general-pass.service";
import { JoinForm } from "./join-form";
import { formatDate } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

/**
 * Open registration (General Pass Method B).
 *
 * This page is the shared link. It is *not* an entry credential: submitting
 * the form mints a brand-new invitation with its own signed QR and admission
 * code, which is what the guest then carries to the gate. Two people opening
 * the same link leave with two different passes.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const page = await getRegistrationPage(token);
  if (!page) return { title: "Registration" };
  return {
    title: `${page.event.title} · Get your pass`,
    description: `Register to receive your entry pass for ${page.event.title}.`,
    // A registration link should never be indexed, it is meant to be shared
    // deliberately by the organiser, not found in a search result.
    robots: { index: false, follow: false },
  };
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const page = await getRegistrationPage(token);
  if (!page) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{APP_NAME}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{page.event.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hosted by {page.event.hostName} · {formatDate(page.event.startDate)}
          {page.event.venueName ? ` · ${page.event.venueName}` : ""}
        </p>

        {page.welcomeMessage && (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {page.welcomeMessage}
          </p>
        )}

        {page.closed || page.full ? (
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            {page.full
              ? "Every pass for this event has been claimed."
              : "Registration for this event is closed."}
          </p>
        ) : (
          <div className="mt-6">
            <JoinForm
              token={token}
              requireName={page.requireName}
              requireContact={page.requireContact}
            />
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Your pass is issued to you alone. Sharing this page gives someone a pass of
          their own, it never shares yours.
        </p>
      </div>
    </main>
  );
}
