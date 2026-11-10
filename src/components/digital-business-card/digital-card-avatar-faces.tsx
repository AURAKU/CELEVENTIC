import type { CeleCardHouseAvatarId } from "@/lib/digital-business-card/portraits";
import { DigitalCardStudioAvatarFace } from "@/components/digital-business-card/digital-card-avatar-studio";

type FaceTone = {
  skin: string;
  hair: string;
  brow: string;
  lip: string;
  eye: string;
};

type FaceShape = "round" | "oval" | "square" | "heart" | "long" | "wide";
type EyeStyle = "round" | "almond" | "hooded" | "lid" | "wide" | "deep";
type NoseStyle = "soft" | "broad" | "button" | "straight";
type BeardStyle = "none" | "stubble" | "full" | "goatee" | "mustache";

const CROP: FaceTone = { skin: "#e2c2a4", hair: "#1c1917", brow: "#3f2a1d", lip: "#b56a58", eye: "#2a1c14" };
const SPECS: FaceTone = { skin: "#8d5524", hair: "#14110f", brow: "#2a1c14", lip: "#6b3a2a", eye: "#14110f" };
const WRAP: FaceTone = { skin: "#c9a07a", hair: "#3f2a1d", brow: "#4a3224", lip: "#a45c4a", eye: "#2a1c14" };
const AFRO: FaceTone = { skin: "#a86b42", hair: "#1c1917", brow: "#3f2a1d", lip: "#8a4a3a", eye: "#1c1917" };
const LONGWAVE: FaceTone = { skin: "#d7a078", hair: "#3f2a1d", brow: "#5a3a28", lip: "#b56a58", eye: "#3f2a1d" };
const BRAIDS: FaceTone = { skin: "#c68642", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a4e3c", eye: "#1c1917" };
const HOOD: FaceTone = { skin: "#f0d0b8", hair: "#2a1c14", brow: "#4a3224", lip: "#c47a72", eye: "#1c1917" };
const PUFF: FaceTone = { skin: "#4a2a18", hair: "#14110f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const LOCS: FaceTone = { skin: "#7a4a28", hair: "#1c1917", brow: "#2a1c14", lip: "#6b3a2a", eye: "#1c1917" };
const SILVER: FaceTone = { skin: "#e6cbb8", hair: "#c5c0b5", brow: "#7a6e62", lip: "#a45c4a", eye: "#4a5568" };
const FADE: FaceTone = { skin: "#5c3317", hair: "#14110f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const CROWN: FaceTone = { skin: "#6b3a1e", hair: "#14110f", brow: "#2a1c14", lip: "#6b3a2a", eye: "#14110f" };
const BOB: FaceTone = { skin: "#f3d7c4", hair: "#1c1917", brow: "#3f2a1d", lip: "#c47a72", eye: "#1c1917" };
const ROWS: FaceTone = { skin: "#3f2414", hair: "#14110f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const TWISTS: FaceTone = { skin: "#c68642", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a4e3c", eye: "#1c1917" };
const COLLAR: FaceTone = { skin: "#c4a07a", hair: "#3f2a1d", brow: "#4a3224", lip: "#9a5340", eye: "#1c1917" };
const KOHL: FaceTone = { skin: "#c9a06a", hair: "#1c1917", brow: "#3f2a1d", lip: "#a45c4a", eye: "#1c1917" };
const RUSSET: FaceTone = { skin: "#f3d0bc", hair: "#b4532a", brow: "#8a3d1c", lip: "#c47a72", eye: "#4a6a8a" };
const MESA: FaceTone = { skin: "#b8734a", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a4e3c", eye: "#1c1917" };
const NILE: FaceTone = { skin: "#6b3a22", hair: "#14110f", brow: "#2a1c14", lip: "#7a4032", eye: "#14110f" };
const ISLAND: FaceTone = { skin: "#8a5a38", hair: "#1c1917", brow: "#2a1c14", lip: "#8a4a3a", eye: "#1c1917" };
const SILK: FaceTone = { skin: "#e8c8b0", hair: "#1c1917", brow: "#3f2a1d", lip: "#b56a58", eye: "#1c1917" };
const PAMPAS: FaceTone = { skin: "#c9956c", hair: "#2a1c14", brow: "#3f2a1d", lip: "#9a5340", eye: "#2a1c14" };

function Shoulders({ color }: { color: string }) {
  return <path d="M8 100 C16 74 30 66 50 66 C70 66 84 74 92 100 Z" fill={color} />;
}

function Neck({ skin, wide }: { skin: string; wide?: boolean }) {
  return (
    <path
      d={wide ? "M40 60 C41 74 44 80 50 80 C56 80 59 74 60 60 Z" : "M42 60 C43 72 45 78 50 78 C55 78 57 72 58 60 Z"}
      fill={skin}
    />
  );
}

function Head({ skin, shape }: { skin: string; shape: FaceShape }) {
  const left = shape === "wide" ? 23.5 : shape === "long" ? 28.5 : 26.5;
  const right = 100 - left;
  const earY = shape === "long" ? 54 : shape === "square" ? 53 : 52;
  return (
    <>
      <ellipse cx={left} cy={earY} rx={shape === "wide" ? 5.8 : 5.1} ry={shape === "square" ? 6.4 : 7.3} fill={skin} />
      <ellipse cx={right} cy={earY} rx={shape === "wide" ? 5.8 : 5.1} ry={shape === "square" ? 6.4 : 7.3} fill={skin} />
      {shape === "round" ? <ellipse cx="50" cy="50" rx="24.4" ry="25" fill={skin} /> : null}
      {shape === "oval" ? <ellipse cx="50" cy="48.5" rx="22.2" ry="27.2" fill={skin} /> : null}
      {shape === "square" ? (
        <path d="M29 38 C29 22 71 22 71 38 L71 58 C71 71 63 75 50 75 C37 75 29 71 29 58 Z" fill={skin} />
      ) : null}
      {shape === "heart" ? (
        <path d="M27.5 40 C27.5 23 72.5 23 72.5 40 C72.5 54 64 69 50 76.5 C36 69 27.5 54 27.5 40 Z" fill={skin} />
      ) : null}
      {shape === "long" ? <ellipse cx="50" cy="49" rx="20.2" ry="29.4" fill={skin} /> : null}
      {shape === "wide" ? <ellipse cx="50" cy="50.5" rx="26.4" ry="23.2" fill={skin} /> : null}
    </>
  );
}

function Eyes({
  tone,
  style,
  y = 51,
}: {
  tone: FaceTone;
  style: EyeStyle;
  y?: number;
}) {
  const gap = style === "wide" ? 19.6 : style === "deep" ? 14.6 : 16.2;
  const lx = 50 - gap / 2;
  const rx = 50 + gap / 2;
  const rxW = style === "round" || style === "wide" ? 3.7 : style === "lid" ? 4.6 : style === "deep" ? 3.1 : 4.1;
  const ryH = style === "lid" ? 2.55 : style === "hooded" ? 3.1 : style === "almond" ? 3.25 : style === "deep" ? 3.4 : 4;
  const shine = (cx: number) => <circle cx={cx + 1.05} cy={y - 1.15} r="0.95" fill="#fff" />;
  return (
    <>
      <ellipse cx={lx} cy={y} rx={rxW} ry={ryH} fill={tone.eye} />
      <ellipse cx={rx} cy={y} rx={rxW} ry={ryH} fill={tone.eye} />
      {shine(lx)}
      {shine(rx)}
      {style === "hooded" ? (
        <>
          <path d={`M${lx - 5} ${y - 2.2} Q${lx} ${y - 4.4} ${lx + 5} ${y - 2.2}`} fill="none" stroke={tone.brow} strokeWidth="1.5" strokeLinecap="round" />
          <path d={`M${rx - 5} ${y - 2.2} Q${rx} ${y - 4.4} ${rx + 5} ${y - 2.2}`} fill="none" stroke={tone.brow} strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
      {style === "lid" ? (
        <>
          <path d={`M${lx - 5.2} ${y - 0.4} Q${lx} ${y - 3.1} ${lx + 5.2} ${y - 0.2}`} fill="none" stroke={tone.brow} strokeWidth="1.35" strokeLinecap="round" />
          <path d={`M${rx - 5.2} ${y - 0.4} Q${rx} ${y - 3.1} ${rx + 5.2} ${y - 0.2}`} fill="none" stroke={tone.brow} strokeWidth="1.35" strokeLinecap="round" />
        </>
      ) : null}
    </>
  );
}

function Brows({ tone, style, y = 43 }: { tone: FaceTone; style: "soft" | "full" | "arch" | "straight"; y?: number }) {
  const lift = style === "arch" ? 2.4 : style === "straight" ? 0.6 : 1.6;
  const width = style === "full" ? 2.55 : 2;
  return (
    <>
      <path d={`M35.5 ${y} Q42 ${y - lift} 47.6 ${y + 0.2}`} fill="none" stroke={tone.brow} strokeWidth={width} strokeLinecap="round" />
      <path d={`M52.4 ${y + 0.2} Q58 ${y - lift} 64.5 ${y}`} fill="none" stroke={tone.brow} strokeWidth={width} strokeLinecap="round" />
    </>
  );
}

function Nose({ tone, style }: { tone: FaceTone; style: NoseStyle }) {
  const color = tone.brow;
  if (style === "button") {
    return <ellipse cx="50" cy="57.4" rx="2.3" ry="1.7" fill={color} opacity="0.35" />;
  }
  if (style === "broad") {
    return (
      <>
        <path d="M50 52.5 L50 57.2" stroke={color} strokeWidth="1.35" opacity="0.45" strokeLinecap="round" />
        <ellipse cx="47.4" cy="58.2" rx="1.7" ry="1.25" fill={color} opacity="0.32" />
        <ellipse cx="52.6" cy="58.2" rx="1.7" ry="1.25" fill={color} opacity="0.32" />
      </>
    );
  }
  if (style === "straight") {
    return <path d="M50 51.8 L50 58" stroke={color} strokeWidth="1.25" opacity="0.4" strokeLinecap="round" />;
  }
  return <path d="M50 53 Q48.6 57.6 50 58.2 Q51.4 57.6 50 53" fill={color} opacity="0.28" />;
}

function Mouth({ tone, smile = 1, wide }: { tone: FaceTone; smile?: number; wide?: boolean }) {
  const y = 63.6 + smile * 0.35;
  const span = wide ? 8.4 : 6.2;
  return (
    <path
      d={`M${50 - span} ${y} Q50 ${y + 3.8 + smile * 0.6} ${50 + span} ${y}`}
      fill="none"
      stroke={tone.lip}
      strokeWidth="1.85"
      strokeLinecap="round"
    />
  );
}

function Beard({ tone, style }: { tone: FaceTone; style: BeardStyle }) {
  if (style === "none") return null;
  if (style === "mustache") {
    return <path d="M43 61.4 Q50 64.6 57 61.4" fill="none" stroke={tone.hair} strokeWidth="2.1" strokeLinecap="round" />;
  }
  if (style === "goatee") {
    return <path d="M46 66 C48 74 52 74 54 66 C52 70 48 70 46 66 Z" fill={tone.hair} />;
  }
  if (style === "stubble") {
    return <path d="M34 60 C36 74 64 74 66 60 C62 70 38 70 34 60 Z" fill={tone.hair} opacity="0.38" />;
  }
  return <path d="M32 58 C34 78 66 78 68 58 C64 72 36 72 32 58 Z" fill={tone.hair} />;
}

function Glasses({ color }: { color: string }) {
  return (
    <>
      <circle cx="41.5" cy="51" r="8.2" fill="none" stroke={color} strokeWidth="2.1" />
      <circle cx="58.5" cy="51" r="8.2" fill="none" stroke={color} strokeWidth="2.1" />
      <path d="M49.6 51 H50.4" stroke={color} strokeWidth="2" />
      <path d="M33.4 50 H27" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M66.6 50 H73" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Hoop({ accent, side = "left" }: { accent: string; side?: "left" | "right" | "both" }) {
  return (
    <>
      {side !== "right" ? <circle cx="25.2" cy="58" r="3.4" fill="none" stroke={accent} strokeWidth="1.7" /> : null}
      {side !== "left" ? <circle cx="74.8" cy="58" r="3.4" fill="none" stroke={accent} strokeWidth="1.7" /> : null}
    </>
  );
}

function Face({
  tone,
  eyes,
  nose,
  brows,
  smile,
  beard = "none",
  wideMouth,
}: {
  tone: FaceTone;
  shape: FaceShape;
  eyes: EyeStyle;
  nose: NoseStyle;
  brows: "soft" | "full" | "arch" | "straight";
  smile?: number;
  beard?: BeardStyle;
  wideMouth?: boolean;
}) {
  return (
    <>
      <Brows tone={tone} style={brows} />
      <Eyes tone={tone} style={eyes} />
      <Nose tone={tone} style={nose} />
      <Beard tone={tone} style={beard} />
      <Mouth tone={tone} smile={smile} wide={wideMouth} />
    </>
  );
}

function CropFace({ accent }: { accent: string }) {
  const tone = CROP;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <path d="M26 50 C26 22 74 22 74 50 C70 28 30 28 26 50 Z" fill={tone.hair} />
      <Head skin={tone.skin} shape="round" />
      <path d="M28 44 C32 26 50 22 60 29 C46 24 30 34 28 44 Z" fill={tone.hair} />
      <Face tone={tone} shape="round" eyes="lid" nose="button" brows="soft" />
      <Hoop accent={accent} />
    </>
  );
}

function SpecsFace({ accent }: { accent: string }) {
  const tone = SPECS;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="square" />
      <path d="M32 28 C42 20 60 20 68 30 C62 24 38 24 32 28 Z" fill={tone.hair} />
      <Face tone={tone} shape="square" eyes="deep" nose="straight" brows="full" smile={0.15} beard="full" />
      <Glasses color={accent} />
    </>
  );
}

function WrapFace({ accent }: { accent: string }) {
  const tone = WRAP;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <path d="M18 58 C20 18 80 18 82 58 C78 78 22 78 18 58 Z" fill={accent} />
      <path d="M24 54 C28 28 72 28 76 54 C70 36 30 36 24 54 Z" fill={accent} />
      <ellipse cx="50" cy="54" rx="20.8" ry="23.4" fill={tone.skin} />
      <Face tone={tone} shape="oval" eyes="almond" nose="soft" brows="arch" />
      <circle cx="72" cy="62" r="2.2" fill={accent} stroke="#fff" strokeWidth="0.7" />
    </>
  );
}

function AfroFace({ accent }: { accent: string }) {
  const tone = AFRO;
  return (
    <>
      <Shoulders color={accent} />
      <circle cx="50" cy="42" r="40" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <Face tone={tone} shape="round" eyes="round" nose="broad" brows="arch" smile={1.15} />
    </>
  );
}

function LongWaveFace({ accent }: { accent: string }) {
  const tone = LONGWAVE;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M22 36 C18 8 82 4 86 40 C92 78 78 102 70 100 C76 70 78 48 70 36 C58 8 28 16 22 36 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="heart" />
      <path d="M24 46 C28 58 26 78 22 92 C30 74 34 54 32 44 Z" fill={tone.hair} />
      <Face tone={tone} shape="heart" eyes="almond" nose="soft" brows="arch" />
      <Glasses color="#2a1c14" />
    </>
  );
}

function BraidsFace({ accent }: { accent: string }) {
  const tone = BRAIDS;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M24 28 C30 10 70 10 76 28 C80 44 74 52 70 48 C66 22 34 22 30 48 C26 52 20 42 24 28 Z" fill={tone.hair} />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M${30 + i * 10} 46 C${28 + i * 10} 70 ${32 + i * 10} 88 ${30 + i * 10} 100`}
          fill="none"
          stroke={tone.hair}
          strokeWidth="5.2"
          strokeLinecap="round"
        />
      ))}
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="oval" />
      <Face tone={tone} shape="oval" eyes="almond" nose="broad" brows="full" />
      <Hoop accent={accent} side="both" />
    </>
  );
}

