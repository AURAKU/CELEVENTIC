"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

type CoveragePayload = {
  report: {
    totalUserFacing: number;
    covered: number;
    partial: number;
    missing: number;
    deprecatedOrNa: number;
    coveragePercent: number;
    unexplainedHighPriorityMissing: Array<{ feature: string; featureKey: string; notes?: string }>;
    rows: Array<{
      feature: string;
      featureKey: string;
      route: string;
      audience: string;
      existingTutorial: string;
      status: string;
      priority: string;
      videoAvailable: boolean;
      notes?: string;
    }>;
  };
  gate: { ok: boolean; reason: string };
  catalogSize: number;
  videoProductionRequired: Array<{ slug: string; title: string; priority: boolean; targetMp4: string }>;
};

export default function AdminGuideCoveragePage() {
  const [data, setData] = useState<CoveragePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/guides/coverage")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load coverage");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guide coverage"
        subtitle="Acceptance gate for Celeventic Guide completeness (§51 / §60)."
      />
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/guides">Back to guides</Link>
        </Button>
        <Button asChild variant="outline">
          <a href="/docs/guides/celeventic-help-coverage.md" target="_blank" rel="noreferrer">
            Matrix doc
          </a>
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm text-slate-500">Loading coverage…</p>}

      {data && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Coverage %" value={`${data.report.coveragePercent}%`} highlight />
            <Stat label="COVERED" value={String(data.report.covered)} />
            <Stat label="PARTIAL" value={String(data.report.partial)} />
            <Stat label="MISSING" value={String(data.report.missing)} />
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              data.gate.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="font-semibold text-slate-900">Gate: {data.gate.ok ? "PASS" : "FAIL"}</p>
            <p className="text-sm text-slate-600 mt-1">{data.gate.reason}</p>
            <p className="text-xs text-slate-500 mt-2">
              User-facing {data.report.totalUserFacing} · N/A/Deprecated {data.report.deprecatedOrNa} ·
              Catalog {data.catalogSize}
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold">VIDEO PRODUCTION REQUIRED</h2>
            <ul className="space-y-1 text-sm">
              {data.videoProductionRequired
                .filter((v) => v.priority)
                .map((v) => (
                  <li key={v.slug} className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                    <span className="font-medium">{v.title}</span>
                    <span className="text-slate-500"> → {v.targetMp4}</span>
                  </li>
                ))}
            </ul>
          </section>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">Feature</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Tutorial</th>
                  <th className="px-3 py-2">Video</th>
                </tr>
              </thead>
              <tbody>
                {data.report.rows.map((r) => (
                  <tr key={r.featureKey} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.feature}</div>
                      <div className="text-xs text-slate-400">{r.route}</div>
                    </td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.priority}</td>
                    <td className="px-3 py-2 text-xs">{r.existingTutorial}</td>
                    <td className="px-3 py-2">{r.videoAvailable ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
