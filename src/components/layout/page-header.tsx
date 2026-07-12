import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpLink } from "@/components/layout/help-link";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  helpHref?: string;
  helpLabel?: string;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  search,
  filters,
  helpHref,
  helpLabel,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {Icon && (
            <div className="icon-box-lg shrink-0 hidden sm:flex">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="page-heading flex items-center gap-2">
              {Icon && <Icon className="h-6 w-6 text-brand-600 sm:hidden" />}
              {title}
            </h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
            {(helpHref || helpLabel) && (
              <div className="mt-2">
                <HelpLink href={helpHref} label={helpLabel} />
              </div>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {(search || filters) && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {search && <div className="flex-1 min-w-0">{search}</div>}
          {filters && <div className="flex flex-wrap gap-2 shrink-0">{filters}</div>}
        </div>
      )}
    </div>
  );
}
