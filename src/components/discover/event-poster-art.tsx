import { DISCOVER_TYPE_VISUAL } from "@/lib/discovery/public-event";

export function EventPosterArt({ eventType, title }: { eventType: string; title: string }) {
  const palette = DISCOVER_TYPE_VISUAL[eventType] ?? DISCOVER_TYPE_VISUAL.CUSTOM;
  const id = `poster-${eventType.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${title.length}`;

  return (
    <svg viewBox="0 0 640 400" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="55%" stopColor={palette.via} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="78%" cy="18%" r="42%">
          <stop offset="0%" stopColor={palette.accent} stopOpacity="0.55" />
          <stop offset="100%" stopColor={palette.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="400" fill={`url(#${id}-bg)`} />
      <rect width="640" height="400" fill={`url(#${id}-glow)`} />
      <g opacity="0.28" fill="none" stroke={palette.accent} strokeWidth="1.4">
        <circle cx="92" cy="310" r="86" />
        <circle cx="92" cy="310" r="54" />
        <path d="M420 70c70 18 126 78 126 154 0 88-72 150-150 150" />
        <path d="M40 40h140M40 40v90" />
      </g>
      {eventType === "WEDDING" ? (
        <g fill="none" stroke={palette.accent} strokeWidth="3" opacity="0.7">
          <circle cx="292" cy="168" r="34" />
          <circle cx="338" cy="168" r="34" />
        </g>
      ) : eventType === "CONCERT" || eventType === "FESTIVAL" ? (
        <g fill={palette.accent} opacity="0.55">
          <rect x="286" y="120" width="10" height="150" rx="4" />
          <rect x="312" y="96" width="10" height="174" rx="4" />
          <rect x="338" y="136" width="10" height="134" rx="4" />
          <rect x="364" y="88" width="10" height="182" rx="4" />
        </g>
      ) : (
        <g fill="none" stroke={palette.accent} strokeWidth="2.4" opacity="0.55">
          <rect x="248" y="118" width="144" height="164" rx="18" />
          <path d="M248 168h144" />
        </g>
      )}
    </svg>
  );
}
