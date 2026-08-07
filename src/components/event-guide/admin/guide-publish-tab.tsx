"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { GuideAction } from "./event-guide-builder";
import type { GuideBuilderState } from "./guide-builder-types";

const TABS = [
  { value: "PROGRAMME" as const, label: "Programme" },
  { value: "SEATING" as const, label: "Seating" },
  { value: "MENU" as const, label: "Menu" },
];

/**
 * Header settings and the publish gate.
 *
 * Publishing is the only action that changes what a guest sees, so it is
 * separated from every other save and states plainly what will happen.
 */
export function GuidePublishTab({
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
  const [enabled, setEnabled] = useState(g.enabled);
  const [defaultTab, setDefaultTab] = useState(g.defaultTab);
  const [showCelebrants, setShowCelebrants] = useState(g.showCelebrants);
  const [showDate, setShowDate] = useState(g.showDate);
  const [showVenue, setShowVenue] = useState(g.showVenue);
  const [showWelcome, setShowWelcome] = useState(g.showWelcome);
  const [celebrants, setCelebrants] = useState(g.celebrantsText ?? "");
  const [welcome, setWelcome] = useState(g.welcomeMessage ?? "");

  const blocked = !state.contrast.passes;
  // Every save bumps the draft version, so a draft ahead of the published one
  // is exactly "there are edits guests have not been sent yet".
  const unsaved = g.publishedVersion !== null && g.version !== g.publishedVersion;
  const empty =
    state.preview.programme.length === 0 &&
    !state.preview.menu.body.trim() &&
    !state.preview.menu.url;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Header</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["Show hosts or celebrants", showCelebrants, setShowCelebrants],
              ["Show the date", showDate, setShowDate],
              ["Show the venue", showVenue, setShowVenue],
              ["Show a welcome message", showWelcome, setShowWelcome],
            ] as const
          ).map(([label, value, setter]) => (
            <label key={label} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{label}</span>
              <Switch checked={value} onCheckedChange={setter} disabled={!canEdit} />
            </label>
          ))}

          <div>
            <label className="text-sm font-medium" htmlFor="guide-celebrants">
              Hosts or celebrants
            </label>
            <Input
              id="guide-celebrants"
              className="mt-1"
              value={celebrants}
              disabled={!canEdit || !showCelebrants}
              onChange={(e) => setCelebrants(e.target.value)}
              placeholder="Jeffery &amp; Francisca"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="guide-welcome">
              Welcome message
            </label>
            <Textarea
              id="guide-welcome"
              className="mt-1"
              rows={3}
              value={welcome}
              disabled={!canEdit || !showWelcome}
              onChange={(e) => setWelcome(e.target.value)}
              placeholder="We are so glad you are here."
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="guide-default-tab">
              Guests land on
            </label>
            <select
              id="guide-default-tab"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={defaultTab}
              disabled={!canEdit}
              onChange={(e) => setDefaultTab(e.target.value as typeof defaultTab)}
            >
              {TABS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">
              <span className="font-medium">Guide is open to guests</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Turning this off shows guests a polite &ldquo;not open yet&rdquo; page.
              </span>
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!canEdit} />
          </label>

          {canEdit ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run("save_settings", {
                  enabled,
                  defaultTab,
                  showCelebrants,
                  showDate,
                  showVenue,
                  showWelcome,
                  celebrantsText: celebrants,
                  welcomeMessage: welcome,
                })
              }
            >
              Save header
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Publishing freezes what you have now and sends it to every guest who scans the code.
            Until then, your edits stay private. Your QR code and link never change — publishing
            changes what they open, so you only ever print the code once.
          </p>

          {g.publishedAt ? (
            <p className="text-sm">
              Last published {new Date(g.publishedAt).toLocaleString()} (version{" "}
              {g.publishedVersion}).
              {unsaved
                ? " You have saved changes since then — publish again to send them to guests."
                : " Guests scanning your code are seeing this version."}
            </p>
          ) : (
            <p
              data-testid="guide-publish-never"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              Never published. Your QR code already works, but anyone scanning it right now sees a
              &ldquo;not open yet&rdquo; page. Publish once and the same code opens your guide.
            </p>
          )}

          {blocked ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              Your colours are not readable enough yet. Fix the contrast warnings under Appearance
              first.
            </p>
          ) : null}
          {empty ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              There is no programme and no menu yet — guests would open an empty guide.
            </p>
          ) : null}

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || blocked || empty} onClick={() => void run("publish")}>
                {g.status === "PUBLISHED" ? "Publish changes" : "Publish guide"}
              </Button>
              {g.status === "PUBLISHED" ? (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Guests will see a “not open yet” page. Continue?")) {
                      void run("unpublish");
                    }
                  }}
                >
                  Unpublish
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How guests are using it</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="font-semibold">{state.analytics.totals.views}</span> tab views
            {state.analytics.totals.offlineViews > 0
              ? `, ${state.analytics.totals.offlineViews} of them on the venue pack`
              : ""}
          </p>
          <p>
            <span className="font-semibold">{state.analytics.totals.searches}</span> seat searches,{" "}
            <span className="font-semibold">{state.analytics.totals.matches}</span> found their table
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Counts only. We never record who searched, what they typed, or where they were.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
