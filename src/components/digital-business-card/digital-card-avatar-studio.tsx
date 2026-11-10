import type { CeleCardHouseAvatarId } from "@/lib/digital-business-card/portraits";

function FoxMark({ accent }: { accent: string }) {
  return (
    <>
      <path d="M18 78 C22 52 34 38 50 38 C66 38 78 52 82 78 C74 90 26 90 18 78 Z" fill={accent} />
      <path d="M22 40 L34 22 L42 46 Z" fill={accent} />
      <path d="M78 40 L66 22 L58 46 Z" fill={accent} />
      <path d="M32 42 L36 28 L40 44 Z" fill="#f4d7b8" opacity="0.85" />
      <path d="M68 42 L64 28 L60 44 Z" fill="#f4d7b8" opacity="0.85" />
      <ellipse cx="50" cy="62" rx="16" ry="14" fill="#f4d7b8" />
      <path d="M42 66 C46 72 54 72 58 66 C54 70 46 70 42 66 Z" fill={accent} />
      <circle cx="43" cy="58" r="2.2" fill="#1c1917" />
      <circle cx="57" cy="58" r="2.2" fill="#1c1917" />
      <ellipse cx="50" cy="66" rx="2.4" ry="1.6" fill="#1c1917" />
    </>
  );
}

