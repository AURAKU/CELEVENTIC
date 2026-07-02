"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ExternalLink, Plus, Flame, Archive } from "lucide-react";
import { EventPicker } from "@/components/dashboard/event-picker";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { useEventContext } from "@/hooks/use-event-context";
import {
  FUNERAL_REVEAL_STYLES,
  FUNERAL_TEMPLATE_COLLECTIONS,
  FUNERAL_AUDIO_CATEGORIES,
  MEMORIAL_LOCALES,
} from "@/lib/funeral/funeral-constants";

const SECTION_TO_TAB: Record<string, string> = {
  invitations: "obituary",
  obituaries: "obituary",
  obituary: "obituary",
  program: "program",
  timeline: "timeline",
  tributes: "tributes",
  guestbook: "guestbook",
  livestream: "livestream",
  legacy: "legacy",
};

const TAB_TO_SECTION: Record<string, string> = {
  obituary: "obituaries",
  program: "program",
  timeline: "timeline",
  tributes: "tributes",
  guestbook: "guestbook",
  livestream: "livestream",
  legacy: "legacy",
};

interface FuneralProfile {
  deceasedName: string;
  biography: string | null;
  familyName: string | null;
  familyInformation: string | null;
  lifeJourney: string | null;
  achievements: string | null;
  education: string | null;
  career: string | null;
  faithJourney: string | null;
  legacyMessage: string | null;
  photoUrl: string | null;
  privacyStatus: string;
  burialVenue: string | null;
  burialDirections: string | null;
  livestreamUrl: string | null;
  templateSlug: string | null;
  revealStyle: string | null;
  invitationAudioCategory: string | null;
}

