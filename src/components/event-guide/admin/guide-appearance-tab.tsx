"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle } from "lucide-react";
import type { GuideAction } from "./event-guide-builder";
import type { GuideBuilderState } from "./guide-builder-types";

const COLOR_FIELDS = [
  { key: "primary", label: "Headings" },
  { key: "secondary", label: "Accents" },
  { key: "accent", label: "Buttons" },
  { key: "background", label: "Background" },
  { key: "text", label: "Body text" },
] as const;

/**
 * Appearance.
 *
 * Defaults to inheriting the invitation theme so the guide feels like a
 * continuation of the invite. Overrides are checked for contrast as you edit,
 * and the same check runs server-side at publish so it cannot be skipped.
 */
export function GuideAppearanceTab({
  state,
  run,
  busy,
}: {
  state: GuideBuilderState;
  run: GuideAction;
  busy: boolean;
}) {
  const canEdit = state.permissions.canManage;
  const [useInvitation, setUseInvitation] = useState(state.guide.useInvitationTheme);
  const [colors, setColors] = useState<Record<string, string>>({
    ...state.preview.theme.colors,
    ...state.guide.themeOverrides.colors,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">
              <span className="font-medium">Use my invitation theme</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                The guide picks up the colours and fonts from your published invitation.
              </span>
            </span>
            <Switch checked={useInvitation} onCheckedChange={setUseInvitation} disabled={!canEdit} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium" htmlFor={`guide-color-${field.key}`}>
                  {field.label}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id={`guide-color-${field.key}`}
                    type="color"
                    className="h-9 w-12 shrink-0 cursor-pointer rounded border"
                    value={colors[field.key] ?? "#000000"}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setColors((current) => ({ ...current, [field.key]: e.target.value }))
                    }
                  />
                  <Input
                    value={colors[field.key] ?? ""}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setColors((current) => ({ ...current, [field.key]: e.target.value }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Readability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {state.contrast.findings.map((finding) => (
            <p key={finding.pair} className="flex items-center gap-2 text-sm">
              {finding.passes ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span className="min-w-0">
                {finding.pair} — {finding.ratio}:1
                <span className="text-slate-500"> (needs {finding.required}:1)</span>
              </span>
            </p>
          ))}
          {state.contrast.adjustments.map((note) => (
            <p
              key={note}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              {note}
            </p>
          ))}
          {state.contrast.unmeasured.length > 0 ? (
            <p className="text-xs text-slate-500">
              Not measured: {state.contrast.unmeasured.join(", ")} — these use a gradient we cannot
              score numerically.
            </p>
          ) : null}
          {!state.contrast.passes ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              Publishing is blocked until body text reaches 4.5:1. Guests read this in dim venue
              lighting, often on an old phone at low brightness.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-xl border p-6 text-center"
            style={{
              background: colors.background,
              color: colors.text,
              borderColor: state.preview.theme.accentWash,
            }}
          >
            <p
              className="text-[0.65rem] font-semibold uppercase tracking-[0.28em]"
              style={{ color: state.preview.theme.labelColor ?? colors.secondary }}
            >
              Event Guide
            </p>
            <p className="mt-2 font-serif text-2xl" style={{ color: colors.primary }}>
              {state.preview.header.eventTitle}
            </p>
            <p className="mt-2 text-sm opacity-80">
              {[state.preview.header.dateLabel, state.preview.header.venue]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
            {/* The pair the guest's page paints and the publish gate measures,
                not the raw accent on the raw background. */}
            <span
              className="mt-4 inline-block rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest"
              style={{
                background: colors.accent,
                color: state.preview.theme.onActionColor ?? colors.background,
              }}
            >
              Find my table
            </span>
          </div>
        </CardContent>
      </Card>

      {canEdit ? (
        <Button
          disabled={busy}
          onClick={() =>
            void run("save_appearance", {
              useInvitationTheme: useInvitation,
              themeOverrides: { colors },
            })
          }
        >
          Save appearance
        </Button>
      ) : null}
    </div>
  );
}