function LionMark({ accent }: { accent: string }) {
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(a) * 32;
        const y = 52 + Math.sin(a) * 32;
        return <ellipse key={i} cx={x} cy={y} rx="8" ry="12" fill={accent} transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} />;
      })}
      <circle cx="50" cy="52" r="20" fill="#e8c4a0" />
      <path d="M40 48 C42 44 46 44 48 48" fill="none" stroke="#3f2a1d" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M52 48 C54 44 58 44 60 48" fill="none" stroke="#3f2a1d" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="42" cy="52" r="2" fill="#1c1917" />
      <circle cx="58" cy="52" r="2" fill="#1c1917" />
      <path d="M46 60 C50 64 54 64 54 60" fill="none" stroke="#9a5340" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function CraneMark({ accent }: { accent: string }) {
  return (
    <>
      <path d="M18 70 C28 58 42 50 62 48 L86 28 L78 52 C90 58 88 72 74 76 C56 82 34 84 22 76 Z" fill={accent} />
      <path d="M62 48 L78 18 L72 48" fill="#f4ece0" />
      <path d="M78 18 L92 14 L80 24 Z" fill="#1c1917" />
      <circle cx="72" cy="40" r="1.8" fill="#1c1917" />
      <path d="M54 76 L50 92" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M62 76 L66 90" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function WhaleMark({ accent }: { accent: string }) {
  return (
    <>
      <path d="M12 58 C18 38 40 30 62 36 C78 40 86 50 90 62 C70 54 48 54 28 64 C22 68 16 68 12 64 Z" fill={accent} />
      <path d="M86 48 L96 32 L92 54 Z" fill={accent} />
      <path d="M86 58 L98 70 L88 64 Z" fill={accent} />
      <ellipse cx="30" cy="56" rx="7" ry="4" fill="#f4ece0" opacity="0.7" />
      <circle cx="24" cy="50" r="2" fill="#1c1917" />
      <path d="M18 58 C22 62 28 62 32 58" fill="none" stroke="#1c1917" strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}

function BeetleMark({ accent }: { accent: string }) {
  return (
    <>
      <ellipse cx="50" cy="32" rx="12" ry="10" fill={accent} />
      <ellipse cx="50" cy="60" rx="22" ry="26" fill={accent} />
      <path d="M50 36 L50 84" stroke="#0f172a" strokeWidth="1.6" opacity="0.35" />
      <path d="M38 48 C30 42 22 40 16 42" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M62 48 C70 42 78 40 84 42" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M36 62 C26 62 18 66 14 72" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M64 62 C74 62 82 66 86 72" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="50" cy="58" rx="10" ry="8" fill="#f4ece0" opacity="0.35" />
      <circle cx="45" cy="30" r="1.6" fill="#1c1917" />
      <circle cx="55" cy="30" r="1.6" fill="#1c1917" />
    </>
  );
}

function KoiMark({ accent }: { accent: string }) {
  return (
    <>
      <path d="M14 58 C28 40 52 34 72 46 C86 54 90 66 78 72 C58 82 32 76 18 64 Z" fill={accent} />
      <path d="M78 52 L96 36 L88 58 L96 72 L78 64 Z" fill={accent} />
      <path d="M44 46 L50 28 L56 46" fill={accent} opacity="0.75" />
      <path d="M40 68 L46 84 L52 68" fill={accent} opacity="0.75" />
      <circle cx="28" cy="54" r="2" fill="#1c1917" />
      <ellipse cx="36" cy="60" rx="6" ry="3" fill="#f4ece0" opacity="0.45" />
    </>
  );
}

function CometMark({ accent }: { accent: string }) {
  return (
    <>
      <path d="M18 78 L42 58 L48 66 Z" fill={accent} opacity="0.35" />
      <path d="M14 62 L46 50 L50 58 Z" fill={accent} opacity="0.55" />
      <path d="M22 46 L50 46 L52 54 Z" fill={accent} opacity="0.75" />
      <circle cx="68" cy="38" r="16" fill={accent} />
      <circle cx="64" cy="34" r="5" fill="#f8fafc" opacity="0.55" />
    </>
  );
}

function PrismMark({ accent }: { accent: string }) {
  return (
    <>
      <path d="M50 12 L86 82 L14 82 Z" fill={accent} />
      <path d="M50 12 L50 82 L14 82 Z" fill="#0f172a" opacity="0.18" />
      <path d="M50 28 L72 72 L28 72 Z" fill="#f8fafc" opacity="0.28" />
    </>
  );
}

function OrbitMark({ accent }: { accent: string }) {
  return (
    <>
      <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke={accent} strokeWidth="4" transform="rotate(-24 50 50)" />
      <circle cx="50" cy="50" r="18" fill={accent} />
      <circle cx="44" cy="46" r="5" fill="#f8fafc" opacity="0.4" />
      <circle cx="78" cy="36" r="5" fill={accent} />
    </>
  );
}

function SparkMark({ accent }: { accent: string }) {
  return (
    <>
      <path
        d="M50 8 L56 38 L88 28 L64 50 L92 72 L58 62 L50 92 L42 62 L8 72 L36 50 L12 28 L44 38 Z"
        fill={accent}
      />
      <circle cx="50" cy="50" r="8" fill="#f8fafc" opacity="0.45" />
    </>
  );
}

function KnotMark({ accent }: { accent: string }) {
  return (
    <>
      <path
        d="M32 50 C32 28 68 28 68 50 C68 72 32 72 32 50"
        fill="none"
        stroke={accent}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M50 32 C72 32 72 68 50 68 C28 68 28 32 50 32"
        fill="none"
        stroke={accent}
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.7"
      />
    </>
  );
}

function EclipseMark({ accent }: { accent: string }) {
  return (
    <>
      <circle cx="46" cy="50" r="28" fill={accent} />
      <circle cx="58" cy="46" r="22" fill="#0f172a" opacity="0.55" />
      <circle cx="38" cy="42" r="7" fill="#f8fafc" opacity="0.28" />
    </>
  );
}

function RocketMark({ accent }: { accent: string }) {
  return (
    <>
      <path d="M50 10 C62 28 66 48 64 68 L36 68 C34 48 38 28 50 10 Z" fill={accent} />
      <ellipse cx="50" cy="46" rx="7" ry="8" fill="#f8fafc" opacity="0.55" />
      <path d="M36 64 L24 82 L40 72 Z" fill={accent} />
      <path d="M64 64 L76 82 L60 72 Z" fill={accent} />
      <path d="M44 70 L50 90 L56 70 Z" fill={accent} opacity="0.7" />
    </>
  );
}

function VinylMark({ accent }: { accent: string }) {
  return (
    <>
      <circle cx="50" cy="50" r="34" fill={accent} />
      <circle cx="50" cy="50" r="26" fill="none" stroke="#0f172a" strokeWidth="1.2" opacity="0.25" />
      <circle cx="50" cy="50" r="18" fill="none" stroke="#0f172a" strokeWidth="1.2" opacity="0.25" />
      <circle cx="50" cy="50" r="10" fill="#f8fafc" opacity="0.85" />
      <circle cx="50" cy="50" r="3.5" fill={accent} />
    </>
  );
}

function KiteMark({ accent }: { accent: string }) {
  return (
    <>
      <path d="M50 10 L78 46 L50 82 L22 46 Z" fill={accent} />
      <path d="M50 10 L50 82" stroke="#0f172a" strokeWidth="1.4" opacity="0.28" />
      <path d="M22 46 L78 46" stroke="#0f172a" strokeWidth="1.4" opacity="0.28" />
      <path d="M50 82 L44 94 L56 90 Z" fill={accent} opacity="0.7" />
    </>
  );
}

function CrystalMark({ accent }: { accent: string }) {
  return (
    <>
      <path d="M50 8 L74 36 L50 92 L26 36 Z" fill={accent} />
      <path d="M50 8 L50 92 L26 36 Z" fill="#0f172a" opacity="0.16" />
      <path d="M38 36 L50 8 L62 36 Z" fill="#f8fafc" opacity="0.32" />
      <path d="M26 36 L74 36" stroke="#f8fafc" strokeWidth="1.4" opacity="0.4" />
    </>
  );
}

export function DigitalCardStudioAvatarFace({
  id,
  accent,
}: {
  id: CeleCardHouseAvatarId;
  accent: string;
}) {
  switch (id) {
    case "fox":
      return <FoxMark accent={accent} />;
    case "lion":
      return <LionMark accent={accent} />;
    case "crane":
      return <CraneMark accent={accent} />;
    case "whale":
      return <WhaleMark accent={accent} />;
    case "beetle":
      return <BeetleMark accent={accent} />;
    case "koi":
      return <KoiMark accent={accent} />;
    case "comet":
      return <CometMark accent={accent} />;
    case "prism":
      return <PrismMark accent={accent} />;
    case "orbit":
      return <OrbitMark accent={accent} />;
    case "spark":
      return <SparkMark accent={accent} />;
    case "knot":
      return <KnotMark accent={accent} />;
    case "eclipse":
      return <EclipseMark accent={accent} />;
    case "rocket":
      return <RocketMark accent={accent} />;
    case "vinyl":
      return <VinylMark accent={accent} />;
    case "kite":
      return <KiteMark accent={accent} />;
    case "crystal":
      return <CrystalMark accent={accent} />;
    default:
      return null;
  }
}
