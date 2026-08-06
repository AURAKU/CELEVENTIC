"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { BulkImportWizard } from "@/components/guest-import/bulk-import-wizard";
import { GeneralPassesPanel } from "@/components/guest-import/general-passes-panel";
import { ImportHistoryPanel } from "@/components/guest-import/import-history-panel";

/**
 * Bulk Guest Import, organiser workspace.
 *
 * Three jobs on one screen: import a named guest list, issue general
 * admission passes for people you cannot name, and undo an import that went
 * wrong.
 */
export default function GuestImportPage() {
  const { events, eventId, setEventId, loading, error } = useEventContext();
  const [tab, setTab] = useState("import");

  // Keep ?eventId in the address bar. An import writes to whichever event is
  // selected, so the URL has to say which one — for a reload, a shared link,
  // or a second tab open on a different event.
  useEffect(() => {
    if (!eventId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("eventId") === eventId) return;
    url.searchParams.set("eventId", eventId);
    window.history.replaceState(null, "", url.toString());
  }, [eventId]);

  const eventTitle = events.find((e) => e.id === eventId)?.title;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/guests"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Guest CRM
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Bulk guest import</h1>
        <p className="page-subtitle">
          Paste or upload names → personalised invitations with admission allowance, entry
          passes, place cards and CRM tags. Review duplicates before anything is created.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={loading} />
        </CardContent>
      </Card>

      {!eventId ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            {loading
              ? "Loading your events…"
              : error
                ? error
                : events.length === 0
                  ? "Create an event first — guests are always imported into one specific event."
                  : "Select an event to import guests."}
          </CardContent>
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="import">Import guests</TabsTrigger>
            <TabsTrigger value="general">General passes</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-4">
            <BulkImportWizard key={eventId} eventId={eventId} eventTitle={eventTitle} />
          </TabsContent>

          <TabsContent value="general" className="mt-4">
            <GeneralPassesPanel key={eventId} eventId={eventId} />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ImportHistoryPanel key={eventId} eventId={eventId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