function HoodFace({ accent }: { accent: string }) {
  const tone = HOOD;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M14 100 C12 48 22 14 50 12 C78 14 88 48 86 100 Z" fill={accent} />
      <path d="M24 100 C24 56 32 28 50 26 C68 28 76 56 76 100 Z" fill="#0f172a" opacity="0.18" />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="oval" />
      <path d="M32 40 C38 28 62 28 68 40 C60 32 40 32 32 40 Z" fill={tone.hair} />
      <Face tone={tone} shape="oval" eyes="lid" nose="button" brows="straight" smile={0.4} />
    </>
  );
}

function PuffFace({ accent }: { accent: string }) {
  const tone = PUFF;
  return (
    <>
      <Shoulders color={accent} />
      <circle cx="50" cy="22" r="22" fill={tone.hair} />
      <path d="M28 40 C32 28 68 28 72 40 C68 34 32 34 28 40 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <Face tone={tone} shape="round" eyes="round" nose="broad" brows="arch" smile={1.1} />
      <circle cx="74.6" cy="58" r="2.4" fill="#f4e6c8" />
    </>
  );
}

function LocsFace({ accent }: { accent: string }) {
  const tone = LOCS;
  return (
    <>
      <Shoulders color={accent} />
      <ellipse cx="50" cy="24" rx="20" ry="16" fill={tone.hair} />
      {[18, 28, 38, 62, 72, 82].map((x) => (
        <path
          key={x}
          d={`M${x} 30 C${x - 3} 58 ${x + 4} 78 ${x} 96`}
          fill="none"
          stroke={tone.hair}
          strokeWidth="6"
          strokeLinecap="round"
        />
      ))}
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="square" />
      <Face tone={tone} shape="square" eyes="deep" nose="broad" brows="full" smile={0.3} beard="goatee" />
    </>
  );
}

