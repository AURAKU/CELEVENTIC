import { cn } from "@/lib/utils";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  celeCardHouseAvatarId,
  celeCardHouseAvatarMeta,
  type CeleCardHouseAvatarId,
} from "@/lib/digital-business-card/portraits";
import { SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import { DigitalCardAvatarFace } from "@/components/digital-business-card/digital-card-avatar-faces";
import {
  CELEYOU_MARK_SRC,
  CeleYouThemedMark,
} from "@/components/digital-business-card/celeyou-brand-mark";

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
    case "arc":
      return (
        <>
          <path d="M20 68 A30 30 0 0 1 80 68" fill="none" stroke={accent} strokeWidth="5.5" strokeLinecap="round" />
          <path d="M28 64 A22 22 0 0 1 72 64" fill="none" stroke={accent} strokeWidth="4.2" strokeLinecap="round" opacity="0.7" />
          <path d="M36 60 A14 14 0 0 1 64 60" fill="none" stroke={accent} strokeWidth="3.4" strokeLinecap="round" opacity="0.45" />
          <circle cx="50" cy="74" r="5.5" fill={accent} />
        </>
      );
    case "spire":
      return (
        <>
          <path d="M50 14 L80 80 H20 Z" fill={accent} />
          <path d="M50 30 L66 74 H34 Z" fill={fill} opacity="0.28" />
        </>
      );
    case "seal":
      return (
        <>
          <path d="M50 14 L78 31 L78 69 L50 86 L22 69 L22 31 Z" fill="none" stroke={accent} strokeWidth="4.2" />
          <path d="M50 32 L64 40 L64 60 L50 68 L36 60 L36 40 Z" fill={accent} />
        </>
      );
    case "slash":
      return (
        <>
          <path d="M26 78 L74 22" fill="none" stroke={accent} strokeWidth="11" strokeLinecap="round" />
          <path d="M40 82 L82 32" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity="0.42" />
        </>
      );
    case "halo":
      return (
        <>
          <circle
            cx="50"
            cy="50"
            r="28"
            fill="none"
            stroke={accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="148 28"
            transform="rotate(-40 50 50)"
          />
          <circle cx="50" cy="50" r="8" fill={accent} />
        </>
      );
    case "sun":
      return (
        <>
          <circle cx="50" cy="50" r="13" fill={accent} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            return (
              <path
                key={i}
                d={`M${50 + Math.cos(a) * 22} ${50 + Math.sin(a) * 22} L${50 + Math.cos(a) * 34} ${50 + Math.sin(a) * 34}`}
                fill="none"
                stroke={accent}
                strokeWidth="5"
                strokeLinecap="round"
              />
            );
          })}
        </>
      );
    case "drop":
      return (
        <>
          <path d="M50 16 C50 16 76 46 76 60 C76 74 64 84 50 84 C36 84 24 74 24 60 C24 46 50 16 50 16 Z" fill={accent} />
          <ellipse cx="42" cy="54" rx="6" ry="9" fill={fill} opacity="0.32" />
        </>
      );
    case "leaf":
      return (
        <>
          <path d="M50 14 C74 28 82 56 50 86 C18 56 26 28 50 14 Z" fill={accent} />
          <path d="M50 26 L50 74" fill="none" stroke={fill} strokeWidth="2.2" opacity="0.55" />
          <path d="M50 42 C58 46 62 54 64 62" fill="none" stroke={fill} strokeWidth="1.6" opacity="0.4" />
        </>
      );
    case "bolt":
      return <path d="M58 12 L30 50 H48 L38 88 L74 42 H54 Z" fill={accent} />;
    case "stack":
      return (
        <>
          {[22, 40, 58, 76].map((y, i) => (
            <rect
              key={y}
              x={20 + i * 2}
              y={y}
              width={60 - i * 4}
              height="10"
              rx="5"
              fill={accent}
              opacity={1 - i * 0.18}
            />
          ))}
        </>
      );
    case "plus":
      return (
        <>
          <rect x="41" y="20" width="18" height="60" rx="9" fill={accent} />
          <rect x="20" y="41" width="60" height="18" rx="9" fill={accent} />
        </>
      );
    case "tile":
      return (
        <>
          <rect x="18" y="18" width="44" height="44" rx="10" fill={accent} opacity="0.42" />
          <rect x="38" y="38" width="44" height="44" rx="10" fill={accent} />
        </>
      );
    case "fan":
      return (
        <>
          {[-42, -21, 0, 21, 42].map((deg, i) => {
            const a = ((deg - 90) * Math.PI) / 180;
            const x = 50 + Math.cos(a) * 34;
            const y = 78 + Math.sin(a) * 34;
            return (
              <path
                key={deg}
                d={`M50 78 L${x} ${y}`}
                fill="none"
                stroke={accent}
                strokeWidth="7"
                strokeLinecap="round"
                opacity={0.45 + i * 0.12}
              />
            );
          })}
        </>
      );
    case "coil":
      return (
        <path
          d="M50 50 C62 50 62 38 50 38 C36 38 36 58 50 58 C68 58 68 30 50 30 C28 30 28 66 50 66 C76 66 76 22 50 22"
          fill="none"
          stroke={accent}
          strokeWidth="5"
          strokeLinecap="round"
        />
      );
    case "crest":
      return (
        <>
          <path d="M50 14 L80 28 L80 54 C80 74 50 88 50 88 C50 88 20 74 20 54 L20 28 Z" fill={accent} />
          <path d="M50 28 L68 38 L68 54 C68 66 50 76 50 76 C50 76 32 66 32 54 L32 38 Z" fill={fill} opacity="0.28" />
        </>
      );
    case "dash":
      return (
        <>
          <rect x="18" y="28" width="64" height="10" rx="5" fill={accent} />
          <rect x="26" y="45" width="48" height="10" rx="5" fill={accent} opacity="0.7" />
          <rect x="34" y="62" width="32" height="10" rx="5" fill={accent} opacity="0.42" />
        </>
      );
    default:
      return (
        <image
          href={CELEYOU_MARK_SRC}
          x="4"
          y="4"
          width="92"
          height="92"
          preserveAspectRatio="xMidYMid meet"
        />
      );
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
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden",
        rounded === "full" ? "rounded-full" : rounded === "lg" ? "rounded-lg" : "rounded-[3px]",
        className
      )}
      style={{
        background: house ? theme.cardBackground : fill,
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
        <CeleYouThemedMark className="h-full w-full" />
      ) : (
        <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <Mark id={id} accent={theme.accent} muted={theme.muted} fill={fill} />
        </svg>
      )}
    </div>
  );
}
