/** Resolve best playback source — prefer smaller/mobile when available. Never invent MP4s. */

export type GuideMediaFields = {
  videoUrl?: string | null;
  mp4Url?: string | null;
  webmUrl?: string | null;
  mobileVideoUrl?: string | null;
  desktopVideoUrl?: string | null;
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
  captionsEnUrl?: string | null;
  captionsFrUrl?: string | null;
  voiceoverEnUrl?: string | null;
  voiceoverFrUrl?: string | null;
  durationSec?: number | null;
  videoProductionRequired?: boolean | null;
};

export type ResolvedGuideMedia = {
  primaryUrl: string | null;
  sources: Array<{ src: string; type?: string; media?: string }>;
  posterUrl: string | null;
  captionsEnUrl: string | null;
  captionsFrUrl: string | null;
  voiceoverEnUrl: string | null;
  voiceoverFrUrl: string | null;
  durationSec: number | null;
  videoProductionRequired: boolean;
  lazy: true;
};

function truthyUrl(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

/** Prefer mobile → webm → mp4 → desktop → legacy videoUrl. */
export function resolveGuidePlayback(
  fields: GuideMediaFields,
  opts?: { preferDesktop?: boolean }
): ResolvedGuideMedia {
  const mobile = truthyUrl(fields.mobileVideoUrl);
  const desktop = truthyUrl(fields.desktopVideoUrl);
  const webm = truthyUrl(fields.webmUrl);
  const mp4 = truthyUrl(fields.mp4Url);
  const legacy = truthyUrl(fields.videoUrl);

  const preferDesktop = !!opts?.preferDesktop;
  const ordered = preferDesktop
    ? [desktop, webm, mp4, mobile, legacy]
    : [mobile, webm, mp4, desktop, legacy];

  const primaryUrl = ordered.find(Boolean) ?? null;
  const sources: ResolvedGuideMedia["sources"] = [];
  const seen = new Set<string>();

  const push = (src: string | null, type?: string, media?: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    sources.push({ src, type, media });
  };

  if (!preferDesktop) {
    push(mobile, undefined, "(max-width: 768px)");
    push(webm, "video/webm");
    push(mp4, "video/mp4");
    push(desktop, undefined, "(min-width: 769px)");
    push(legacy);
  } else {
    push(desktop, undefined, "(min-width: 769px)");
    push(webm, "video/webm");
    push(mp4, "video/mp4");
    push(mobile, undefined, "(max-width: 768px)");
    push(legacy);
  }

  const hasRealVideo = !!primaryUrl;
  return {
    primaryUrl,
    sources,
    posterUrl: truthyUrl(fields.posterUrl) ?? truthyUrl(fields.thumbnailUrl),
    captionsEnUrl: truthyUrl(fields.captionsEnUrl),
    captionsFrUrl: truthyUrl(fields.captionsFrUrl),
    voiceoverEnUrl: truthyUrl(fields.voiceoverEnUrl),
    voiceoverFrUrl: truthyUrl(fields.voiceoverFrUrl),
    durationSec: typeof fields.durationSec === "number" && fields.durationSec > 0 ? fields.durationSec : null,
    videoProductionRequired: fields.videoProductionRequired !== false && !hasRealVideo ? true : !hasRealVideo,
    lazy: true,
  };
}

export function isVideoProductionRequired(fields: GuideMediaFields): boolean {
  return resolveGuidePlayback(fields).videoProductionRequired;
}

export function guideIsNewBadge(opts: {
  isNew?: boolean | null;
  newUntil?: Date | string | null;
  now?: Date;
}): boolean {
  if (opts.isNew) return true;
  if (!opts.newUntil) return false;
  const until = opts.newUntil instanceof Date ? opts.newUntil : new Date(opts.newUntil);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > (opts.now ?? new Date()).getTime();
}
