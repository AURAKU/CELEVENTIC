"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { Heart, MapPin, Flame, BookOpen, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CONTRIBUTION_PURPOSES } from "@/lib/funeral/funeral-constants";
import { PaginatedSection } from "@/components/ui/paginated-section";
import {
  CeremonialOrnament,
  FamilyAnnouncementBlock,
  FlowerTribute,
  FuneralDressCodeSection,
  FuneralExperienceShell,
  FuneralMemorialIntro,
  FuneralProgrammeTimeline,
  MemorialAudioController,
  MemorialCalendarActions,
  MemorialClosing,
  MemorialPortraitHero,
  MemorialShareBar,
  MemorialVenueCards,
  MemoryVaultCta,
} from "@/components/funeral-experience";
import { resolveMotionLevel } from "@/lib/funeral-experience/experience-resolver";
import { resolveMemorialExperience } from "@/lib/funeral-experience/experience-config";
import { computeAgeYears, formatLifeDates } from "@/lib/funeral-experience/terminology";
import {
  detectLowBandwidth,
  HASH_TO_TAB,
  inferProgrammeDayLabel,
  inferVenueFromDescription,
} from "@/lib/funeral-experience/programme-utils";
import type { FuneralMotionLevel } from "@/lib/funeral-experience/themes";

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
  theme?: string | null;
  templateSlug?: string | null;
  revealStyle?: string | null;
  invitationAudioCategory?: string | null;
  age?: number | null;
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
  { id: "guestbook", label: "Condolences" },
  { id: "gallery", label: "Gallery" },
  { id: "contribute", label: "Support" },
  { id: "livestream", label: "Livestream" },
];

