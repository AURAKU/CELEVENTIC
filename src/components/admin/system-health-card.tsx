"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type HealthStatus = "healthy" | "warning" | "critical";

interface ServiceHealth {
  id: string;
  label: string;
  status: HealthStatus;
  message: string;
}

interface SystemHealthReport {
  checkedAt: string;
  overall: HealthStatus;
  services: ServiceHealth[];
}

const STATUS_STYLE: Record<HealthStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  healthy: { icon: CheckCircle2, color: "text-green-600", label: "Healthy" },
  warning: { icon: AlertTriangle, color: "text-amber-600", label: "Warning" },
  critical: { icon: AlertTriangle, color: "text-red-600", label: "Critical" },
};

export function SystemHealthCard() {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/system-health");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load health");
        setReport(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Health check failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const overall = report ? STATUS_STYLE[report.overall] : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#0B8A83]" />
            System Health
          </CardTitle>
          {overall && (
            <span className={`text-xs font-semibold flex items-center gap-1 ${overall.color}`}>
              <overall.icon className="h-3.5 w-3.5" />
              {overall.label}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running diagnostics…
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {report && (
          <ul className="space-y-2">
            {report.services.map((service) => {
              const style = STATUS_STYLE[service.status];
              const Icon = style.icon;
              return (
                <li
                  key={service.id}
                  className="flex items-start justify-between gap-3 text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{service.label}</p>
                    <p className="text-xs text-slate-500">{service.message}</p>
                  </div>
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${style.color}`} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
