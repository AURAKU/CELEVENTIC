"use client";

import Image from "next/image";
import type { InvitationRenderProps } from "@/types/invitation-design";
import type { CinematicLayoutSlug } from "@/lib/invitation/cinematic-themes";
import { parseCoupleNames, formatInvitationDateParts } from "@/lib/invitation-templates";
import { getCinematicTheme } from "@/lib/invitation/cinematic-themes";
import { HeroMedia } from "../shared/hero-media";
import { InvitationRsvpPanel } from "../shared/invitation-rsvp-panel";
import { InvitationActions } from "../shared/invitation-actions";
import { GoldFrame } from "../shared/invitation-ornaments";
import { cn } from "@/lib/utils";

type ShellProps = InvitationRenderProps & { slug: CinematicLayoutSlug };

function InviteBody({
  invitation,
  event,
  design,
  guestId,
  guestName,
  qrDataUrl,
  variant = "default",
}: InvitationRenderProps & { variant?: "default" | "dark" | "light" | "neon" | "corporate" }) {
  const { name1, name2 } = parseCoupleNames(event.title, event.hostName);
  const date = formatInvitationDateParts(event.startDateRaw ?? event.startDate);
  const { colors } = design;
  const theme = getCinematicTheme(design.layout);
  const buttonStyle = design.studio?.buttonStyle ?? theme?.buttonStyle ?? "gold";
  const headingSize = design.studio?.headingSize ?? 28;
  const bodySize = design.studio?.bodySize ?? 14;
  const scriptSize = design.studio?.scriptSize ?? 22;
  const dark = variant === "dark" || variant === "neon";

  return (
    <>
      <p className={cn("uppercase tracking-[0.35em] font-light inv-muted-on-dark", variant === "light" && "inv-muted-on-light", variant === "corporate" && "text-slate-600")} style={{ fontSize: bodySize - 2 }}>
        {design.introText}
      </p>
      <h1
        className={cn(
          "leading-snug",
          variant === "neon" && "font-display font-black uppercase",
          variant === "corporate" && "font-[family-name:var(--font-inter)] font-bold uppercase tracking-tight",
          variant === "default" && "font-[family-name:var(--font-cinzel)] tracking-[0.12em] uppercase",
          variant === "light" && "font-[family-name:var(--font-great-vibes)] normal-case tracking-normal"
        )}
        style={{ fontSize: headingSize, color: colors.primary }}
      >
        {name1}
        {name2 && (
          <>
            <span className={cn("block my-2", variant === "light" ? "text-2xl" : "text-lg")}>
              {variant === "neon" ? "&" : variant === "light" ? "and" : "&"}
            </span>
            {name2}
          </>
        )}
      </h1>
      {invitation.message && (
        <p className={cn("italic font-[family-name:var(--font-cormorant)]", variant === "light" || variant === "corporate" ? "inv-caption-on-light" : "inv-caption-on-dark")} style={{ fontSize: scriptSize }}>
          {invitation.message}
        </p>
      )}
      <div className="h-px w-20 mx-auto" style={{ background: `linear-gradient(90deg, transparent, ${colors.secondary}, transparent)` }} />
      <p className={cn(variant === "corporate" && "font-mono text-sm")} style={{ fontSize: bodySize + 2 }}>
        {String(date.day).padStart(2, "0")} · {date.monthShort.toUpperCase()} · {date.year}
      </p>
      <p className={cn("inv-muted-on-dark", variant === "light" && "inv-muted-on-light", variant === "corporate" && "text-slate-600")} style={{ fontSize: bodySize }}>{date.time}</p>
      {event.venueName && <p className="tracking-wide" style={{ fontSize: bodySize + 1 }}>{event.venueName}</p>}
      {event.landmark && <p className={cn("inv-muted-on-dark", variant === "light" && "inv-muted-on-light")} style={{ fontSize: bodySize - 1 }}>{event.landmark}</p>}
      {event.dressCode && <p className={cn("inv-caption-on-dark", variant === "light" && "inv-caption-on-light")} style={{ fontSize: bodySize - 1 }}>Dress code · {event.dressCode}</p>}
      {qrDataUrl && <Image src={qrDataUrl} alt="Guest pass QR" width={112} height={112} className="mx-auto rounded-lg"  unoptimized />}
      <InvitationRsvpPanel
        invitationId={invitation.id}
        guestId={guestId}
        guestName={guestName}
        accentColor={colors.secondary}
        textColor={colors.text}
        variant={dark ? "dark" : "light"}
        buttonStyle={buttonStyle}
      />
      <InvitationActions event={event} pdfUrl={design.media?.find((m) => m.type === "pdf")?.url} variant={dark ? "dark" : "light"} buttonStyle={buttonStyle} />
    </>
  );
}

