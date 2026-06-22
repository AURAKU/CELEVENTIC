"use client";

import type { ReactNode } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardPageShellProps {
  title: string;
  description?: string;
  action?: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: boolean;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function DashboardPageShell({
  title,
  description,
  action,
  loading,
  error,
  onRetry,
  empty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
  className,
}: DashboardPageShellProps) {
  return (
    <div className={cn("space-y-6 max-w-6xl mx-auto w-full", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-2xl">{description}</p>}
        </div>
        {action && <div className="shrink-0 flex flex-wrap gap-2">{action}</div>}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm">Loading…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex flex-col items-center text-center gap-3">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}

      {!loading && !error && empty && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-10 sm:p-14 flex flex-col items-center text-center gap-3">
          {emptyIcon}
          <h2 className="text-lg font-semibold text-slate-900">{emptyTitle ?? "Nothing here yet"}</h2>
          {emptyDescription && <p className="text-sm text-slate-500 max-w-md">{emptyDescription}</p>}
          {emptyAction}
        </div>
      )}

      {!loading && !error && !empty && children}
    </div>
  );
}
