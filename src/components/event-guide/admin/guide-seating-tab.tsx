"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck } from "lucide-react";
import type { GuideAction } from "./event-guide-builder";
import type { GuideBuilderState } from "./guide-builder-types";

/**
 * Seating finder configuration.
 *
 * Admission code is the default because it is the private option: a code is
 * something only the invited guest holds, whereas a name can be guessed. Name
 * mode is offered but the trade-off is stated plainly rather than buried.
 */
export function GuideSeatingTab({
  state,
  run,
  busy,
}: {
  state: GuideBuilderState;
  run: GuideAction;
  busy: boolean;
}) {
  const canEdit = state.permissions.canManage;
  const g = state.guide;
  const [enabled, setEnabled] = useState(g.seatingEnabled);
  const [mode, setMode] = useState(g.seatingMode);
  const [minQuery, setMinQuery] = useState(g.seatingMinQuery);
  const [maxMatch, setMaxMatch] = useState(g.seatingMaxMatch);
  const [note, setNote] = useState(g.seatingNote ?? "");

  const coverage = state.offline.coverage;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seat lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">
              <span className="font-medium">Let guests find their table</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Adds a Seating tab to the guide.
              </span>
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!canEdit} />
          </label>

          <fieldset disabled={!canEdit || !enabled} className="space-y-2">
            <legend className="text-sm font-medium">Guests identify themselves with</legend>
            {(
              [
                {
                  value: "ADMISSION_CODE" as const,
                  label: "Their admission code (recommended)",
                  detail:
                    "Only the invited guest has the code, so nobody can look up someone else's table.",
                },
                {
                  value: "GUEST_NAME" as const,
                  label: "Their name",
                  detail:
                    "Easier for guests who mislaid their code, but anyone who knows a name can see that party's table.",
                },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                  mode === option.value ? "border-teal-600 bg-teal-50/50" : ""
                }`}
              >
                <input
                  type="radio"
                  name="guide-seating-mode"
                  className="mt-1"
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                />
                <span className="text-sm">
                  <span className="font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{option.detail}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="guide-min-query">
                Minimum characters
              </label>
              <Input
                id="guide-min-query"
                type="number"
                min={mode === "ADMISSION_CODE" ? 4 : 3}
                max={24}
                value={minQuery}
                disabled={!canEdit || !enabled}
                onChange={(e) => setMinQuery(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="guide-max-match">
                Maximum matches considered
              </label>
              <Input
                id="guide-max-match"
                type="number"
                min={1}
                max={5}
                value={maxMatch}
                disabled={!canEdit || !enabled}
                onChange={(e) => setMaxMatch(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="guide-seating-note">
              Note shown above the search box
            </label>
            <Textarea
              id="guide-seating-note"
              rows={2}
              value={note}
              disabled={!canEdit || !enabled}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter the code from your invitation."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-teal-700" /> What guests can and cannot see
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-slate-600">
          <p>A guest only ever sees their own party&rsquo;s table — never a list of other guests.</p>
          <p>
            Searches are limited to 12 attempts a minute per guest, so the finder cannot be used to
            work through codes.
          </p>
          <p>
            If two guests match the same name, we ask for a surname rather than showing either
            result.
          </p>
          <p>No guest list is ever stored on a guest&rsquo;s phone.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seating readiness</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            <span className="font-semibold">{coverage.assigned}</span> of{" "}
            <span className="font-semibold">{coverage.parties}</span> parties have a seat assigned.
          </p>
          {coverage.unassigned > 0 ? (
            <p className="mt-1 text-amber-700">
              {coverage.unassigned} {coverage.unassigned === 1 ? "party has" : "parties have"} no
              assignment yet. Those guests will be told to ask a member of the host team.
            </p>
          ) : (
            <p className="mt-1 text-emerald-700">Every party has a seat.</p>
          )}
        </CardContent>
      </Card>

      {canEdit ? (
        <Button
          disabled={busy}
          onClick={() =>
            void run("save_seating", {
              seatingEnabled: enabled,
              seatingMode: mode,
              seatingMinQuery: minQuery,
              seatingMaxMatch: maxMatch,
              seatingNote: note,
            })
          }
        >
          Save seating
        </Button>
      ) : null}
    </div>
  );
}