function RoyalEmeraldShell(props: ShellProps) {
  const theme = getCinematicTheme(props.slug)!;
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4" style={{ background: theme.background, color: props.design.colors.text }}>
      <div className="relative w-full max-w-lg">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-amber-500/40 via-emerald-600/20 to-transparent blur-sm" />
        <div className="relative rounded-2xl border-2 border-amber-500/40 overflow-hidden bg-emerald-950/80 shadow-2xl">
          <GoldFrame />
          <HeroMedia coverImageUrl={props.event.coverImageUrl} media={props.design.media} animation={props.design.animation} className="h-48" overlay />
          <div className="px-8 py-10 text-center space-y-5 inv-text-on-dark"><InviteBody {...props} variant="dark" /></div>
        </div>
      </div>
    </div>
  );
}

function MidnightVelvetShell(props: ShellProps) {
  const theme = getCinematicTheme(props.slug)!;
  return (
    <div className="min-h-[100dvh] w-full flex flex-col" style={{ background: theme.background, color: props.design.colors.text }}>
      <div className="h-3 bg-gradient-to-r from-red-900 via-red-700 to-red-900" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6 inv-text-on-dark">
          <HeroMedia coverImageUrl={props.event.coverImageUrl} media={props.design.media} animation="fade" className="h-40 rounded-lg border border-white/10" overlay />
          <InviteBody {...props} variant="dark" />
        </div>
      </div>
      <div className="h-8 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}

function KenteHeritageShell(props: ShellProps) {
  const theme = getCinematicTheme(props.slug)!;
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4" style={{ background: theme.background }}>
      <div className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl border-4 border-amber-500/50">
        <div className="h-3 bg-gradient-to-r from-red-700 via-amber-400 to-emerald-700" />
        <div className="px-6 py-10 text-center space-y-5 inv-text-on-dark" style={{ color: props.design.colors.text, background: "linear-gradient(180deg, #451a03 0%, #292524 100%)" }}>
          <InviteBody {...props} variant="dark" />
        </div>
        <div className="h-3 bg-gradient-to-r from-emerald-700 via-amber-400 to-red-700" />
      </div>
    </div>
  );
}

function FloralGardenRomanceShell(props: ShellProps) {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-gradient-to-b from-rose-50 to-emerald-50">
      <div className="w-full max-w-md rounded-[2rem] overflow-hidden shadow-xl border border-rose-200/80 bg-white/90">
        <HeroMedia coverImageUrl={props.event.coverImageUrl} media={props.design.media} animation="fade" className="h-52" />
        <div className="px-8 py-10 text-center space-y-5 text-rose-950 inv-text-on-light"><InviteBody {...props} variant="light" /></div>
      </div>
    </div>
  );
}

function PassportDestinationShell(props: ShellProps) {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md rounded-lg overflow-hidden shadow-2xl border border-teal-500/30 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-slate-900 rounded-r-full z-10" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-slate-900 rounded-l-full z-10" />
        <div className="bg-teal-900/80 px-5 py-3 flex justify-between text-[10px] uppercase tracking-widest text-teal-200/80">
          <span>Boarding Pass</span><span>CELEVENTIC AIR</span>
        </div>
        <HeroMedia coverImageUrl={props.event.coverImageUrl} media={props.design.media} animation={props.design.animation} className="h-36" />
        <div className="px-8 py-8 space-y-5 text-left bg-slate-50 text-slate-900"><InviteBody {...props} variant="corporate" /></div>
      </div>
    </div>
  );
}

