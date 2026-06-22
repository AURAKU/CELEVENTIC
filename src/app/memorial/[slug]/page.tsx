"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MapPin, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface MemorialData {
  eventId: string;
  slug: string;
  title: string;
  startDate: string;
  venueName: string | null;
  mapsLink: string | null;
  profile: {
    deceasedName: string;
    biography: string | null;
    familyName: string | null;
    photoUrl: string | null;
    dateOfPassing: string | null;
    burialVenue: string | null;
    burialDirections: string | null;
    livestreamUrl: string | null;
  };
  program: { title: string; description: string | null; startTime: string | null }[];
  tributes: { id: string; userName: string; message: string; createdAt: string }[];
  contributions: { contributor: string; amount: number; currency: string; message: string | null }[];
}

export default function MemorialPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<MemorialData | null>(null);
  const [error, setError] = useState("");
  const [tribute, setTribute] = useState({ userName: "", message: "" });
  const [contribution, setContribution] = useState({ contributor: "", email: "", amount: "", message: "", isAnonymous: false });
  const [contribError, setContribError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [contributed, setContributed] = useState(false);

  useEffect(() => {
    fetch(`/api/memorial/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setError(d.error || "Memorial not found");
      });
  }, [slug]);

  async function submitTribute(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;

    const res = await fetch("/api/funeral/tributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: data.eventId,
        userName: tribute.userName,
        message: tribute.message,
      }),
    });

    if (res.ok) {
      setSubmitted(true);
      setTribute({ userName: "", message: "" });
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

  if (!data) {
    return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-[#FAF8F4]">Loading...</div>;
  }

  const p = data.profile;

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#FAF8F4]">
      <header className="border-b border-white/10 py-12 px-6 text-center">
        {p.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoUrl} alt={p.deceasedName} className="w-32 h-32 rounded-full object-cover mx-auto mb-6 border-2 border-[#D4A63A]/50" />
        )}
        <p className="text-[#D4A63A] text-sm tracking-widest uppercase mb-2">In Loving Memory</p>
        <h1 className="text-3xl md:text-4xl font-display font-semibold">{p.deceasedName}</h1>
        {p.familyName && <p className="text-slate-400 mt-2">The {p.familyName} Family</p>}
        {p.dateOfPassing && (
          <p className="text-sm text-slate-500 mt-3 flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date(p.dateOfPassing).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {p.biography && (
          <section>
            <h2 className="text-[#D4A63A] text-sm font-semibold uppercase tracking-wider mb-3">Obituary</h2>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{p.biography}</p>
          </section>
        )}

        {data.program.length > 0 && (
          <section>
            <h2 className="text-[#D4A63A] text-sm font-semibold uppercase tracking-wider mb-3">Funeral Program</h2>
            <div className="space-y-2">
              {data.program.map((item, i) => (
                <div key={i} className="flex justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                  <span>{item.title}</span>
                  {item.startTime && <span className="text-slate-500">{item.startTime}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        {(p.burialVenue || p.burialDirections) && (
          <section>
            <h2 className="text-[#D4A63A] text-sm font-semibold uppercase tracking-wider mb-3">Burial Directions</h2>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                {p.burialVenue && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#0B8A83]" />{p.burialVenue}</p>}
                {p.burialDirections && <p className="text-slate-400 mt-2 text-sm">{p.burialDirections}</p>}
                {data.mapsLink && (
                  <a href={data.mapsLink} target="_blank" rel="noopener noreferrer" className="text-[#0B8A83] text-sm mt-3 inline-block">
                    Open in Maps →
                  </a>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {data.tributes.length > 0 && (
          <section>
            <h2 className="text-[#D4A63A] text-sm font-semibold uppercase tracking-wider mb-3">Tribute Wall</h2>
            <div className="space-y-3">
              {data.tributes.map((t) => (
                <div key={t.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-slate-300 italic">&ldquo;{t.message}&rdquo;</p>
                  <p className="text-xs text-slate-500 mt-2">— {t.userName}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-[#D4A63A] text-sm font-semibold uppercase tracking-wider mb-3">Leave a Tribute</h2>
          {submitted ? (
            <p className="text-[#0B8A83] text-sm">Thank you. Your tribute has been submitted for review.</p>
          ) : (
            <form onSubmit={submitTribute} className="space-y-3">
              <Input value={tribute.userName} onChange={(e) => setTribute({ ...tribute, userName: e.target.value })} placeholder="Your name" required className="bg-white/5 border-white/20 text-white" />
              <Textarea value={tribute.message} onChange={(e) => setTribute({ ...tribute, message: e.target.value })} placeholder="Your message of condolence..." rows={4} required className="bg-white/5 border-white/20 text-white" />
              <Button type="submit" className="bg-[#0B8A83] hover:bg-[#0B8A83]/90">Submit Tribute</Button>
            </form>
          )}
        </section>

        <section>
          <h2 className="text-[#D4A63A] text-sm font-semibold uppercase tracking-wider mb-3">Family Contribution</h2>
          {contributed ? (
            <p className="text-[#0B8A83] text-sm">Thank you for your generous contribution.</p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setContribError("");
                const res = await fetch("/api/public/contribute", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    eventSlug: slug,
                    contributor: contribution.contributor,
                    email: contribution.email,
                    amount: parseFloat(contribution.amount),
                    message: contribution.message,
                    isAnonymous: contribution.isAnonymous,
                  }),
                });
                const payload = await res.json();
                if (res.ok && payload.data?.authorizationUrl) {
                  window.location.href = payload.data.authorizationUrl;
                  return;
                }
                if (res.ok && !payload.data?.requiresPayment) {
                  setContributed(true);
                  const refreshed = await fetch(`/api/memorial/${slug}`).then((r) => r.json());
                  if (refreshed.success) setData(refreshed.data);
                  return;
                }
                setContribError(payload.error || "Contribution failed");
              }}
              className="space-y-3"
            >
              {contribError && <p className="text-sm text-red-400">{contribError}</p>}
              <Input value={contribution.contributor} onChange={(e) => setContribution({ ...contribution, contributor: e.target.value })} placeholder="Your name" required className="bg-white/5 border-white/20 text-white" />
              <Input type="email" value={contribution.email} onChange={(e) => setContribution({ ...contribution, email: e.target.value })} placeholder="Email for receipt" required className="bg-white/5 border-white/20 text-white" />
              <Input type="number" value={contribution.amount} onChange={(e) => setContribution({ ...contribution, amount: e.target.value })} placeholder="Amount (GHS)" required min="1" className="bg-white/5 border-white/20 text-white" />
              <Textarea value={contribution.message} onChange={(e) => setContribution({ ...contribution, message: e.target.value })} placeholder="Optional message" rows={2} className="bg-white/5 border-white/20 text-white" />
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input type="checkbox" checked={contribution.isAnonymous} onChange={(e) => setContribution({ ...contribution, isAnonymous: e.target.checked })} />
                Contribute anonymously
              </label>
              <Button type="submit" className="bg-[#D4A63A] text-[#0F172A] hover:bg-[#D4A63A]/90">Send Contribution</Button>
            </form>
          )}
        </section>

        {data.contributions.length > 0 && (
          <section>
            <h2 className="text-[#D4A63A] text-sm font-semibold uppercase tracking-wider mb-3">Recent Contributions</h2>
            <div className="space-y-2">
              {data.contributions.map((c, i) => (
                <div key={i} className="flex justify-between text-sm p-3 rounded-lg bg-white/5">
                  <span>{c.contributor}</span>
                  <span className="text-[#D4A63A]">{formatCurrency(c.amount, c.currency)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {p.livestreamUrl && (
          <a href={p.livestreamUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full border-[#D4A63A] text-[#D4A63A]">Watch Livestream</Button>
          </a>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-slate-600 border-t border-white/10">
        Memorial page by <Link href="/" className="text-[#0B8A83]">Celeventic</Link> · Powered by AGI
      </footer>
    </div>
  );
}
