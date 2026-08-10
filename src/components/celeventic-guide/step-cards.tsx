"use client";

import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepCardData {
  id: string;
  sortOrder: number;
  title: string;
  body: string;
  stepType: string;
}

export function StepCards({ steps }: { steps: StepCardData[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li
          key={step.id}
          className={cn(
            "rounded-2xl border p-4 flex gap-4",
            step.stepType === "warning"
              ? "border-amber-200 bg-amber-50/60"
              : step.stepType === "tip"
                ? "border-brand-100 bg-brand-50/40"
                : "border-slate-200 bg-white/80"
          )}
        >
          <div className="shrink-0 h-9 w-9 rounded-xl bg-brand-700 text-white flex items-center justify-center font-semibold text-sm">
            {i + 1}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-slate-900">{step.title}</h3>
              {step.stepType === "tip" && <Info className="h-4 w-4 text-brand-600" aria-hidden />}
              {step.stepType === "warning" && <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden />}
              {step.stepType === "checklist" && <CheckCircle2 className="h-4 w-4 text-brand-600" aria-hidden />}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