function SilverFace({ accent }: { accent: string }) {
  const tone = SILVER;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <path d="M26 48 C26 20 74 20 74 48 C70 26 30 26 26 48 Z" fill={tone.hair} />
      <Head skin={tone.skin} shape="square" />
      <path d="M36 64 C40 70 60 70 64 64" fill="none" stroke={tone.hair} strokeWidth="1.4" opacity="0.45" />
      <Face tone={tone} shape="square" eyes="hooded" nose="straight" brows="straight" smile={0.25} beard="stubble" />
      <Glasses color="#57534e" />
    </>
  );
}

function FadeFace({ accent }: { accent: string }) {
  const tone = FADE;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} wide />
      <path d="M30 46 C30 18 70 16 72 44 C64 22 36 24 30 46 Z" fill={tone.hair} />
      <Head skin={tone.skin} shape="wide" />
      <path d="M28 40 C34 30 50 24 62 30 C50 26 34 34 28 40 Z" fill={tone.hair} />
      <Face tone={tone} shape="wide" eyes="round" nose="broad" brows="full" beard="stubble" />
      <Hoop accent={accent} />
    </>
  );
}

function CrownFace({ accent }: { accent: string }) {
  const tone = CROWN;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <path d="M20 56 C18 16 82 16 80 56 C76 28 24 28 20 56 Z" fill={accent} />
      <path d="M22 54 C26 34 74 34 78 54 C72 42 28 42 22 54 Z" fill={accent} />
      <ellipse cx="50" cy="36" rx="18" ry="8" fill={accent} />
      <Head skin={tone.skin} shape="oval" />
      <Face tone={tone} shape="oval" eyes="almond" nose="broad" brows="arch" />
      <path d="M50 78 C46 84 54 84 50 78" fill="none" stroke={accent} strokeWidth="2.2" />
    </>
  );
}