function CrystalAcrylicShell(props: ShellProps) {
  const theme = getCinematicTheme(props.slug)!;
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4" style={{ background: theme.background }}>
      <div className="w-full max-w-lg rounded-3xl border border-white/30 bg-white/15 backdrop-blur-2xl shadow-[0_8px_60px_rgba(56,189,248,0.2)] overflow-hidden">
        <HeroMedia coverImageUrl={props.event.coverImageUrl} media={props.design.media} animation="ken-burns" className="h-44 opacity-90" overlay />
        <div className="px-8 py-10 text-center space-y-5 inv-text-on-light inv-readable-panel-light"><InviteBody {...props} variant="light" /></div>
      </div>
    </div>
  );
}

function GoldenIslamicShell(props: ShellProps) {
  const theme = getCinematicTheme(props.slug)!;
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4" style={{ background: theme.background }}>
      <div className="relative w-full max-w-md">
        <div className="absolute inset-x-8 top-0 h-20 border-t-2 border-x-2 border-amber-400/50 rounded-t-full pointer-events-none" />
        <div className="rounded-2xl border border-amber-500/30 bg-emerald-950/90 overflow-hidden shadow-2xl mt-10">
          <div className="px-8 py-12 text-center space-y-5 text-emerald-50 inv-text-on-dark"><InviteBody {...props} variant="dark" /></div>
        </div>
      </div>
    </div>
  );
}

function MemorialCandleShell(props: ShellProps) {
  const theme = getCinematicTheme(props.slug)!;
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4" style={{ background: theme.background }}>
      <div className="w-full max-w-md text-center space-y-8 px-8 py-12 border border-stone-700/50 rounded-lg bg-black/40 inv-text-on-dark">
        <div className="mx-auto w-2 h-12 bg-gradient-to-t from-amber-700 to-amber-200 rounded-full shadow-[0_0_24px_rgba(251,191,36,0.35)]" />
        <InviteBody {...props} variant="dark" />
      </div>
    </div>
  );
}

function NeonCelebrationShell(props: ShellProps) {
  const theme = getCinematicTheme(props.slug)!;
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4" style={{ background: theme.background }}>
      <div className="w-full max-w-md rounded-2xl border-2 border-fuchsia-500/50 bg-black/60 shadow-[0_0_50px_rgba(232,121,249,0.25)] overflow-hidden">
        <HeroMedia coverImageUrl={props.event.coverImageUrl} media={props.design.media} animation="ken-burns" className="h-44" overlay />
        <div className="px-8 py-10 text-center space-y-5 text-fuchsia-50"><InviteBody {...props} variant="neon" /></div>
      </div>
    </div>
  );
}

function CorporateSummitShell(props: ShellProps) {
  const theme = getCinematicTheme(props.slug)!;
  return (
    <div className="min-h-[100dvh] w-full flex flex-col" style={{ background: theme.background, color: props.design.colors.text }}>
      <div className="h-1 bg-gradient-to-r from-teal-500 via-slate-400 to-teal-500" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl grid sm:grid-cols-[1fr_1.2fr] gap-0 rounded-xl overflow-hidden border border-slate-600/50 shadow-2xl">
          <HeroMedia coverImageUrl={props.event.coverImageUrl} media={props.design.media} animation="fade" className="min-h-[280px] sm:min-h-full" overlay />
          <div className="px-8 py-10 space-y-5 bg-slate-900/95 text-left"><InviteBody {...props} variant="corporate" /></div>
        </div>
      </div>
    </div>
  );
}

const SHELLS: Record<CinematicLayoutSlug, React.ComponentType<ShellProps>> = {
  "royal-emerald-wedding": RoyalEmeraldShell,
  "midnight-velvet-reception": MidnightVelvetShell,
  "kente-heritage-union": KenteHeritageShell,
  "floral-garden-romance": FloralGardenRomanceShell,
  "passport-destination-wedding": PassportDestinationShell,
  "crystal-acrylic-luxury": CrystalAcrylicShell,
  "golden-islamic-nikkah": GoldenIslamicShell,
  "memorial-candle-tribute": MemorialCandleShell,
  "neon-celebration-party": NeonCelebrationShell,
  "corporate-prestige-summit": CorporateSummitShell,
};

export function CinematicLayoutRouter(props: InvitationRenderProps) {
  const slug = props.design.layout as CinematicLayoutSlug;
  const Shell = SHELLS[slug];
  if (!Shell) return null;
  return <Shell {...props} slug={slug} />;
}
