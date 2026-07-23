"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";

type HealthStatus = "healthy" | "warning" | "critical";

interface ServiceHealth {
  id: string;
  label: string;
  status: HealthStatus;
  message: string;
  href?: string;
  details?: string[];
}

interface SystemHealthReport {
  checkedAt: string;
  overall: HealthStatus;
  services: ServiceHealth[];
}

/** Operator-facing labels: healthy / degraded / failed (maps from API statuses). */
const STATUS_STYLE: Record<
  HealthStatus,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  healthy: { icon: CheckCircle2, color: "text-green-600", label: "Healthy" },
  warning: { icon: AlertTriangle, color: "text-amber-600", label: "Degraded" },
  critical: { icon: AlertTriangle, color: "text-red-600", label: "Failed" },
};

export function SystemHealthCard() {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
              const isOpen = expandedId === service.id;
              const hasDetails = (service.details?.length ?? 0) > 0;
              return (
                <li
                  key={service.id}
                  className="border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <button
                      type="button"
                      className="text-left min-w-0 flex-1"
                      onClick={() =>
                        setExpandedId(isOpen ? null : hasDetails || service.href ? service.id : null)
                      }
                      aria-expanded={isOpen}
                    >
                      <p className="font-medium">{service.label}</p>
                      <p className="text-xs text-slate-500">{service.message}</p>
                    </button>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${style.color}`}>
                        {style.label}
                      </span>
                      <Icon className={`h-4 w-4 ${style.color}`} />
                    </div>
                  </div>
                  {isOpen && (
                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 space-y-1.5">
                      {service.details?.map((line) => (
                        <p key={line} className="text-xs text-slate-600">
                          {line}
                        </p>
                      ))}
                      {service.href && (
                        <Link
                          href={service.href}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#0B8A83] hover:underline"
                        >
                          Open Integrations
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