function BobFace({ accent }: { accent: string }) {
  const tone = BOB;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M22 40 C24 12 76 12 78 40 C80 68 70 78 64 72 C62 48 38 48 36 72 C30 78 20 66 22 40 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <path d="M30 42 C36 30 64 30 70 42 C62 34 38 34 30 42 Z" fill={tone.hair} />
      <Face tone={tone} shape="round" eyes="lid" nose="button" brows="soft" />
    </>
  );
}

function RowsFace({ accent }: { accent: string }) {
  const tone = ROWS;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="long" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${32 + i * 9} 22 C${34 + i * 9} 36 ${32 + i * 9} 48 ${34 + i * 9} 60`}
          fill="none"
          stroke={tone.hair}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      ))}
      <Face tone={tone} shape="long" eyes="deep" nose="broad" brows="straight" smile={0.25} />
      <Hoop accent={accent} />
    </>
  );
}

function TwistsFace({ accent }: { accent: string }) {
  const tone = TWISTS;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M22 38 C26 10 74 10 78 38 C82 58 74 64 70 58 C66 22 34 22 30 58 C26 64 18 54 22 38 Z" fill={tone.hair} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <circle cx={32 + i * 9} cy={64 + (i % 2) * 8} r="4.4" fill={tone.hair} />
          <circle cx={32 + i * 9} cy={78 + (i % 2) * 8} r="4.2" fill={tone.hair} />
        </g>
      ))}
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="heart" />
      <path d="M28 40 C50 28 72 40 72 40" fill="none" stroke={accent} strokeWidth="3.4" strokeLinecap="round" />
      <Face tone={tone} shape="heart" eyes="almond" nose="soft" brows="arch" />
    </>
  );
}

function CollarFace({ accent }: { accent: string }) {
  const tone = COLLAR;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M34 78 L50 92 L66 78 L70 100 H30 Z" fill="#fff7ed" />
      <path d="M34 78 L50 90 L40 100" fill={accent} />
      <path d="M66 78 L50 90 L60 100" fill={accent} />
      <path d="M18 38 C22 8 78 8 84 44 C78 78 70 96 64 92 C72 58 70 36 62 28 C48 12 28 22 18 38 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="long" />
      <Face tone={tone} shape="long" eyes="hooded" nose="straight" brows="full" smile={0.7} beard="mustache" />
    </>
  );
}

function KohlFace({ accent }: { accent: string }) {
  const tone = KOHL;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M20 34 C24 6 76 6 80 36 C86 78 74 102 66 100 C74 70 76 42 68 32 C54 8 30 16 20 34 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="oval" />
      <path d="M30 40 C50 28 70 40 70 40" fill="none" stroke={tone.hair} strokeWidth="3.2" />
      <Face tone={tone} shape="oval" eyes="almond" nose="soft" brows="arch" />
      <circle cx="50" cy="56.4" r="1.35" fill={accent} />
      <Hoop accent={accent} side="both" />
    </>
  );
}

function RussetFace({ accent }: { accent: string }) {
  const tone = RUSSET;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M22 42 C20 12 80 10 80 44 C82 70 72 80 64 72 C62 50 38 50 36 72 C28 80 20 66 22 42 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <path d="M30 42 C38 28 64 28 70 42 C62 32 38 32 30 42 Z" fill={tone.hair} />
      {[
        [40, 56],
        [46, 59],
        [54, 56],
        [60, 59],
        [43, 62],
        [57, 62],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.85" fill="#c47a72" opacity="0.7" />
      ))}
      <Face tone={tone} shape="round" eyes="round" nose="button" brows="soft" smile={1.05} />
    </>
  );
}

function MesaFace({ accent }: { accent: string }) {
  const tone = MESA;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M24 32 C28 10 72 10 76 32 C80 50 72 56 68 50 C64 22 36 22 32 50 C28 56 20 46 24 32 Z" fill={tone.hair} />
      <path d="M70 50 C74 70 78 88 72 100 C68 84 64 66 62 50 Z" fill={tone.hair} />
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="square" />
      <Face tone={tone} shape="square" eyes="almond" nose="broad" brows="straight" smile={0.2} />
    </>
  );
}

function NileFace({ accent }: { accent: string }) {
  const tone = NILE;
  return (
    <>
      <Shoulders color={accent} />
      {[32, 42, 50, 58, 68].map((x, i) => (
        <circle key={x} cx={x} cy={24 + (i % 2) * 4} r="7.4" fill={tone.hair} />
      ))}
      <path d="M30 38 C36 28 64 28 70 38 C64 32 36 32 30 38 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="long" />
      <Face tone={tone} shape="long" eyes="almond" nose="straight" brows="arch" smile={0.55} />
      <circle cx="74.8" cy="58" r="2.2" fill={accent} />
    </>
  );
}

function IslandFace({ accent }: { accent: string }) {
  const tone = ISLAND;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M16 40 C18 8 82 6 86 42 C90 78 78 102 70 98 C78 70 80 46 70 36 C56 10 28 16 16 40 Z" fill={tone.hair} />
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="wide" />
      <Face tone={tone} shape="wide" eyes="round" nose="broad" brows="full" smile={0.9} wideMouth />
      <Hoop accent={accent} side="both" />
    </>
  );
}

function SilkFace({ accent }: { accent: string }) {
  const tone = SILK;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <path d="M30 44 C32 18 70 16 72 42 C66 22 38 24 30 44 Z" fill={tone.hair} />
      <Head skin={tone.skin} shape="oval" />
      <path d="M32 38 C40 26 62 26 68 38 C58 28 40 30 32 38 Z" fill={tone.hair} />
      <Face tone={tone} shape="oval" eyes="lid" nose="straight" brows="straight" smile={0.35} />
    </>
  );
}

function PampasFace({ accent }: { accent: string }) {
  const tone = PAMPAS;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M22 38 C20 10 80 8 82 40 C84 72 74 86 66 78 C68 52 36 52 34 78 C26 86 20 68 22 38 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <path d="M28 42 C38 28 64 28 72 42 C62 32 38 32 28 42 Z" fill={tone.hair} />
      <Face tone={tone} shape="round" eyes="wide" nose="soft" brows="full" smile={0.7} beard="stubble" />
    </>
  );
}

export function DigitalCardAvatarFace({
  id,
  accent,
}: {
  id: CeleCardHouseAvatarId;
  accent: string;
  muted: string;
  fill: string;
}) {
  switch (id) {
    case "crop":
      return <CropFace accent={accent} />;
    case "specs":
      return <SpecsFace accent={accent} />;
    case "wrap":
      return <WrapFace accent={accent} />;
    case "afro":
      return <AfroFace accent={accent} />;
    case "longwave":
      return <LongWaveFace accent={accent} />;
    case "braids":
      return <BraidsFace accent={accent} />;
    case "hood":
      return <HoodFace accent={accent} />;
    case "puff":
      return <PuffFace accent={accent} />;
    case "locs":
      return <LocsFace accent={accent} />;
    case "silver":
      return <SilverFace accent={accent} />;
    case "fade":
      return <FadeFace accent={accent} />;
    case "crown":
      return <CrownFace accent={accent} />;
    case "bob":
      return <BobFace accent={accent} />;
    case "rows":
      return <RowsFace accent={accent} />;
    case "twists":
      return <TwistsFace accent={accent} />;
    case "collar":
      return <CollarFace accent={accent} />;
    case "kohl":
      return <KohlFace accent={accent} />;
    case "russet":
      return <RussetFace accent={accent} />;
    case "mesa":
      return <MesaFace accent={accent} />;
    case "nile":
      return <NileFace accent={accent} />;
    case "island":
      return <IslandFace accent={accent} />;
    case "silk":
      return <SilkFace accent={accent} />;
    case "pampas":
      return <PampasFace accent={accent} />;
    default:
      return <DigitalCardStudioAvatarFace id={id} accent={accent} />;
  }
}
