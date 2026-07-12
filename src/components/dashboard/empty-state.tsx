import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrimaryAction } from "@/components/layout/primary-action";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="icon-box-lg mb-6 animate-float">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-xl font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        {actionLabel && actionHref && (
          <PrimaryAction asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </PrimaryAction>
        )}
        {actionLabel && onAction && !actionHref && (
          <PrimaryAction onClick={onAction}>{actionLabel}</PrimaryAction>
        )}
        {secondaryLabel && secondaryHref && (
          <Button variant="outline" asChild>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
