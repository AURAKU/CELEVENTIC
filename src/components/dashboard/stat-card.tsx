import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("card-glow group hover:shadow-[0_12px_40px_rgba(11,138,131,0.12)]", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5">{value}</p>
            {trend && (
              <p className="text-xs font-medium text-brand-600 mt-1.5 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {trend}
              </p>
            )}
          </div>
          <div className="icon-box group-hover:scale-105 transition-transform">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
