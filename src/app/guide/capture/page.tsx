import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessAdminPanel } from "@/lib/rbac";

/**
 * Guide Capture Mode — internal stub only.
 * Full recording workflow is deferred; route is admin-gated.
 */
export default async function GuideCaptureStubPage() {
  const session = await getServerSession(authOptions);
  if (!canAccessAdminPanel(session?.user?.role as never)) {
    redirect("/guide");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 space-y-4">
      <p className="text-xs uppercase tracking-wider text-brand-700 font-semibold">Internal</p>
      <h1 className="font-display text-3xl font-semibold text-slate-900">Guide Capture Mode</h1>
      <p className="text-slate-600 leading-relaxed">
        Capture Mode for recording Celeventic Guide videos is stubbed for this release. Use storyboard
        scripts in <code className="text-sm bg-slate-100 px-1 rounded">src/lib/celeventic-guide/storyboards</code>{" "}
        and upload finished media URLs via <a className="text-brand-700 hover:underline" href="/admin/guides">/admin/guides</a>.
      </p>
      <p className="text-sm text-slate-500">
        Offline “Save for offline” video caching is also deferred — architecture can reuse the existing
        Event Guide offline pack patterns later.
      </p>
    </main>
  );
}