const AUDIO_BY_CATEGORY: Record<string, string> = {
  hymns: "/music/memorial-piano.mp3",
  instrumentals: "/music/memorial-violin.mp3",
  piano: "/music/memorial-piano.mp3",
  violin: "/music/memorial-violin.mp3",
  choir: "/music/memorial-piano.mp3",
  traditional: "/music/memorial-violin.mp3",
  gospel: "/music/memorial-piano.mp3",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--funeral-gold, #D4A63A)" }}>
        {title}
      </h2>
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
  const [introDone, setIntroDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [replayIntro, setReplayIntro] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setLowBandwidth(detectLowBandwidth());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "").toLowerCase();
    const mapped = HASH_TO_TAB[hash];
    if (mapped) setTab(mapped as Tab);
  }, []);

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

  const resolved = useMemo(() => {
    if (!data) return null;
    return resolveMemorialExperience({
      theme: data.profile.theme,
      templateSlug: data.profile.templateSlug,
      revealStyle: data.profile.revealStyle,
      familyContacts: data.profile.familyContacts,
    });
  }, [data]);

  const motion: FuneralMotionLevel = resolveMotionLevel(
    resolved?.motionPreferred ?? "ceremonial",
    reduceMotion,
    lowBandwidth
  );

  async function submitTribute(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const res = await fetch("/api/funeral/tributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: data.eventId, ...tribute }),
    });
    if (res.ok) {
      setSubmitMsg("Thank you. Your tribute has been noted for family review.");
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
      setSubmitMsg("Your candle has been lit in remembrance.");
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
      setSubmitMsg(`Thank you for remembering ${data.profile.deceasedName} with us.`);
      setGuestbook({ userName: "", message: "", entryType: "CONDOLENCE" });
      load("guestbook");
    }
  }

  if (error) {
    return (
      <div className="min-h-app-viewport bg-[#0F172A] text-[#FAF8F4] flex items-center justify-center p-6">
        <div className="text-center">
          <Heart className="h-12 w-12 text-[#D4A63A] mx-auto mb-4" />
          <h1 className="text-xl font-semibold">Memorial Not Available</h1>
          <p className="text-slate-400 mt-2">{error}</p>
          <Link href="/" className="text-[#0B8A83] mt-4 inline-block">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !data || !resolved) {
    return (
      <div className="min-h-app-viewport bg-[#0F172A] flex items-center justify-center text-[#FAF8F4]">
        Loading memorial…
      </div>
    );
  }

  const p = data.profile;
  const exp = resolved.experience;
  const lifeDatesLabel = formatLifeDates({
    dateOfBirth: p.dateOfBirth,
    dateOfPassing: p.dateOfPassing,
    format: exp.lifeDateFormat ?? "sunrise-sunset",
  });
  const ageYears = p.age ?? computeAgeYears(p.dateOfBirth, p.dateOfPassing);
  const displayName = [exp.honorificTitle, p.deceasedName].filter(Boolean).join(" ");
  const nameParts = p.deceasedName.trim().split(/\s+/);
  const givenName = nameParts.length > 1 ? nameParts[0] : null;
  const familyNamePart = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
  const announcement =
    p.familyInformation?.trim() ||
    (p.familyName
      ? `With deep sorrow but gratitude for a life well lived, the ${p.familyName} and allied families respectfully invite relatives, friends and well-wishers to join us as we celebrate this life.`
      : "");
  const programmeItems = data.program.map((item, index) => ({
    id: `program-${index}`,
    dayLabel: inferProgrammeDayLabel(item.title, item.description, index),
    title: item.title,
    description: item.description,
    startTime: item.startTime,
    venue:
      inferVenueFromDescription(item.description) ||
      (index === 0 ? p.burialVenue || data.venueName : null),
  }));

  const venues =
    resolved.venues.length > 0
      ? resolved.venues
      : [
          ...(p.burialVenue
            ? [
                {
                  name: p.burialVenue,
                  role: "Burial / Interment",
                  notes: p.burialDirections,
                  mapsLink: data.mapsLink,
                },
              ]
            : []),
          ...(data.venueName && data.venueName !== p.burialVenue
            ? [{ name: data.venueName, role: "Main Venue", mapsLink: data.mapsLink }]
            : []),
        ];

  const shareText = `Funeral Invitation — ${displayName}${lifeDatesLabel ? ` · ${lifeDatesLabel}` : ""}`;
  const audioSrc = AUDIO_BY_CATEGORY[p.invitationAudioCategory || "piano"] || "/music/memorial-piano.mp3";
  const galleryPhotos = (data.gallery?.items ?? [])
    .filter((m) => m.kind !== "VIDEO")
    .map((m) => m.url)
    .slice(0, 6);

  const ornamentVariant =
    resolved.themeId === "ghana-heritage" || resolved.themeId === "black-red-tradition"
      ? "heritage"
      : resolved.themeId === "church-memorial"
        ? "cross"
        : resolved.themeId === "eternal-rose" || resolved.themeId === "peaceful-garden"
          ? "flourish"
          : "line";

  return (
    <FuneralExperienceShell themeId={resolved.themeId} motion={motion}>
      {!introDone ? (
        <FuneralMemorialIntro
          memorialKey={slug}
          introId={resolved.introId}
          deceasedName={displayName}
          lifeDatesLabel={lifeDatesLabel || undefined}
          familyLine={p.familyName ? `The ${p.familyName} and allied families` : undefined}
          photoUrl={p.photoUrl}
          memoryPhotos={galleryPhotos}
          motion={motion}
          policy={resolved.introPolicy}
          onEnter={() => setIntroDone(true)}
          onReplayReady={(fn) => setReplayIntro(() => fn)}
        />
      ) : null}

      {introDone ? (
        <MemorialAudioController src={lowBandwidth ? null : audioSrc} title="Memorial music" />
      ) : null}

      <div className="min-h-app-viewport overflow-x-hidden min-w-0" style={{ opacity: introDone ? 1 : 0.35 }}>
        <MemorialPortraitHero
          photoUrl={p.photoUrl}
          fullName={displayName}
          givenName={givenName}
          familyName={familyNamePart}
          aka={exp.aka}
          relationship={
            exp.relationshipLabel || (p.familyName ? `The ${p.familyName} Family` : null)
          }
          lifeDatesLabel={lifeDatesLabel}
          ageYears={ageYears}
          frameShape={resolved.frameShape}
          eyebrow={exp.announcementMode ? "Funeral Announcement" : "In Loving Memory"}
        />

        <CeremonialOrnament variant={ornamentVariant} />

        <MemorialShareBar title={`Funeral Invitation — ${displayName}`} text={shareText} />

        {data.stats && (exp.showCandleCount !== false) ? (
          <div
            className="flex flex-wrap justify-center gap-4 -mt-1 mb-4 text-xs"
            style={{ color: "var(--funeral-muted)" }}
          >
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              {data.stats.candleCount} candles
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              {data.stats.tributeCount} tributes
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {data.stats.guestbookCount} messages
            </span>
          </div>
        ) : null}

        <nav
          className="sticky top-0 z-40 border-b backdrop-blur overflow-x-auto"
          style={{
            borderColor: "var(--funeral-border)",
            background: "color-mix(in srgb, var(--funeral-bg) 92%, transparent)",
          }}
          aria-label="Memorial sections"
        >
          <div className="flex gap-1 px-4 py-2 min-w-max max-w-4xl mx-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                id={
                  t.id === "tributes"
                    ? "tributes"
                    : t.id === "contribute"
                      ? "contributions"
                      : t.id === "livestream"
                        ? "livestream"
                        : t.id === "gallery"
                          ? "memories"
                          : undefined
                }
                onClick={() => {
                  setTab(t.id);
                  setSubmitMsg("");
                }}
                className="px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors min-h-11"
                style={
                  tab === t.id
                    ? { background: "var(--funeral-primary)", color: "#fff" }
                    : { color: "var(--funeral-muted)" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
          {submitMsg ? (
            <p
              className="text-sm rounded-xl px-4 py-3"
              style={{
                color: "var(--funeral-gold)",
                border: "1px solid var(--funeral-border)",
                background: "var(--funeral-surface)",
              }}
            >
              {submitMsg}
            </p>
          ) : null}

          {exp.announcementMode ? (
            <p
              className="text-center text-sm rounded-xl px-4 py-3"
              style={{
                color: "var(--funeral-muted)",
                border: "1px solid var(--funeral-border)",
                background: "var(--funeral-surface)",
              }}
            >
              Funeral arrangements will be announced later.
            </p>
          ) : null}

          {tab === "obituary" && (
            <div className="space-y-8">
              <FamilyAnnouncementBlock text={announcement} />
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
                    <p className="leading-relaxed whitespace-pre-wrap" style={{ color: "var(--funeral-muted)" }}>
                      {text as string}
                    </p>
                  </Section>
                ) : null
              )}
              {!exp.announcementMode && programmeItems.length > 0 ? (
                <FuneralProgrammeTimeline items={programmeItems.slice(0, 8)} />
              ) : null}
              {!exp.announcementMode ? <FuneralDressCodeSection days={resolved.dressCode} /> : null}
              {!exp.announcementMode ? <MemorialVenueCards venues={venues} /> : null}
              <MemoryVaultCta eventSlug={slug} deceasedName={displayName} />
              <FlowerTribute
                memorialKey={slug}
                deceasedName={displayName}
                enabled={exp.enableFlowerTribute === true}
              />
              {resolved.contacts.length > 0 ? (
                <Section title="Family Contacts">
                  <div className="space-y-2">
                    {resolved.contacts.map((c) => (
                      <div
                        key={`${c.name}-${c.phone}`}
                        className="rounded-xl px-4 py-3 text-sm"
                        style={{
                          border: "1px solid var(--funeral-border)",
                          background: "var(--funeral-surface)",
                        }}
                      >
                        <p className="font-medium">{c.name}</p>
                        {c.role ? <p style={{ color: "var(--funeral-muted)" }}>{c.role}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {c.phone ? (
                            <a className="underline" style={{ color: "var(--funeral-gold)" }} href={`tel:${c.phone}`}>
                              Call
                            </a>
                          ) : null}
                          {c.whatsapp ? (
                            <a
                              className="underline"
                              style={{ color: "var(--funeral-gold)" }}
                              href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              WhatsApp
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}
              {replayIntro ? (
                <div className="flex justify-center">
                  <button type="button" className="text-xs underline" style={{ color: "var(--funeral-muted)" }} onClick={() => replayIntro()}>
                    Replay Intro
                  </button>
                </div>
              ) : null}
              <MemorialClosing
                deceasedName={displayName}
                lifeDatesLabel={lifeDatesLabel}
                line={exp.closingLine}
                farewell={exp.farewellLine}
              />
            </div>
          )}

          {tab === "program" && (
            <div className="space-y-6" id="program">
              {programmeItems.length > 0 && <FuneralProgrammeTimeline items={programmeItems} />}
              <MemorialCalendarActions
                deceasedName={displayName}
                eventStart={data.startDate}
                items={programmeItems}
              />
              <MemorialVenueCards venues={venues} />
              {(p.burialVenue || data.venueName) && venues.length === 0 ? (
                <Section title="Venue">
                  <Card style={{ background: "var(--funeral-surface)", borderColor: "var(--funeral-border)" }}>
                    <CardContent className="p-4 space-y-2">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" style={{ color: "var(--funeral-gold)" }} />
                        {p.burialVenue ?? data.venueName}
                      </p>
                      {p.burialDirections && (
                        <p className="text-sm" style={{ color: "var(--funeral-muted)" }}>
                          {p.burialDirections}
                        </p>
                      )}
                      {data.mapsLink && (
                        <a
                          href={data.mapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm inline-block"
                          style={{ color: "var(--funeral-gold)" }}
                        >
                          Open in Maps
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </Section>
              ) : null}
              <FuneralDressCodeSection days={resolved.dressCode} />
              <MemoryVaultCta eventSlug={slug} deceasedName={displayName} />
            </div>
          )}

          {tab === "timeline" && (
            <Section title="Memorial Timeline">
              {!data.timeline?.length ? (
                <p className="text-sm" style={{ color: "var(--funeral-muted)" }}>
                  Life timeline will appear here.
                </p>
              ) : (
                <PaginatedSection
                  items={data.timeline}
                  limit={10}
                  keyFor={(entry) => entry.id}
                  listClassName="relative border-l ml-3 space-y-6 pl-6"
                  renderItem={(entry) => (
                    <div className="relative min-w-0">
                      <span
                        className="absolute -left-[1.85rem] top-1 h-3 w-3 rounded-full"
                        style={{ background: "var(--funeral-gold)" }}
                      />
                      <p className="font-semibold" style={{ color: "var(--funeral-gold)" }}>
                        {entry.year}
                      </p>
                      <p className="font-medium truncate">{entry.title}</p>
                      {entry.description && (
                        <p className="text-sm mt-1 break-words" style={{ color: "var(--funeral-muted)" }}>
                          {entry.description}
                        </p>
                      )}
                    </div>
                  )}
                />
              )}
            </Section>
          )}

          {tab === "tributes" && (
            <div className="space-y-6">
              <PaginatedSection
                items={data.tributes?.items ?? []}
                limit={10}
                keyFor={(t) => t.id}
                renderItem={(t) => (
                  <div
                    className="p-4 rounded-lg border min-w-0"
                    style={{
                      borderColor: t.isFeatured ? "var(--funeral-border)" : "var(--funeral-border)",
                      background: "var(--funeral-surface)",
                    }}
                  >
                    {t.isFeatured && (
                      <Badge className="mb-2" style={{ background: "var(--funeral-gold)", color: "#111" }}>
                        Featured
                      </Badge>
                    )}
                    <p className="italic break-words">&ldquo;{t.message}&rdquo;</p>
                    <p className="text-xs mt-2 truncate" style={{ color: "var(--funeral-muted)" }}>
                      {t.userName}
                    </p>
                  </div>
                )}
                empty={
                  <p className="text-sm" style={{ color: "var(--funeral-muted)" }}>
                    No tributes yet. Be the first to share a message.
                  </p>
                }
              />
              <Section title="Leave a Tribute">
                <form onSubmit={submitTribute} className="space-y-3">
                  <Input
                    value={tribute.userName}
                    onChange={(e) => setTribute({ ...tribute, userName: e.target.value })}
                    placeholder="Your name"
                    required
                  />
                  <Textarea
                    value={tribute.message}
                    onChange={(e) => setTribute({ ...tribute, message: e.target.value })}
                    placeholder="Your message of remembrance…"
                    rows={4}
                    required
                  />
                  <Button type="submit">Submit Tribute</Button>
                </form>
              </Section>
            </div>
          )}

          {tab === "candles" && (
            <div className="space-y-6">
              <Section title="Light a Candle">
                <form onSubmit={submitCandle} className="space-y-3">
                  <Input
                    value={candle.userName}
                    onChange={(e) => setCandle({ ...candle, userName: e.target.value })}
                    placeholder="Your name"
                    required
                  />
                  <Input
                    value={candle.country}
                    onChange={(e) => setCandle({ ...candle, country: e.target.value })}
                    placeholder="Country (optional)"
                  />
                  <Textarea
                    value={candle.message}
                    onChange={(e) => setCandle({ ...candle, message: e.target.value })}
                    placeholder="Optional message"
                    rows={2}
                  />
                  <Button type="submit">
                    <Flame className="h-4 w-4 mr-1" /> Light Candle
                  </Button>
                </form>
              </Section>
              {data.candles?.items?.length ? (
                <Section title={`${data.candles.total} Candles Lit`}>
                  <PaginatedSection
                    items={data.candles.items}
                    limit={12}
                    keyFor={(c) => c.id}
                    listClassName="grid sm:grid-cols-2 gap-2"
                    renderItem={(c) => (
                      <div
                        className="p-3 rounded-lg text-sm min-w-0"
                        style={{
                          border: "1px solid var(--funeral-border)",
                          background: "var(--funeral-surface)",
                        }}
                      >
                        <p className="flex items-center gap-1 font-medium truncate">
                          <Flame className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          {c.userName}
                        </p>
                        {c.message && (
                          <p className="text-xs mt-1 break-words" style={{ color: "var(--funeral-muted)" }}>
                            {c.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </Section>
              ) : null}
            </div>
          )}

          {tab === "guestbook" && (
            <div className="space-y-6">
              <PaginatedSection
                items={data.guestbook?.items ?? []}
                limit={10}
                keyFor={(g) => g.id}
                renderItem={(g) => (
                  <div
                    className="p-4 rounded-lg min-w-0"
                    style={{
                      border: "1px solid var(--funeral-border)",
                      background: "var(--funeral-surface)",
                    }}
                  >
                    <Badge variant="outline" className="text-[10px] mb-2">
                      {g.entryType}
                    </Badge>
                    <p className="break-words">{g.message}</p>
                    {g.scriptureRef && (
                      <p className="text-xs mt-1" style={{ color: "var(--funeral-gold)" }}>
                        {g.scriptureRef}
                      </p>
                    )}
                    <p className="text-xs mt-2 truncate" style={{ color: "var(--funeral-muted)" }}>
                      {g.userName}
                    </p>
                  </div>
                )}
                empty={
                  <p className="text-sm" style={{ color: "var(--funeral-muted)" }}>
                    No condolence entries yet.
                  </p>
                }
              />
              <Section title="Sign the Book of Condolence">
                <form onSubmit={submitGuestbook} className="space-y-3">
                  <Input
                    value={guestbook.userName}
                    onChange={(e) => setGuestbook({ ...guestbook, userName: e.target.value })}
                    placeholder="Your name"
                    required
                  />
                  <select
                    value={guestbook.entryType}
                    onChange={(e) => setGuestbook({ ...guestbook, entryType: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--funeral-border)", background: "var(--funeral-surface)" }}
                  >
                    <option value="CONDOLENCE">Condolence</option>
                    <option value="PRAYER">Prayer</option>
                    <option value="SCRIPTURE">Scripture</option>
                    <option value="MESSAGE">Message</option>
                  </select>
                  <Textarea
                    value={guestbook.message}
                    onChange={(e) => setGuestbook({ ...guestbook, message: e.target.value })}
                    placeholder="Your message…"
                    rows={3}
                    required
                  />
                  <Button type="submit">Submit</Button>
                </form>
              </Section>
            </div>
          )}

          {tab === "gallery" && (
            <Section title="Memory Gallery">
              {!data.gallery?.items?.length ? (
                <p className="text-sm" style={{ color: "var(--funeral-muted)" }}>
                  Gallery photos and videos will appear here.
                </p>
              ) : (
                <PaginatedSection
                  items={lowBandwidth ? data.gallery.items.filter((m) => m.kind !== "VIDEO") : data.gallery.items}
                  limit={12}
                  keyFor={(m) => m.id}
                  listClassName="grid grid-cols-2 sm:grid-cols-3 gap-3"
                  renderItem={(m) => (
                    <div
                      className="rounded-lg overflow-hidden aspect-square relative min-w-0"
                      style={{ border: "1px solid var(--funeral-border)" }}
                    >
                      <UploadedMedia
                        src={m.url}
                        alt={m.caption ?? "Memorial"}
                        className="w-full h-full object-cover"
                        video={m.kind === "VIDEO"}
                        controls={m.kind === "VIDEO"}
                        autoPlay={false}
                      />
                    </div>
                  )}
                />
              )}
              <div className="pt-4">
                <MemoryVaultCta eventSlug={slug} deceasedName={displayName} />
              </div>
            </Section>
          )}

          {tab === "contribute" && (
            <div className="space-y-6">
              <Section title="Support the Family">
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
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--funeral-border)", background: "var(--funeral-surface)" }}
                  >
                    {CONTRIBUTION_PURPOSES.map((purpose) => (
                      <option key={purpose.value} value={purpose.value}>
                        {purpose.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={contribution.contributor}
                    onChange={(e) => setContribution({ ...contribution, contributor: e.target.value })}
                    placeholder="Your name"
                    required
                  />
                  <Input
                    type="email"
                    value={contribution.email}
                    onChange={(e) => setContribution({ ...contribution, email: e.target.value })}
                    placeholder="Email for receipt"
                    required
                  />
                  <Input
                    type="number"
                    value={contribution.amount}
                    onChange={(e) => setContribution({ ...contribution, amount: e.target.value })}
                    placeholder="Amount (GHS)"
                    required
                    min="1"
                  />
                  <Textarea
                    value={contribution.message}
                    onChange={(e) => setContribution({ ...contribution, message: e.target.value })}
                    placeholder="Optional message"
                    rows={2}
                  />
                  <label className="flex items-center gap-2 text-sm" style={{ color: "var(--funeral-muted)" }}>
                    <input
                      type="checkbox"
                      checked={contribution.isAnonymous}
                      onChange={(e) => setContribution({ ...contribution, isAnonymous: e.target.checked })}
                    />
                    Contribute anonymously
                  </label>
                  <Button type="submit">Make a Funeral Contribution</Button>
                </form>
              </Section>
              {data.contributions?.items?.length ? (
                <Section title="Recent Contributions">
                  <PaginatedSection
                    items={data.contributions.items.map((c, index) => ({ ...c, id: `contrib-${index}` }))}
                    limit={10}
                    keyFor={(c) => c.id}
                    renderItem={(c) => (
                      <div
                        className="stack-mobile text-sm p-3 rounded-lg min-w-0"
                        style={{ background: "var(--funeral-surface)" }}
                      >
                        <span className="truncate min-w-0">{c.contributor}</span>
                        <span className="shrink-0" style={{ color: "var(--funeral-gold)" }}>
                          {formatCurrency(c.amount, c.currency)}
                        </span>
                      </div>
                    )}
                  />
                </Section>
              ) : null}
            </div>
          )}

          {tab === "livestream" && (
            <Section title="Livestream">
              {data.livestreams?.length ? (
                <PaginatedSection
                  items={data.livestreams}
                  limit={8}
                  keyFor={(s) => s.id}
                  renderItem={(s) => (
                    <Card style={{ background: "var(--funeral-surface)", borderColor: "var(--funeral-border)" }}>
                      <CardContent className="p-4 stack-mobile gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="font-medium flex items-center gap-2 truncate">
                            {s.isLive && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />}
                            {s.title}
                          </p>
                          <p className="text-xs mt-1" style={{ color: "var(--funeral-muted)" }}>
                            {s.provider}
                          </p>
                          {s.scheduledAt && (
                            <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "var(--funeral-muted)" }}>
                              <Clock className="h-3 w-3 shrink-0" />
                              {new Date(s.scheduledAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Button asChild size="sm" className="shrink-0 touch-target w-full sm:w-auto">
                          <a href={s.streamUrl} target="_blank" rel="noopener noreferrer">
                            Watch Live
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                />
              ) : p.livestreamUrl ? (
                <Button asChild className="w-full" variant="outline">
                  <a href={p.livestreamUrl} target="_blank" rel="noopener noreferrer">
                    Watch Livestream
                  </a>
                </Button>
              ) : (
                <p className="text-sm" style={{ color: "var(--funeral-muted)" }}>
                  Livestream details will be shared by the family.
                </p>
              )}
            </Section>
          )}
        </main>

        <footer
          className="text-center py-8 text-xs border-t"
          style={{ color: "var(--funeral-muted)", borderColor: "var(--funeral-border)" }}
        >
          Created with <Link href="/" style={{ color: "var(--funeral-gold)" }}>Celeventic</Link>
        </footer>
      </div>
    </FuneralExperienceShell>
  );
}
