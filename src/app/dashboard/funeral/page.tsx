"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Heart, ExternalLink, Plus } from "lucide-react";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";

interface FuneralProfile {
  deceasedName: string;
  dateOfBirth: string | null;
  dateOfPassing: string | null;
  age: number | null;
  biography: string | null;
  familyName: string | null;
  photoUrl: string | null;
  privacyStatus: string;
  burialVenue: string | null;
  burialDirections: string | null;
  livestreamUrl: string | null;
}

interface ProgramItem { id: string; title: string; description: string | null; startTime: string | null }
interface Tribute { id: string; userName: string; message: string; approvalStatus: string; createdAt: string }

export default function FuneralOSPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const selectedEvent = events.find((e) => e.id === eventId);
  const [profile, setProfile] = useState<FuneralProfile | null>(null);
  const [program, setProgram] = useState<ProgramItem[]>([]);
  const [tributes, setTributes] = useState<Tribute[]>([]);
  const [form, setForm] = useState({
    deceasedName: "", biography: "", familyName: "", burialVenue: "", burialDirections: "",
    privacyStatus: "PUBLIC", photoUrl: "", livestreamUrl: "",
  });
  const [programForm, setProgramForm] = useState({ title: "", startTime: "", description: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!eventId) return;
    const res = await fetch(`/api/funeral?eventId=${eventId}`);
    const d = await res.json();
    if (res.ok) {
      const p = d.data.profile;
      setProfile(p);
      setProgram(d.data.program);
      setTributes(d.data.tributes);
      setForm({
        deceasedName: p.deceasedName ?? "",
        biography: p.biography ?? "",
        familyName: p.familyName ?? "",
        burialVenue: p.burialVenue ?? "",
        burialDirections: p.burialDirections ?? "",
        privacyStatus: p.privacyStatus ?? "PUBLIC",
        photoUrl: p.photoUrl ?? "",
        livestreamUrl: p.livestreamUrl ?? "",
      });
    } else {
      setError(d.error);
    }
  }

  useEffect(() => { if (eventId) load(); }, [eventId]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/funeral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ...form }),
    });
    const d = await res.json();
    if (res.ok) {
      setProfile(d.data);
      load();
    } else {
      setError(d.error);
    }
    setSaving(false);
  }

  async function addProgram(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/funeral/program", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ...programForm, sortOrder: program.length }),
    });
    if (res.ok) {
      setProgramForm({ title: "", startTime: "", description: "" });
      load();
    }
  }

  async function moderateTribute(id: string, status: "APPROVED" | "REJECTED") {
    await fetch("/api/funeral/tributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "moderate", tributeId: id, status }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">FuneralOS</h1>
        <p className="page-subtitle">Dignified digital obituaries, tribute walls, programs, and memorial pages.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      {selectedEvent && profile && (
        <Card className="border-slate-700/20 bg-gradient-to-r from-slate-900 to-slate-800 text-[#FAF8F4]">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-gold-400" />
              <span className="text-sm">Public memorial page</span>
            </div>
            <Link href={`/memorial/${selectedEvent.slug}`} target="_blank">
              <Button variant="secondary" size="sm">
                <ExternalLink className="h-4 w-4" /> View Memorial
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Obituary Profile</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-3">
              <div className="space-y-1"><Label>Deceased Name</Label><Input value={form.deceasedName} onChange={(e) => setForm({ ...form, deceasedName: e.target.value })} required disabled={!eventId} /></div>
              <div className="space-y-1"><Label>Family Name</Label><Input value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} disabled={!eventId} /></div>
              <div className="space-y-1"><Label>Biography</Label><Textarea value={form.biography} onChange={(e) => setForm({ ...form, biography: e.target.value })} rows={4} disabled={!eventId} /></div>
              <div className="space-y-1"><Label>Photo URL</Label><Input value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} disabled={!eventId} /></div>
              <div className="space-y-1"><Label>Burial Venue</Label><Input value={form.burialVenue} onChange={(e) => setForm({ ...form, burialVenue: e.target.value })} disabled={!eventId} /></div>
              <div className="space-y-1"><Label>Burial Directions</Label><Textarea value={form.burialDirections} onChange={(e) => setForm({ ...form, burialDirections: e.target.value })} rows={2} disabled={!eventId} /></div>
              <div className="space-y-1">
                <Label>Privacy</Label>
                <Select value={form.privacyStatus} onValueChange={(v) => setForm({ ...form, privacyStatus: v })} disabled={!eventId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="UNLISTED">Unlisted</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={!eventId || saving}>{saving ? "Saving..." : "Save Profile"}</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Funeral Program</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={addProgram} className="space-y-2">
                <Input placeholder="Program item title" value={programForm.title} onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })} required disabled={!eventId} />
                <Input placeholder="Time (e.g. 9:00 AM)" value={programForm.startTime} onChange={(e) => setProgramForm({ ...programForm, startTime: e.target.value })} disabled={!eventId} />
                <Button type="submit" size="sm" disabled={!eventId}><Plus className="h-4 w-4" /> Add Item</Button>
              </form>
              {program.length === 0 ? (
                <p className="text-sm text-slate-500">No program items yet.</p>
              ) : program.map((p) => (
                <div key={p.id} className="text-sm p-3 rounded-lg border">
                  <div className="flex justify-between"><span className="font-medium">{p.title}</span>{p.startTime && <span className="text-slate-500">{p.startTime}</span>}</div>
                  {p.description && <p className="text-slate-600 mt-1">{p.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tribute Moderation</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {tributes.length === 0 ? (
                <p className="text-sm text-slate-500">No tributes yet.</p>
              ) : tributes.map((t) => (
                <div key={t.id} className="p-3 rounded-lg border text-sm">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium">{t.userName}</span>
                    <Badge variant={t.approvalStatus === "APPROVED" ? "success" : t.approvalStatus === "PENDING" ? "warning" : "destructive"}>
                      {t.approvalStatus}
                    </Badge>
                  </div>
                  <p className="mt-1 text-slate-600">{t.message}</p>
                  {t.approvalStatus === "PENDING" && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={() => moderateTribute(t.id, "APPROVED")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => moderateTribute(t.id, "REJECTED")}>Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
