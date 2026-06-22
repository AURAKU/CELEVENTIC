import { cn } from "@/lib/utils";

interface PageLoaderProps {
  label?: string;
  className?: string;
}

export function PageLoader({ label = "Loading...", className }: PageLoaderProps) {
  return (
    <div className={cn("flex min-h-[50vh] flex-col items-center justify-center gap-4", className)}>
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

export function DashboardLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 rounded-2xl bg-brand-100/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/80 border border-slate-200/60" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 rounded-xl bg-white/80 border border-slate-200/60 lg:col-span-2" />
        <div className="h-64 rounded-xl bg-white/80 border border-slate-200/60" />
      </div>
    </div>
  );
}

export function AuthLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh">
      <PageLoader label="Loading sign in..." />
    </div>
  );
}
