"use client";

import { AlertCircle, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildPublishChecklist,
  publishChecklistBlocks,
  publishChecklistSummary,
  type StudioPublishContext,
} from "@/lib/invitation-studio/publish-validation";
import { cn } from "@/lib/utils";

interface StudioPublishChecklistProps {
  open: boolean;
  context: StudioPublishContext;
  onClose: () => void;
  onContinue: () => void;
  continuing?: boolean;
}

export function StudioPublishChecklist({
  open,
  context,
  onClose,
  onContinue,
  continuing,
}: StudioPublishChecklistProps) {
  if (!open) return null;

  const items = buildPublishChecklist(context);
  const blocked = publishChecklistBlocks(items);
  const summary = publishChecklistSummary(items);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-check-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="publish-check-title" className="font-display text-lg font-semibold text-[#0F172A]">
              Ready to preview?
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {summary.errors} blocking · {summary.warnings} tips · {summary.ok} ready
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="max-h-[50vh] space-y-2 overflow-y-auto px-5 py-4">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex gap-3 rounded-xl border px-3 py-2.5",
                item.severity === "error" && "border-red-200 bg-red-50/80",
                item.severity === "warning" && "border-amber-200 bg-amber-50/60",
                item.severity === "ok" && "border-emerald-100 bg-emerald-50/40"
              )}
            >
              {item.severity === "error" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              ) : item.severity === "warning" ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
                {item.detail && <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Keep editing
          </Button>
          <Button
            type="button"
            className="flex-1 bg-[#0B8A83] hover:bg-[#097068]"
            disabled={blocked || continuing}
            onClick={onContinue}
          >
            {continuing ? "Saving…" : "Continue to preview"}
          </Button>
        </div>
      </div>
    </div>
  );
}
