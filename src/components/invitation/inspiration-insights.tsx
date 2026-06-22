"use client";

import { Sparkles, Palette, Type, Lightbulb } from "lucide-react";
import type { UploadAnalysisResult } from "@/services/invitations/invitation-inspiration.service";

interface InspirationInsightsProps {
  analysis: UploadAnalysisResult | null;
}

export function InspirationInsights({ analysis }: InspirationInsightsProps) {
  if (!analysis) return null;

  const { concept, suggestedLayout, confidence } = analysis;

  return (
    <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-teal-50 to-white p-4 space-y-3 text-sm">
      <div className="flex items-center gap-2 font-semibold text-brand-800">
        <Sparkles className="h-4 w-4" />
        AI Design Insights ({Math.round(confidence * 100)}% match)
      </div>
      <div className="grid gap-2 text-xs text-slate-700">
        <p><span className="font-medium">Style:</span> {concept.style} — {concept.mood}</p>
        <p className="flex items-start gap-1.5">
          <Palette className="h-3.5 w-3.5 shrink-0 mt-0.5 text-brand-600" />
          {concept.colorStory}
        </p>
        <p className="flex items-start gap-1.5">
          <Type className="h-3.5 w-3.5 shrink-0 mt-0.5 text-brand-600" />
          {concept.typography}
        </p>
        <p><span className="font-medium">Layout:</span> {suggestedLayout.replace(/-/g, " ")} — {concept.layoutReason}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1.5">
          <Lightbulb className="h-3.5 w-3.5" /> Design ideas applied
        </p>
        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
          {concept.ideas.map((idea, i) => (
            <li key={i}>{idea}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
