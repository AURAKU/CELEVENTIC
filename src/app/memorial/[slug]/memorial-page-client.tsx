"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadedMedia } from "@/components/media/uploaded-media";
import {
  Heart,
  MapPin,
  Calendar,
  Flame,
  BookOpen,
  Video,
  ImageIcon,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CONTRIBUTION_PURPOSES } from "@/lib/funeral/funeral-constants";

type Tab =
  | "obituary"
  | "program"
  | "timeline"
  | "tributes"
  | "candles"
  | "guestbook"
  | "gallery"
  | "contribute"
  | "livestream";

interface MemorialProfile {
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
  dateOfBirth: string | null;
  dateOfPassing: string | null;
  burialVenue: string | null;
  burialDirections: string | null;
  livestreamUrl: string | null;
  familyContacts: unknown;
}

interface MemorialData {
  eventId: string;
  slug: string;
  title: string;
  startDate: string;
  venueName: string | null;
  mapsLink: string | null;
  profile: MemorialProfile;
  program: { title: string; description: string | null; startTime: string | null }[];
  stats?: { candleCount: number; tributeCount: number; guestbookCount: number };
  tributes?: { items: { id: string; userName: string; message: string; isFeatured: boolean; createdAt: string }[] };
  candles?: { items: { id: string; userName: string; message: string | null; country: string | null; createdAt: string }[]; total: number };
  guestbook?: { items: { id: string; userName: string; message: string; entryType: string; scriptureRef: string | null }[] };
  timeline?: { id: string; year: number; title: string; description: string | null }[];
  gallery?: { items: { id: string; kind: string; url: string; caption: string | null }[] };
  contributions?: { items: { contributor: string; amount: number; currency: string; purpose?: string }[] };
  livestreams?: { id: string; title: string; streamUrl: string; provider: string; isLive: boolean; scheduledAt: string | null }[];
  thankYou?: { shareToken: string | null; status: string } | null;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "obituary", label: "Obituary" },
  { id: "program", label: "Schedule" },
  { id: "timeline", label: "Life Journey" },
  { id: "tributes", label: "Tributes" },
  { id: "candles", label: "Candles" },
  { id: "guestbook", label: "Guestbook" },
  { id: "gallery", label: "Gallery" },
  { id: "contribute", label: "Support" },
  { id: "livestream", label: "Livestream" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[#D4A63A] text-sm font-semibold uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  );
}

export function MemorialPageClient() {
  const params = useParams();
  const slug = params.slug as string;
  const [tab, setTab] = useState<Tab>("obituary");
  const [data, setData] = useState<MemorialData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [tribute, setTribute] = useState({ userName: "", message: "" });
  const [candle, setCandle] = useState({ userName: "", message: "", country: "" });
  const [guestbook, setGuestbook] = useState({ userName: "", message: "", entryType: "CONDOLENCE" });
  const [contribution, setContribution] = useState({
    contributor: "",
    email: "",
    amount: "",
    message: "",
    purpose: "FAMILY_SUPPORT",
    isAnonymous: false,
  });
  const [submitMsg, setSubmitMsg] = useState("");

  const load = useCallback(async (section = "overview") => {
    const res = await fetch(`/api/memorial/${slug}?section=${section}&limit=20`);
    const d = await res.json();
    if (d.success) {
      setData((prev) => ({ ...(prev ?? d.data), ...d.data }));
      setError("");
    } else {
      setError(d.error || "Memorial not found");
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    load("overview");
  }, [load]);

  useEffect(() => {
    if (tab === "obituary" || tab === "program") return;
    load(tab);
  }, [tab, load]);

  async function submitTribute(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const res = await fetch("/api/funeral/tributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: data.eventId, ...tribute }),
    });
    if (res.ok) {
      setSubmitMsg("Tribute submitted for family review.");
      setTribute({ userName: "", message: "" });
      load("tributes");
    }
  }

  async function submitCandle(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const res = await fetch("/api/funeral/candles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: data.eventId, ...candle }),
    });
    if (res.ok) {
      setSubmitMsg("Your candle has been lit.");
      setCandle({ userName: "", message: "", country: "" });
      load("candles");
      load("overview");
    }
  }

  async function submitGuestbook(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const res = await fetch("/api/funeral/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: data.eventId, ...guestbook }),
    });
    if (res.ok) {
      setSubmitMsg("Guestbook entry submitted for review.");
      setGuestbook({ userName: "", message: "", entryType: "CONDOLENCE" });
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-[#FAF8F4] flex items-center justify-center p-6">
        <div className="text-center">
          <Heart className="h-12 w-12 text-[#D4A63A] mx-auto mb-4" />
          <h1 className="text-xl font-semibold">Memorial Not Available</h1>
          <p className="text-slate-400 mt-2">{error}</p>
          <Link href="/" className="text-[#0B8A83] mt-4 inline-block">Return home</Link>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-[#FAF8F4]">Loading memorial…</div>;
  }

  const p = data.profile;

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#FAF8F4]">
      <header className="border-b border-white/10 py-10 px-6 text-center">
        {p.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoUrl} alt={p.deceasedName} className="w-28 h-28 rounded-full object-cover mx-auto mb-5 border-2 border-[#D4A63A]/50" />
        )}
        <p className="text-[#D4A63A] text-xs tracking-[0.25em] uppercase mb-2">In Loving Memory</p>
        <h1 className="text-3xl md:text-4xl font-display font-semibold">{p.deceasedName}</h1>
        {p.familyName && <p className="text-slate-400 mt-2">The {p.familyName} Family</p>}
        {p.dateOfPassing && (
          <p className="text-sm text-slate-500 mt-3 flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date(p.dateOfPassing).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        {data.stats && (
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-amber-400" />{data.stats.candleCount} candles</span>
            <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-400" />{data.stats.tributeCount} tributes</span>
            <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{data.stats.guestbookCount} messages</span>
          </div>
        )}
      </header>

      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#0F172A]/95 backdrop-blur overflow-x-auto">
        <div className="flex gap-1 px-4 py-2 min-w-max max-w-4xl mx-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setSubmitMsg(""); }}
              className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                tab === t.id ? "bg-[#0B8A83] text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {submitMsg && (
          <p className="text-sm text-[#0B8A83] bg-[#0B8A83]/10 border border-[#0B8A83]/30 rounded-xl px-4 py-3">{submitMsg}</p>
        )}

        {tab === "obituary" && (
          <div className="space-y-8">
            {[
              ["Biography", p.biography],
              ["Family", p.familyInformation],
              ["Life Journey", p.lifeJourney],
              ["Education", p.education],
              ["Career", p.career],
              ["Achievements", p.achievements],
              ["Faith Journey", p.faithJourney],
              ["Legacy Message", p.legacyMessage],
            ].map(([label, text]) =>
              text ? (
                <Section key={label as string} title={label as string}>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{text as string}</p>
                </Section>
              ) : null
            )}
            {p.dateOfBirth && (
              <Section title="Dates">
                <p className="text-slate-400 text-sm">
                  Born {new Date(p.dateOfBirth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  {p.dateOfPassing && (
                    <> · Passed {new Date(p.dateOfPassing).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</>
                  )}
                </p>
              </Section>
            )}
          </div>
        )}

        {tab === "program" && (
          <div className="space-y-6">
            {data.program.length > 0 && (
              <Section title="Funeral Program">
                <div className="space-y-2">
                  {data.program.map((item, i) => (
                    <div key={i} className="flex justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                      </div>
                      {item.startTime && <span className="text-slate-500 text-sm">{item.startTime}</span>}
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {(p.burialVenue || data.venueName) && (
              <Section title="Venue">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 space-y-2">
                    <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#0B8A83]" />{p.burialVenue ?? data.venueName}</p>
                    {p.burialDirections && <p className="text-slate-400 text-sm">{p.burialDirections}</p>}
                    {data.mapsLink && (
                      <a href={data.mapsLink} target="_blank" rel="noopener noreferrer" className="text-[#0B8A83] text-sm inline-block">Open in Maps</a>
                    )}
                  </CardContent>
                </Card>
              </Section>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-white/20 text-white" asChild>
                <Link href={`/events/${slug}/memories`}>Memory Gallery</Link>
              </Button>
              <Button variant="outline" className="border-white/20 text-white" asChild>
                <Link href={`/events/${slug}/thank-you`}>Thank You Page</Link>
              </Button>
            </div>
          </div>
        )}

        {tab === "timeline" && (
          <Section title="Memorial Timeline">
            {!data.timeline?.length ? (
              <p className="text-slate-500 text-sm">Life timeline will appear here.</p>
            ) : (
              <div className="relative border-l border-[#D4A63A]/40 ml-3 space-y-6 pl-6">
                {data.timeline.map((entry) => (
                  <div key={entry.id} className="relative">
                    <span className="absolute -left-[1.85rem] top-1 h-3 w-3 rounded-full bg-[#D4A63A]" />
                    <p className="text-[#D4A63A] font-semibold">{entry.year}</p>
                    <p className="font-medium">{entry.title}</p>
                    {entry.description && <p className="text-sm text-slate-400 mt-1">{entry.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {tab === "tributes" && (
          <div className="space-y-6">
            {data.tributes?.items?.length ? (
              <div className="space-y-3">
                {data.tributes.items.map((t) => (
                  <div key={t.id} className={`p-4 rounded-lg border ${t.isFeatured ? "border-[#D4A63A]/50 bg-[#D4A63A]/5" : "border-white/10 bg-white/5"}`}>
                    {t.isFeatured && <Badge className="mb-2 bg-[#D4A63A] text-slate-900">Featured</Badge>}
                    <p className="text-slate-300 italic">&ldquo;{t.message}&rdquo;</p>
                    <p className="text-xs text-slate-500 mt-2">{t.userName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No tributes yet. Be the first to share a message.</p>
            )}
            <Section title="Leave a Tribute">
              <form onSubmit={submitTribute} className="space-y-3">
                <Input value={tribute.userName} onChange={(e) => setTribute({ ...tribute, userName: e.target.value })} placeholder="Your name" required className="bg-white/5 border-white/20 text-white" />
                <Textarea value={tribute.message} onChange={(e) => setTribute({ ...tribute, message: e.target.value })} placeholder="Your message of condolence…" rows={4} required className="bg-white/5 border-white/20 text-white" />
                <Button type="submit" className="bg-[#0B8A83]">Submit Tribute</Button>
              </form>
            </Section>
          </div>
        )}

        {tab === "candles" && (
          <div className="space-y-6">
            <Section title="Light a Virtual Candle">
              <form onSubmit={submitCandle} className="space-y-3">
                <Input value={candle.userName} onChange={(e) => setCandle({ ...candle, userName: e.target.value })} placeholder="Your name" required className="bg-white/5 border-white/20 text-white" />
                <Input value={candle.country} onChange={(e) => setCandle({ ...candle, country: e.target.value })} placeholder="Country (optional)" className="bg-white/5 border-white/20 text-white" />
                <Textarea value={candle.message} onChange={(e) => setCandle({ ...candle, message: e.target.value })} placeholder="Optional message" rows={2} className="bg-white/5 border-white/20 text-white" />
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700"><Flame className="h-4 w-4 mr-1" /> Light Candle</Button>
              </form>
            </Section>
            {data.candles?.items?.length ? (
              <Section title={`${data.candles.total} Candles Lit`}>
                <div className="grid sm:grid-cols-2 gap-2">
                  {data.candles.items.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                      <p className="flex items-center gap-1 font-medium"><Flame className="h-3.5 w-3.5 text-amber-400" />{c.userName}</p>
                      {c.message && <p className="text-slate-400 text-xs mt-1">{c.message}</p>}
                      {c.country && <p className="text-slate-600 text-[10px] mt-1">{c.country}</p>}
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>
        )}

        {tab === "guestbook" && (
          <div className="space-y-6">
            {data.guestbook?.items?.length ? (
              <div className="space-y-3">
                {data.guestbook.items.map((g) => (
                  <div key={g.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <Badge variant="outline" className="text-[10px] mb-2">{g.entryType}</Badge>
                    <p className="text-slate-300">{g.message}</p>
                    {g.scriptureRef && <p className="text-xs text-[#D4A63A] mt-1">{g.scriptureRef}</p>}
                    <p className="text-xs text-slate-500 mt-2">{g.userName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No guestbook entries yet.</p>
            )}
            <Section title="Sign the Guestbook">
              <form onSubmit={submitGuestbook} className="space-y-3">
                <Input value={guestbook.userName} onChange={(e) => setGuestbook({ ...guestbook, userName: e.target.value })} placeholder="Your name" required className="bg-white/5 border-white/20 text-white" />
                <select
                  value={guestbook.entryType}
                  onChange={(e) => setGuestbook({ ...guestbook, entryType: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  <option value="CONDOLENCE">Condolence</option>
                  <option value="PRAYER">Prayer</option>
                  <option value="SCRIPTURE">Scripture</option>
                  <option value="MESSAGE">Message</option>
                </select>
                <Textarea value={guestbook.message} onChange={(e) => setGuestbook({ ...guestbook, message: e.target.value })} placeholder="Your message…" rows={3} required className="bg-white/5 border-white/20 text-white" />
                <Button type="submit" className="bg-[#0B8A83]">Submit</Button>
              </form>
            </Section>
          </div>
        )}

        {tab === "gallery" && (
          <Section title="Memory Gallery">
            {!data.gallery?.items?.length ? (
              <p className="text-slate-500 text-sm">Gallery photos and videos will appear here.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.gallery.items.map((m) => (
                  <div key={m.id} className="rounded-lg overflow-hidden border border-white/10 bg-white/5 aspect-square relative">
                    <UploadedMedia
                      src={m.url}
                      alt={m.caption ?? "Memorial"}
                      className="w-full h-full object-cover"
                      video={m.kind === "VIDEO"}
                      controls={m.kind === "VIDEO"}
                      autoPlay={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {tab === "contribute" && (
          <div className="space-y-6">
            <Section title="Family Support & Contributions">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmitMsg("");
                  const res = await fetch("/api/public/contribute", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      eventSlug: slug,
                      contributor: contribution.contributor,
                      email: contribution.email,
                      amount: parseFloat(contribution.amount),
                      message: contribution.message,
                      purpose: contribution.purpose,
                      isAnonymous: contribution.isAnonymous,
                    }),
                  });
                  const payload = await res.json();
                  if (res.ok && payload.data?.authorizationUrl) {
                    window.location.href = payload.data.authorizationUrl;
                    return;
                  }
                  setSubmitMsg(payload.error || "Contribution could not be processed.");
                }}
                className="space-y-3"
              >
                <select
                  value={contribution.purpose}
                  onChange={(e) => setContribution({ ...contribution, purpose: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  {CONTRIBUTION_PURPOSES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <Input value={contribution.contributor} onChange={(e) => setContribution({ ...contribution, contributor: e.target.value })} placeholder="Your name" required className="bg-white/5 border-white/20 text-white" />
                <Input type="email" value={contribution.email} onChange={(e) => setContribution({ ...contribution, email: e.target.value })} placeholder="Email for receipt" required className="bg-white/5 border-white/20 text-white" />
                <Input type="number" value={contribution.amount} onChange={(e) => setContribution({ ...contribution, amount: e.target.value })} placeholder="Amount (GHS)" required min="1" className="bg-white/5 border-white/20 text-white" />
                <Textarea value={contribution.message} onChange={(e) => setContribution({ ...contribution, message: e.target.value })} placeholder="Optional message" rows={2} className="bg-white/5 border-white/20 text-white" />
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <input type="checkbox" checked={contribution.isAnonymous} onChange={(e) => setContribution({ ...contribution, isAnonymous: e.target.checked })} />
                  Contribute anonymously
                </label>
                <Button type="submit" className="bg-[#D4A63A] text-[#0F172A]">Send Contribution</Button>
              </form>
            </Section>
            {data.contributions?.items?.length ? (
              <Section title="Recent Contributions">
                <div className="space-y-2">
                  {data.contributions.items.map((c, i) => (
                    <div key={i} className="flex justify-between text-sm p-3 rounded-lg bg-white/5">
                      <span>{c.contributor}</span>
                      <span className="text-[#D4A63A]">{formatCurrency(c.amount, c.currency)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>
        )}

        {tab === "livestream" && (
          <Section title="Livestream">
            {data.livestreams?.length ? (
              <div className="space-y-3">
                {data.livestreams.map((s) => (
                  <Card key={s.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {s.isLive && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                          {s.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{s.provider}</p>
                        {s.scheduledAt && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(s.scheduledAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Button asChild size="sm" className="bg-[#0B8A83] shrink-0">
                        <a href={s.streamUrl} target="_blank" rel="noopener noreferrer">Watch</a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : p.livestreamUrl ? (
              <Button asChild className="w-full border-[#D4A63A] text-[#D4A63A]" variant="outline">
                <a href={p.livestreamUrl} target="_blank" rel="noopener noreferrer">Watch Livestream</a>
              </Button>
            ) : (
              <p className="text-slate-500 text-sm">Livestream details will be shared by the family.</p>
            )}
          </Section>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-slate-600 border-t border-white/10">
        Memorial by <Link href="/" className="text-[#0B8A83]">Celeventic FuneralOS</Link>
      </footer>
    </div>
  );
}
