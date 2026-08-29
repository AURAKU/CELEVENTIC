"use client";

import { useId } from "react";
import { Facebook, MessageCircle, Youtube, type LucideIcon } from "lucide-react";
import type { InvitationSocialPlatformId } from "@/lib/invitation/social-links";

const ICONS: Partial<Record<Exclude<InvitationSocialPlatformId, "instagram" | "tiktok">, LucideIcon>> = {
  facebook: Facebook,
  youtube: Youtube,
  whatsapp: MessageCircle,
};

/**
 * Official Instagram glyph (2016+ camera mark): rounded square filled with the
 * brand radial gradient (yellow → orange → magenta → purple → blue) and white
 * camera body / lens / flash. Not Lucide's monochrome outline.
 */
function InstagramOfficialGlyph({ size }: { size: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `igOfficialGradient${uid}`;
  const clipId = `igOfficialClip${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id={gradientId} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="24" height="24" rx="6.4" ry="6.4" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="24" height="24" rx="6.4" ry="6.4" fill={`url(#${gradientId})`} />
        <rect
          x="5.15"
          y="5.15"
          width="13.7"
          height="13.7"
          rx="4.55"
          ry="4.55"
          stroke="#fff"
          strokeWidth="1.7"
        />
        <circle cx="12" cy="12" r="3.35" stroke="#fff" strokeWidth="1.7" />
        <circle cx="16.55" cy="7.45" r="0.95" fill="#fff" />
      </g>
    </svg>
  );
}

/**
 * Official TikTok musical-note path (Simple Icons / brand kit). Same geometry as
 * the consumer app mark — not Lucide Music2, not a play triangle, not a redraw.
 */
const TIKTOK_NOTE =
  "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.69 2.58-4.82 1.36-1.06 3.1-1.64 4.88-1.65v4.07c-.51-.17-1.06-.26-1.61-.26-1.31.02-2.5.86-2.96 2.07-.3.78-.23 1.65.19 2.36.5.85 1.45 1.35 2.45 1.28.84-.06 1.61-.54 2.05-1.24.18-.3.29-.64.32-.99.02-3.47.01-6.94 0-10.41z";

/**
 * Official TikTok logo, same family as InstagramOfficialGlyph: rounded-square
 * app mark with brand colors. The note is scaled and translated down so the
 * stem does not sit optically high against the Instagram camera.
 */
function TikTokOfficialMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
      data-social-mark="tiktok"
      style={{ display: "block" }}
    >
      <rect width="24" height="24" rx="6.4" ry="6.4" fill="#010101" />
      <g transform="translate(2.55 4.05) scale(0.74)">
        <path d={TIKTOK_NOTE} fill="#25F4EE" transform="translate(1.1 0.5)" />
        <path d={TIKTOK_NOTE} fill="#FE2C55" transform="translate(-1.05 -0.45)" />
        <path d={TIKTOK_NOTE} fill="#fff" />
      </g>
    </svg>
  );
}

/** Platform marks for invitation social rows. Instagram and TikTok use official brand logos. */
export function InvitationSocialPlatformIcon({
  platform,
  size = 28,
  strokeWidth = 1.4,
}: {
  platform: InvitationSocialPlatformId;
  size?: number;
  strokeWidth?: number;
}) {
  if (platform === "instagram") {
    return <InstagramOfficialGlyph size={size} />;
  }
  if (platform === "tiktok") {
    return <TikTokOfficialMark size={size} />;
  }

  const Icon = ICONS[platform];
  if (!Icon) {
    return (
      <span aria-hidden className="text-[0.65rem] tracking-[0.18em] uppercase">
        {platform}
      </span>
    );
  }
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden />;
}
