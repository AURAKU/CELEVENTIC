"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import type { BuilderTab, GuideBuilderState } from "./guide-builder-types";
import { GuideContentTab } from "./guide-content-tab";
import { GuideAppearanceTab } from "./guide-appearance-tab";
import { GuideSeatingTab } from "./guide-seating-tab";
import { GuideSignsTab } from "./guide-signs-tab";
import { GuideOfflineTab } from "./guide-offline-tab";
import { GuidePublishTab } from "./guide-publish-tab";

export type GuideAction = (
  action: string,
  payload?: Record<string, unknown>
) => Promise<Record<string, unknown> | null>;

/**
 * Event Guide builder.
 *
 * Every write carries the guide's current version. A stale write comes back as
 * a 409 and reloads rather than clobbering a co-organizer's edit, which is the
 * realistic failure mode when a couple and a planner are both preparing the
 * same event the night before.
 */
export function EventGuideBuilder({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const [state, setState] = useState<GuideBuilderState | null>(null);
  const [tab, setTab] = useState<BuilderTab>("content");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/event-guide?eventId=${encodeURIComponent(eventId)}`);
    const body = await response.json();
    if (response.ok) {
      setState(body.data as GuideBuilderState);
    } else {
      setNotice({ kind: "error", message: body.error ?? "Could not load the Event Guide" });
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run: GuideAction = useCallback(
    async (action, payload = {}) => {
      if (!state) return null;
      setBusy(true);
      setNotice(null);
      try {
        const response = await fetch("/api/event-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            action,
            expectedVersion: state.guide.version,
            ...payload,
          }),
        });
        const body = await response.json();

        if (response.status === 409) {
          setNotice({ kind: "error", message: body.error });
          await load();
          return null;
        }
        if (!response.ok) {
          setNotice({ kind: "error", message: body.error ?? "That did not save" });
          return null;
        }

        await load();
        setNotice({ kind: "ok", message: "Saved" });
        return body.data ?? {};
      } catch {
        setNotice({ kind: "error", message: "Could not reach the server. Please try again." });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [eventId, state, load]
  );

  if (!state) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Event Guide…
      </div>
    );
  }

  const { guide, permissions } = state;
  const published = guide.status === "PUBLISHED";

  return (
    <div className="space-y-6" data-tour="event-guide-builder">
      <header className="stack-mobile">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Event Guide</h1>
          <p className="text-slate-500">
            {eventTitle} — one QR for your programme, seating and menu
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={published ? "default" : "outline"}>
            {published ? "Published" : "Draft"}
          </Badge>
          {published ? (
            <a
              href={state.links.online.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
            >
              View guide <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </header>

      {!permissions.canManage ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You can view this guide but not change it. Ask an organizer for edit access.
        </p>
      ) : null}

      {guide.snapshotStale ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            You have unpublished changes. Guests are still seeing the last published version.
          </span>
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className={`rounded-lg px-4 py-3 text-sm ${
            notice.kind === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {notice.message}
        </p>
      ) : null}

      <div data-tour="event-guide-content" className="contents"><Tabs value={tab} onValueChange={(value) => setTab(value as BuilderTab)}>
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="seating">Seating</TabsTrigger>
          <TabsTrigger value="signs">QR &amp; Signs</TabsTrigger>
          <TabsTrigger value="offline">Offline</TabsTrigger>
          <TabsTrigger value="publish" data-tour="event-guide-publish">Publish</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <GuideContentTab state={state} run={run} busy={busy} />
        </TabsContent>
        <TabsContent value="appearance" className="mt-4">
          <GuideAppearanceTab state={state} run={run} busy={busy} />
        </TabsContent>
        <TabsContent value="seating" className="mt-4">
          <GuideSeatingTab state={state} run={run} busy={busy} />
        </TabsContent>
        <TabsContent value="signs" className="mt-4">
          <GuideSignsTab state={state} run={run} busy={busy} eventId={eventId} />
        </TabsContent>
        <TabsContent value="offline" className="mt-4">
          <GuideOfflineTab state={state} run={run} busy={busy} eventId={eventId} />
        </TabsContent>
        <TabsContent value="publish" className="mt-4">
          <GuidePublishTab state={state} run={run} busy={busy} />
        </TabsContent>
      </Tabs>

      {busy ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Working…
        </p>
      ) : null}

      <Button variant="outline" onClick={() => void load()} disabled={busy}>
        Reload
      </Button>
    </div>
  );
}
