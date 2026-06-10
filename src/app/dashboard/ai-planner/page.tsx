"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw } from "lucide-react";
import { EVENT_TYPES } from "@/lib/constants";
import type { AIPlannerResponse } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";

type Tab = "budget" | "timeline" | "checklist" | "risks" | "recommendations";

interface SavedPlan {
  id: string;
  rawPlan: AIPlannerResponse | null;
  budgetItems: { id: string; category: string; estimatedAmount: string; notes: string | null }[];
  timelineItems: { id: string; title: string; dueDate: string | null; priority: string }[];
  checklistItems: { id: string; task: string; status: string }[];
  riskScores: { id: string; riskType: string; severity: string; recommendation: string | null; score: number }[];
  version: number;
}

const tabs: { id: Tab; label: string }[] = [
  { id: "budget", label: "Budget" },
  { id: "timeline", label: "Timeline" },
  { id: "checklist", label: "Checklist" },
  { id: "risks", label: "Risks" },
  { id: "recommendations", label: "Recommendations" },
];

export default function AIPlannerPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [form, setForm] = useState({ eventType: "WEDDING", expectedGuests: "100", budget: "", date: "", location: "", venue: "" });
  const [plan, setPlan] = useState<AIPlannerResponse | null>(null);
  const [savedPlan, setSavedPlan] = useState<SavedPlan | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("budget");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadSavedPlan() {
    if (!eventId) return;
    const res = await fetch(`/api/ai/planner?eventId=${eventId}`);
    const data = await res.json();
    if (res.ok && data.data) {
      setSavedPlan(data.data);
      setPlan(data.data.rawPlan as AIPlannerResponse);
    } else {
      setSavedPlan(null);
    }
  }

  useEffect(() => {
    if (eventId) {
      const ev = events.find((e) => e.id === eventId);
      if (ev) {
        setForm((f) => ({
          ...f,
          eventType: ev.eventType,
          expectedGuests: String(ev.expectedGuests ?? 100),
          date: ev.startDate ? new Date(ev.startDate).toISOString().slice(0, 10) : f.date,
          location: ev.city ?? f.location,
          venue: ev.venueName ?? f.venue,
        }));
      }
      loadSavedPlan();
    }
  }, [eventId, events]);

  async function generatePlan(regenerate = false) {
    setLoading(true);
    setError("");

    const res = await fetch("/api/ai/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: form.eventType,
        expectedGuests: parseInt(form.expectedGuests),
        budget: form.budget ? parseFloat(form.budget) : undefined,
        date: form.date,
        eventId: eventId || undefined,
        location: form.location,
        venue: form.venue,
        regenerate,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setSavedPlan(data.data);
      setPlan(data.data.rawPlan as AIPlannerResponse);
    } else {
      setError(data.error || "Failed to generate plan");
    }
    setLoading(false);
  }

  const display = plan;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Event Planner</h1>
        <p className="page-subtitle">Your personal event consultant — budget, timeline, risks, and recommendations.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-400" /> Plan Your Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); generatePlan(!!savedPlan); }} className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={form.eventType} onValueChange={(v) => setForm({ ...form, eventType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected Guests</Label>
              <Input type="number" value={form.expectedGuests} onChange={(e) => setForm({ ...form, expectedGuests: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Budget (GHS)</Label>
              <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Event Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Location / City</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit" disabled={loading}>
                <Sparkles className="h-4 w-4" />
                {loading ? "Generating..." : savedPlan ? "Regenerate Plan" : "Generate AI Plan"}
              </Button>
              {savedPlan && (
                <Button type="button" variant="outline" onClick={() => generatePlan(true)} disabled={loading}>
                  <RefreshCw className="h-4 w-4" /> New Version
                </Button>
              )}
            </div>
          </form>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </CardContent>
      </Card>

      {display && (
        <>
          {savedPlan && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Badge variant="outline">v{savedPlan.version}</Badge>
              <span>Saved to {eventId ? "event" : "your account"}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-b pb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "budget" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Budget Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {display.budget.map((item) => (
                    <div key={item.category} className="flex justify-between text-sm py-2 border-b">
                      <span>{item.category}</span>
                      <span className="font-medium">{formatCurrency(item.amount)} ({item.percentage}%)</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Attendance Forecast</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-brand-600">{display.attendanceForecast.expected}</p>
                  <p className="text-sm text-slate-500">expected attendees ({Math.round(display.attendanceForecast.confidence * 100)}% confidence)</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "timeline" && (
            <Card>
              <CardHeader><CardTitle className="text-base">Planning Timeline</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {display.timeline.map((item) => (
                  <div key={item.task} className="flex justify-between items-start text-sm p-3 rounded-lg bg-slate-50">
                    <div>
                      <p className="font-medium">{item.task}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{item.priority}</Badge>
                    </div>
                    <span className="text-slate-500 shrink-0">{item.dueDate}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "checklist" && (
            <Card>
              <CardHeader><CardTitle className="text-base">Event Checklist</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(savedPlan?.checklistItems ?? display.checklist.map((task, i) => ({ id: `tmp-${i}`, task, status: "pending" }))).map((item) => (
                    <li key={item.id} className="text-sm flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                      <button
                        type="button"
                        className={`h-5 w-5 rounded border shrink-0 ${item.status === "done" ? "bg-brand-600 border-brand-600 text-white" : "border-slate-300"}`}
                        onClick={async () => {
                          if (item.id.startsWith("tmp-")) return;
                          const next = item.status === "done" ? "pending" : "done";
                          await fetch("/api/ai/planner", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ entity: "checklist", itemId: item.id, status: next }),
                          });
                          loadSavedPlan();
                        }}
                      >
                        {item.status === "done" ? "✓" : ""}
                      </button>
                      <span className={item.status === "done" ? "line-through text-slate-400" : ""}>{item.task}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {activeTab === "risks" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {display.risks.map((r) => (
                <Card key={r.risk}>
                  <CardContent className="p-4">
                    <Badge variant={r.severity === "high" ? "destructive" : r.severity === "medium" ? "warning" : "outline"}>
                      {r.severity}
                    </Badge>
                    <p className="font-medium mt-2 text-sm">{r.risk}</p>
                    <p className="text-xs text-slate-500 mt-2">{r.mitigation}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "recommendations" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Vendor Recommendations</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {display.vendors.map((v) => (
                    <div key={v.category} className="text-sm p-3 rounded-lg bg-slate-50">
                      <p className="font-medium">{v.category}</p>
                      <p className="text-slate-600 mt-1">{v.recommendation}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Marketing & Communications</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Marketing Plan</p>
                    <ul className="space-y-1">
                      {display.marketingPlan.map((m) => (
                        <li key={m} className="text-sm">• {m}</li>
                      ))}
                    </ul>
                  </div>
                  {display.communicationPlan && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Communication Schedule</p>
                      {display.communicationPlan.map((c) => (
                        <div key={c.phase + c.action} className="text-sm py-1 flex justify-between">
                          <span>{c.action}</span>
                          <span className="text-slate-500">{c.phase} · {c.channel}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-sm italic text-slate-700">{display.invitationWording}</p>
                    <p className="text-xs text-slate-500 mt-2">Flyer: {display.flyerCaption}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
