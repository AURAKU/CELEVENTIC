import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon: Icon, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", className)}>
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="icon-box-lg shrink-0 hidden sm:flex">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h1 className="page-heading flex items-center gap-2">
            {Icon && <Icon className="h-6 w-6 text-brand-600 sm:hidden" />}
            {title}
          </h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
