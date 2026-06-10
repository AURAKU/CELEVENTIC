import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="icon-box-lg mb-6 animate-float">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-xl font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">{description}</p>
      {actionLabel && actionHref && (
        <Button className="mt-8" asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
