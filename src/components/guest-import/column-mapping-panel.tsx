"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IMPORT_FIELD_OPTIONS, type ColumnSuggestionView } from "./types";

/**
 * Column mapping.
 *
 * Shown before anything is created, with the detected guess pre-selected and
 * three real values from each column underneath — the organiser confirms
 * against their own data rather than trusting a header they may not have
 * written. Re-mapping re-derives every row from the stored source cells, so
 * fixing a wrong guess never means re-uploading.
 */

interface Props {
  suggestions: ColumnSuggestionView[];
  onApply: (mapping: Record<number, string>) => Promise<void>;
  busy?: boolean;
}

export function ColumnMappingPanel({ suggestions, onApply, busy }: Props) {
  const [mapping, setMapping] = useState<Record<number, string>>(() =>
    Object.fromEntries(suggestions.map((s) => [s.index, s.field]))
  );
  const [error, setError] = useState("");

  const nameColumns = Object.values(mapping).filter((f) => f === "name").length;

  async function apply() {
    if (nameColumns === 0) {
      setError("Map one column to the guest name — it is the only required field.");
      return;
    }
    if (nameColumns > 1) {
      setError("Only one column can be the guest name.");
      return;
    }
    setError("");
    await onApply(mapping);
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="font-semibold">Match your columns</h3>
          <p className="text-sm text-slate-500">
            We guessed from your headers and the data itself. Only the name is required —
            phone and email are optional.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.index}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">
                  {suggestion.header || `Column ${suggestion.index + 1}`}
                </p>
                {suggestion.confidence >= 70 && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                    Confident
                  </span>
                )}
              </div>

              {suggestion.sample.length > 0 && (
                <p className="mt-1 truncate text-xs text-slate-400">
                  {suggestion.sample.join(" · ")}
                </p>
              )}

              <select
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"
                value={mapping[suggestion.index] ?? "ignore"}
                aria-label={`Field for ${suggestion.header || `column ${suggestion.index + 1}`}`}
                onChange={(e) =>
                  setMapping((prev) => ({ ...prev, [suggestion.index]: e.target.value }))
                }
              >
                {IMPORT_FIELD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button onClick={apply} disabled={busy}>
          {busy ? "Applying…" : "Apply mapping"}
        </Button>
      </CardContent>
    </Card>
  );
}
