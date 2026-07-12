"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  supportHref?: string;
  supportLabel?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  supportHref = "/dashboard/help",
  supportLabel = "Contact Support",
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      role="alert"
    >
      <div className="icon-box-lg mb-6 bg-red-50 text-red-500 border border-red-100">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h3 className="font-display text-xl font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
        {supportHref && (
          <Button variant="outline" asChild>
            <Link href={supportHref}>{supportLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
