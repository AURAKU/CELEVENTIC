import { cn } from "@/lib/utils";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  celeCardHouseAvatarId,
  celeCardHouseAvatarMeta,
  type CeleCardHouseAvatarId,
} from "@/lib/digital-business-card/portraits";
import { SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import { DigitalCardAvatarFace } from "@/components/digital-business-card/digital-card-avatar-faces";
import { CELEYOU_MARK_SRC, CeleYouThemedMark } from "@/components/digital-business-card/celeyou-brand-mark";

function inkIsDark(color: string) {
  const hex = color.replace("#", "");
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 148;
}

function Mark({
  id,
  accent,
  muted,
  fill,
}: {
  id: CeleCardHouseAvatarId;
  accent: string;
  muted: string;
  fill: string;
}) {
  if (celeCardHouseAvatarMeta(id).kind === "avatar") {
    return <DigitalCardAvatarFace id={id} accent={accent} muted={muted} fill={fill} />;
  }
  switch (id) {
    case "foil":
      return (
        <>
          <circle cx="50" cy="50" r="36" fill="none" stroke={accent} strokeWidth="3" />
          <circle cx="50" cy="50" r="24" fill="none" stroke={accent} strokeWidth="2" opacity="0.7" />
          <circle cx="50" cy="50" r="10" fill={accent} />
        </>
      );
    case "pulse":
      return (
        <>
          <circle cx="50" cy="50" r="32" fill="none" stroke={accent} strokeWidth="2.4" opacity="0.35" />
          <circle cx="50" cy="50" r="20" fill="none" stroke={accent} strokeWidth="2.8" opacity="0.7" />
          <circle cx="50" cy="50" r="8" fill={accent} />
        </>
      );
    case "night":
      return (
        <>
          <circle cx="54" cy="48" r="22" fill={accent} />
          <circle cx="62" cy="44" r="18" fill={fill} />
        </>
      );
    case "earth":
      return (
        <>
          <rect x="22" y="18" width="10" height="64" rx="2" fill={accent} />
          <rect x="36" y="18" width="10" height="64" rx="2" fill={muted} opacity="0.85" />
          <rect x="50" y="18" width="10" height="64" rx="2" fill={accent} opacity="0.55" />
          <rect x="64" y="18" width="10" height="64" rx="2" fill={accent} />
        </>
      );
    case "bloom":
      return (
        <>
          <ellipse cx="50" cy="32" rx="12" ry="18" fill={accent} opacity="0.85" />
          <ellipse cx="68" cy="50" rx="18" ry="12" fill={accent} opacity="0.55" />
          <ellipse cx="50" cy="68" rx="12" ry="18" fill={accent} opacity="0.7" />
          <ellipse cx="32" cy="50" rx="18" ry="12" fill={accent} opacity="0.45" />
          <circle cx="50" cy="50" r="7" fill={fill} stroke={accent} strokeWidth="2" />
        </>
      );
    case "grid":
      return (
        <>
          {[0, 1, 2].flatMap((row) =>
            [0, 1, 2].map((col) => (
              <circle
                key={`${row}-${col}`}
                cx={32 + col * 18}
                cy={32 + row * 18}
                r={row === 1 && col === 1 ? 6 : 4}
                fill={accent}
                opacity={row === 1 && col === 1 ? 1 : 0.45 + ((row + col) % 2) * 0.2}
              />
            ))
          )}
        </>
      );
    case "wave":
      return (
        <path
          d="M16 58 C28 44 40 72 50 56 C60 40 72 70 84 54"
          fill="none"
          stroke={accent}
          strokeWidth="6"
          strokeLinecap="round"
        />
      );
    default:
      return <image href={CELEYOU_MARK_SRC} x="4" y="4" width="92" height="92" />;
  }
}

export function DigitalCardHouseAvatar({
  theme,
  avatarUrl,
  className,
  rounded = "full",
  framed = true,
}: {
  theme: DigitalCardTheme;
  avatarUrl?: string | null;
  className?: string;
  rounded?: "full" | "lg" | "none";
  framed?: boolean;
}) {
  const id = celeCardHouseAvatarId(avatarUrl);
  const darkType = inkIsDark(theme.text);
  const fill = darkType ? "rgba(255,255,255,0.97)" : "rgba(8,10,16,0.94)";
  const house = id === "celecard";
  const fillSquare = house && rounded !== "full";
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden",
        rounded === "full" ? "rounded-full" : rounded === "lg" ? "rounded-lg" : "rounded-[3px]",
        className
      )}
      style={{
        background: house ? "#034746" : fill,
        boxShadow: framed
          ? darkType
            ? `0 0 0 2px ${theme.border}, 0 0 0 6px ${theme.accent}33, 0 10px 22px rgba(28,25,23,0.18)`
            : `0 0 0 2px ${theme.border}, 0 0 0 6px ${theme.accent}33, 0 10px 22px rgba(0,0,0,0.28)`
          : undefined,
      }}
      aria-hidden
      title={`${SMARTCARD_PRODUCT_SHORT_NAME} ${id}`}
    >
      {house ? (
        <CeleYouThemedMark
          theme={theme}
          fit={fillSquare ? "cover" : "contain"}
          className={cn("h-full w-full", fillSquare ? "origin-center scale-[1.28]" : null)}
        />
      ) : (
        <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <Mark id={id} accent={theme.accent} muted={theme.muted} fill={fill} />
        </svg>
      )}
    </div>
  );
}