export function FuneralPortalClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const initialTab = SECTION_TO_TAB[sectionParam ?? ""] ?? "obituary";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const selectedEvent = events.find((e) => e.id === eventId);
  const [profile, setProfile] = useState<FuneralProfile | null>(null);
  const [program, setProgram] = useState<{ id: string; title: string; startTime: string | null }[]>([]);
  const [tributes, setTributes] = useState<{ id: string; userName: string; message: string; approvalStatus: string; isFeatured: boolean }[]>([]);
  const [guestbook, setGuestbook] = useState<{ id: string; userName: string; message: string; approvalStatus: string }[]>([]);
  const [timeline, setTimeline] = useState<{ id: string; year: number; title: string }[]>([]);
  const [livestreams, setLivestreams] = useState<{ id: string; title: string; streamUrl: string }[]>([]);
  const [candleTotal, setCandleTotal] = useState(0);
  const [form, setForm] = useState({
    deceasedName: "", biography: "", familyName: "", familyInformation: "", lifeJourney: "",
    achievements: "", education: "", career: "", faithJourney: "", legacyMessage: "",
    burialVenue: "", burialDirections: "", privacyStatus: "PUBLIC", photoUrl: "", livestreamUrl: "",
    templateSlug: "", revealStyle: "MEMORIAL_BOOK", invitationAudioCategory: "hymns",
  });
  const [programForm, setProgramForm] = useState({ title: "", startTime: "", description: "" });
  const [timelineForm, setTimelineForm] = useState({ year: "", title: "", description: "" });
  const [streamForm, setStreamForm] = useState({ title: "", streamUrl: "", provider: "YOUTUBE" });
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
      setTributes(d.data.tributes.items);
      setGuestbook(d.data.guestbook.items);
      setTimeline(d.data.timeline);
      setLivestreams(d.data.livestreams);
      setCandleTotal(d.data.candles.total);
      setForm({
        deceasedName: p.deceasedName ?? "",
        biography: p.biography ?? "",
        familyName: p.familyName ?? "",
        familyInformation: p.familyInformation ?? "",
        lifeJourney: p.lifeJourney ?? "",
        achievements: p.achievements ?? "",
        education: p.education ?? "",
        career: p.career ?? "",
        faithJourney: p.faithJourney ?? "",
        legacyMessage: p.legacyMessage ?? "",
        burialVenue: p.burialVenue ?? "",
        burialDirections: p.burialDirections ?? "",
        privacyStatus: p.privacyStatus ?? "PUBLIC",
        photoUrl: p.photoUrl ?? "",
        livestreamUrl: p.livestreamUrl ?? "",
        templateSlug: p.templateSlug ?? "",
        revealStyle: p.revealStyle ?? "MEMORIAL_BOOK",
        invitationAudioCategory: p.invitationAudioCategory ?? "hymns",
      });
    } else setError(d.error);
  }

  useEffect(() => { if (eventId) load(); }, [eventId]);

  useEffect(() => {
    if (sectionParam && SECTION_TO_TAB[sectionParam]) {
      setActiveTab(SECTION_TO_TAB[sectionParam]);
    }
  }, [sectionParam]);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    const section = TAB_TO_SECTION[tab] ?? tab;
    router.replace(`/dashboard/funeral?section=${section}`, { scroll: false });
  }

  async function saveVenueFields() {
    if (!eventId) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/funeral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        burialVenue: form.burialVenue,
        burialDirections: form.burialDirections,
      }),
    });
    if (res.ok) await load();
    else setError((await res.json()).error);
    setSaving(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/funeral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ...form }),
    });
    if (res.ok) await load();
    else setError((await res.json()).error);
    setSaving(false);
  }

  async function moderateTribute(id: string, status: "APPROVED" | "REJECTED", featured?: boolean) {
    await fetch("/api/funeral/tributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "moderate", tributeId: id, status, featured }),
    });
    load();
  }

  async function moderateGuestbook(id: string, status: "APPROVED" | "REJECTED") {
    await fetch("/api/funeral/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "moderate", entryId: id, status }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">FuneralOS Family Portal</h1>
        <p className="page-subtitle">Memorial website, obituary, tributes, candles, contributions, livestream, and legacy archive.</p>
      </div>

      <Card><CardContent className="p-4"><EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} /></CardContent></Card>

      {selectedEvent && profile && (
        <Card className="border-slate-700/20 bg-gradient-to-r from-slate-900 to-slate-800 text-[#FAF8F4]">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-gold-400" />
              <div>
                <p className="text-sm font-medium">{profile.deceasedName}</p>
                <p className="text-xs text-slate-400 flex items-center gap-2"><Flame className="h-3 w-3" />{candleTotal} candles lit</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/memorial/${selectedEvent.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /> Memorial</Link>
              </Button>
              <Button variant="outline" size="sm" className="border-white/20 text-white" asChild>
                <Link href="/dashboard/seating">Seating</Link>
              </Button>
              <Button variant="outline" size="sm" className="border-white/20 text-white" asChild>
                <Link href="/dashboard/contributions">Contributions</Link>
              </Button>
              <Button variant="outline" size="sm" className="border-white/20 text-white" asChild>
                <Link href="/dashboard/memory">Memory Vault</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {eventId && (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="obituary">Obituary</TabsTrigger>
            <TabsTrigger value="program">Program</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="tributes">Tributes</TabsTrigger>
            <TabsTrigger value="guestbook">Guestbook</TabsTrigger>
            <TabsTrigger value="livestream">Livestream</TabsTrigger>
            <TabsTrigger value="legacy">Legacy</TabsTrigger>
          </TabsList>

          <TabsContent value="obituary" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Digital Obituary</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={saveProfile} className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label>Deceased Name</Label><Input value={form.deceasedName} onChange={(e) => setForm({ ...form, deceasedName: e.target.value })} required /></div>
                    <div><Label>Family Name</Label><Input value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} /></div>
                  </div>
                  {[
                    ["biography", "Biography"], ["familyInformation", "Family Information"], ["lifeJourney", "Life Journey"],
                    ["education", "Education"], ["career", "Career"], ["achievements", "Achievements"],
                    ["faithJourney", "Faith Journey"], ["legacyMessage", "Legacy Message"],
                  ].map(([key, label]) => (
                    <div key={key}><Label>{label}</Label><Textarea value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} rows={2} /></div>
                  ))}
                  <div><Label>Memorial Photo</Label>
                    <ImageUploadCropper defaultAspect="1:1" allowedAspects={CROP_PRESETS.portrait} previewUrl={form.photoUrl || null} onClear={() => setForm({ ...form, photoUrl: "" })} onUploaded={(r) => setForm({ ...form, photoUrl: r.url })} buttonLabel="Upload portrait" hint="Upload a dignified memorial portrait." />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Invitation Template</Label>
                      <Select value={form.templateSlug || "memorial-candle-tribute"} onValueChange={(v) => setForm({ ...form, templateSlug: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FUNERAL_TEMPLATE_COLLECTIONS.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Reveal Style</Label>
                      <Select value={form.revealStyle} onValueChange={(v) => setForm({ ...form, revealStyle: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FUNERAL_REVEAL_STYLES.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Music Category</Label>
                      <Select value={form.invitationAudioCategory} onValueChange={(v) => setForm({ ...form, invitationAudioCategory: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FUNERAL_AUDIO_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Privacy</Label>
                      <Select value={form.privacyStatus} onValueChange={(v) => setForm({ ...form, privacyStatus: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PUBLIC">Public</SelectItem>
                          <SelectItem value="UNLISTED">Unlisted</SelectItem>
                          <SelectItem value="PRIVATE">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Languages: {MEMORIAL_LOCALES.map((l) => l.label).join(", ")} (configure in invitation studio)</p>
                  <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Obituary"}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="program" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Funeral Program & Venue</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={async (e) => { e.preventDefault(); await fetch("/api/funeral/program", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, ...programForm, sortOrder: program.length }) }); setProgramForm({ title: "", startTime: "", description: "" }); load(); }} className="space-y-2">
                  <Input placeholder="Program item" value={programForm.title} onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })} required />
                  <Input placeholder="Time" value={programForm.startTime} onChange={(e) => setProgramForm({ ...programForm, startTime: e.target.value })} />
                  <Button type="submit" size="sm"><Plus className="h-4 w-4" /> Add</Button>
                </form>
                {program.map((p) => <div key={p.id} className="text-sm p-3 border rounded-lg flex justify-between"><span>{p.title}</span><span className="text-slate-500">{p.startTime}</span></div>)}
                <div className="pt-3 border-t space-y-2">
                  <Label>Burial Venue</Label>
                  <Input value={form.burialVenue} onChange={(e) => setForm({ ...form, burialVenue: e.target.value })} />
                  <Label>Directions</Label>
                  <Textarea value={form.burialDirections} onChange={(e) => setForm({ ...form, burialDirections: e.target.value })} rows={2} />
                  <Button type="button" size="sm" disabled={saving} onClick={() => void saveVenueFields()}>
                    {saving ? "Saving…" : "Save Venue"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Life Timeline</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={async (e) => { e.preventDefault(); await fetch("/api/funeral/timeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, year: parseInt(timelineForm.year, 10), title: timelineForm.title, description: timelineForm.description }) }); setTimelineForm({ year: "", title: "", description: "" }); load(); }} className="grid sm:grid-cols-3 gap-2">
                  <Input placeholder="Year" value={timelineForm.year} onChange={(e) => setTimelineForm({ ...timelineForm, year: e.target.value })} required />
                  <Input placeholder="Title" value={timelineForm.title} onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })} required className="sm:col-span-2" />
                  <Button type="submit" size="sm" className="sm:col-span-3"><Plus className="h-4 w-4" /> Add Milestone</Button>
                </form>
                {timeline.map((t) => (
                  <div key={t.id} className="flex justify-between items-center p-3 border rounded-lg text-sm">
                    <span><strong>{t.year}</strong> {t.title}</span>
                    <Button size="sm" variant="ghost" onClick={async () => { await fetch(`/api/funeral/timeline?id=${t.id}`, { method: "DELETE" }); load(); }}>Remove</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tributes" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Tribute Wall Moderation</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {tributes.length === 0 ? <p className="text-sm text-slate-500">No tributes yet.</p> : tributes.map((t) => (
                  <div key={t.id} className="p-3 border rounded-lg text-sm">
                    <div className="flex justify-between"><span className="font-medium">{t.userName}</span><Badge>{t.approvalStatus}</Badge></div>
                    <p className="mt-1 text-slate-600">{t.message}</p>
                    {t.approvalStatus === "PENDING" && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={() => moderateTribute(t.id, "APPROVED")}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => moderateTribute(t.id, "REJECTED")}>Reject</Button>
                      </div>
                    )}
                    {t.approvalStatus === "APPROVED" && !t.isFeatured && (
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => moderateTribute(t.id, "APPROVED", true)}>Feature</Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guestbook" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Guestbook Moderation</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {guestbook.map((g) => (
                  <div key={g.id} className="p-3 border rounded-lg text-sm">
                    <div className="flex justify-between"><span>{g.userName}</span><Badge>{g.approvalStatus}</Badge></div>
                    <p className="mt-1">{g.message}</p>
                    {g.approvalStatus === "PENDING" && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={() => moderateGuestbook(g.id, "APPROVED")}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => moderateGuestbook(g.id, "REJECTED")}>Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="livestream" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Livestream Center</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={async (e) => { e.preventDefault(); await fetch("/api/funeral/livestreams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, title: streamForm.title, streamUrl: streamForm.streamUrl, provider: streamForm.provider }) }); setStreamForm({ title: "", streamUrl: "", provider: "YOUTUBE" }); load(); }} className="space-y-2">
                  <Input placeholder="Stream title" value={streamForm.title} onChange={(e) => setStreamForm({ ...streamForm, title: e.target.value })} required />
                  <Input placeholder="YouTube / Vimeo / Facebook URL" value={streamForm.streamUrl} onChange={(e) => setStreamForm({ ...streamForm, streamUrl: e.target.value })} required />
                  <Select value={streamForm.provider} onValueChange={(v) => setStreamForm({ ...streamForm, provider: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["YOUTUBE", "VIMEO", "FACEBOOK", "RTMP", "OTHER"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="submit" size="sm"><Plus className="h-4 w-4" /> Add Stream</Button>
                </form>
                {livestreams.map((s) => (
                  <div key={s.id} className="p-3 border rounded-lg text-sm flex justify-between"><span>{s.title}</span><a href={s.streamUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 text-xs">Open</a></div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legacy" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Archive className="h-4 w-4" /> Legacy Archive</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">Publish a permanent snapshot of obituary, tributes, timeline, candles, gallery, and contributions.</p>
                <Button onClick={async () => {
                  const res = await fetch("/api/funeral/legacy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, visibility: "FAMILY_ONLY" }) });
                  if (res.ok) alert("Legacy archive published.");
                }}>Publish Legacy Archive</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
