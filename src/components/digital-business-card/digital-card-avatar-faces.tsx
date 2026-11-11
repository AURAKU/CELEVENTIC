import type { CeleCardHouseAvatarId } from "@/lib/digital-business-card/portraits";
import { DigitalCardStudioAvatarFace } from "@/components/digital-business-card/digital-card-avatar-studio";

type FaceTone = {
  skin: string;
  hair: string;
  brow: string;
  lip: string;
  eye: string;
};

type FaceShape = "round" | "oval" | "square" | "heart" | "long" | "wide" | "diamond";
type EyeStyle = "round" | "almond" | "hooded" | "lid" | "wide" | "deep" | "downturn";
type NoseStyle = "soft" | "broad" | "button" | "straight";
type LipStyle = "thin" | "soft" | "full";
type BeardStyle = "none" | "stubble" | "full" | "goatee" | "mustache";
type BrowStyle = "soft" | "full" | "arch" | "straight";

const CROP: FaceTone = { skin: "#c9a06a", hair: "#1c1917", brow: "#3f2a1d", lip: "#a45c4a", eye: "#2a1c14" };
const SPECS: FaceTone = { skin: "#6b3a1e", hair: "#14110f", brow: "#1c140f", lip: "#6b3a2a", eye: "#14110f" };
const WRAP: FaceTone = { skin: "#d2b08a", hair: "#3f2a1d", brow: "#4a3224", lip: "#b56a58", eye: "#2a1c14" };
const AFRO: FaceTone = { skin: "#8d5524", hair: "#1c1917", brow: "#2a1c14", lip: "#8a4a3a", eye: "#1c1917" };
const LONGWAVE: FaceTone = { skin: "#e8c8b0", hair: "#3f2a1d", brow: "#5a3a28", lip: "#c47a72", eye: "#3f2a1d" };
const BRAIDS: FaceTone = { skin: "#a86b42", hair: "#1c1917", brow: "#2a1c14", lip: "#9a4e3c", eye: "#1c1917" };
const HOOD: FaceTone = { skin: "#f6e0cc", hair: "#2a1c14", brow: "#5a3a28", lip: "#d08a82", eye: "#4a5568" };
const PUFF: FaceTone = { skin: "#3a2014", hair: "#14110f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const LOCS: FaceTone = { skin: "#7a4a28", hair: "#1c1917", brow: "#2a1c14", lip: "#6b3a2a", eye: "#1c1917" };
const SILVER: FaceTone = { skin: "#ead3c2", hair: "#c9c4b8", brow: "#7a6e62", lip: "#a45c4a", eye: "#4a5568" };
const FADE: FaceTone = { skin: "#4a2a18", hair: "#14110f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const CROWN: FaceTone = { skin: "#5c3317", hair: "#14110f", brow: "#2a1c14", lip: "#6b3a2a", eye: "#14110f" };
const BOB: FaceTone = { skin: "#f3d7c4", hair: "#1c1917", brow: "#3f2a1d", lip: "#c47a72", eye: "#2a1c14" };
const ROWS: FaceTone = { skin: "#2e1a12", hair: "#14110f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const TWISTS: FaceTone = { skin: "#c68642", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a4e3c", eye: "#1c1917" };
const COLLAR: FaceTone = { skin: "#c4a07a", hair: "#3f2a1d", brow: "#4a3224", lip: "#9a5340", eye: "#1c1917" };
const KOHL: FaceTone = { skin: "#c9956c", hair: "#1c1917", brow: "#3f2a1d", lip: "#a45c4a", eye: "#1c1917" };
const RUSSET: FaceTone = { skin: "#f3d0bc", hair: "#b4532a", brow: "#8a3d1c", lip: "#c47a72", eye: "#4a6a8a" };
const MESA: FaceTone = { skin: "#b8734a", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a4e3c", eye: "#1c1917" };
const NILE: FaceTone = { skin: "#6b3a22", hair: "#14110f", brow: "#2a1c14", lip: "#7a4032", eye: "#14110f" };
const ISLAND: FaceTone = { skin: "#8a5a38", hair: "#1c1917", brow: "#2a1c14", lip: "#8a4a3a", eye: "#1c1917" };
const SILK: FaceTone = { skin: "#e8c4a8", hair: "#1a1410", brow: "#3f2a1d", lip: "#b56a58", eye: "#1c1917" };
const PAMPAS: FaceTone = { skin: "#d4a07a", hair: "#2a1c14", brow: "#3f2a1d", lip: "#9a5340", eye: "#2a1c14" };
const BUN: FaceTone = { skin: "#f0d2b8", hair: "#1a1410", brow: "#3f2a1d", lip: "#c47a72", eye: "#1c1917" };
const BANGS: FaceTone = { skin: "#f6e0cc", hair: "#14110f", brow: "#3f2a1d", lip: "#d08a82", eye: "#2a1c14" };
const TURBAN: FaceTone = { skin: "#c68642", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a4e3c", eye: "#1c1917" };
const KUFI: FaceTone = { skin: "#5c3317", hair: "#14110f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const PIXIE: FaceTone = { skin: "#f8e4d4", hair: "#3f2a1d", brow: "#5a3a28", lip: "#c47a72", eye: "#5a7188" };
const BALD: FaceTone = { skin: "#3f2414", hair: "#1c140f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const CURLS: FaceTone = { skin: "#d7a078", hair: "#2a1c14", brow: "#3f2a1d", lip: "#a45c4a", eye: "#1c1917" };
const PLAITS: FaceTone = { skin: "#b56a3c", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a4e3c", eye: "#1c1917" };
const BEANIE: FaceTone = { skin: "#e8c8b8", hair: "#3f2a1d", brow: "#5a3a28", lip: "#b56a58", eye: "#3a4a62" };
const FLAX: FaceTone = { skin: "#f8e4d4", hair: "#e4c878", brow: "#c4a05a", lip: "#d08a82", eye: "#5a7188" };
const RIDGE: FaceTone = { skin: "#6b3a22", hair: "#14110f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const PONY: FaceTone = { skin: "#c9956c", hair: "#1c1917", brow: "#3f2a1d", lip: "#b56a58", eye: "#1c1917" };
const PEARL: FaceTone = { skin: "#ead3c2", hair: "#d4cfc6", brow: "#8a7e72", lip: "#b56a58", eye: "#4a5568" };
const TIARE: FaceTone = { skin: "#8a5a38", hair: "#1c1917", brow: "#2a1c14", lip: "#8a4a3a", eye: "#1c1917" };
const CEDAR: FaceTone = { skin: "#c9a06a", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a5340", eye: "#1c1917" };

function Shoulders({ color }: { color: string }) {
  return <path d="M8 100 C16 74 30 66 50 66 C70 66 84 74 92 100 Z" fill={color} />;
}

function Neck({ skin, wide }: { skin: string; wide?: boolean }) {
  return (
    <path
      d={wide ? "M39 60 C40 75 43 82 50 82 C57 82 60 75 61 60 Z" : "M42 60 C43 73 45 80 50 80 C55 80 57 73 58 60 Z"}
      fill={skin}
    />
  );
}

function Head({ skin, shape, ears = true }: { skin: string; shape: FaceShape; ears?: boolean }) {
  const left = shape === "wide" ? 21.8 : shape === "long" ? 29.8 : shape === "diamond" ? 26.2 : shape === "oval" ? 27.4 : 25.4;
  const right = 100 - left;
  const earY = shape === "long" ? 54 : shape === "square" ? 53.4 : shape === "heart" ? 49.5 : shape === "diamond" ? 51 : 52;
  const earRx = shape === "wide" ? 6.4 : 5.2;
  const earRy = shape === "square" ? 6.1 : shape === "long" ? 6.6 : 7.4;
  return (
    <>
      {ears ? (
        <>
          <ellipse cx={left} cy={earY} rx={earRx} ry={earRy} fill={skin} />
          <ellipse cx={right} cy={earY} rx={earRx} ry={earRy} fill={skin} />
        </>
      ) : null}
      {shape === "round" ? <ellipse cx="50" cy="51.2" rx="26.6" ry="27.2" fill={skin} /> : null}
      {shape === "oval" ? <ellipse cx="50" cy="48.8" rx="21.4" ry="29.2" fill={skin} /> : null}
      {shape === "square" ? (
        <path d="M26.8 35 C26.8 19.5 73.2 19.5 73.2 35 L73.2 61 C73.2 75.5 64.5 79.8 50 79.8 C35.5 79.8 26.8 75.5 26.8 61 Z" fill={skin} />
      ) : null}
      {shape === "heart" ? (
        <path d="M25.5 37.5 C25.5 19 74.5 19 74.5 37.5 C74.5 50 67.5 64.5 50 80.5 C32.5 64.5 25.5 50 25.5 37.5 Z" fill={skin} />
      ) : null}
      {shape === "long" ? <ellipse cx="50" cy="50" rx="18.8" ry="32" fill={skin} /> : null}
      {shape === "wide" ? <ellipse cx="50" cy="52.4" rx="28.8" ry="22.2" fill={skin} /> : null}
      {shape === "diamond" ? (
        <path d="M50 19 C67 22 77.5 36 77.5 48 C77.5 63 64 77 50 81.5 C36 77 22.5 63 22.5 48 C22.5 36 33 22 50 19 Z" fill={skin} />
      ) : null}
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
  const gap = style === "wide" ? 21.2 : style === "deep" ? 14.4 : style === "round" ? 17.6 : 16.4;
  const lx = 50 - gap / 2;
  const rx = 50 + gap / 2;
  const open = style === "round" || style === "wide" || style === "deep" || style === "downturn";
  if (open) {
    const rxW = style === "wide" ? 5.8 : style === "round" ? 5.1 : style === "deep" ? 3.7 : 4.6;
    const ryH = style === "wide" ? 5 : style === "round" ? 4.8 : style === "deep" ? 3.9 : 3.5;
    const iris = style === "wide" ? 3.15 : style === "round" ? 2.95 : 2.25;
    const tilt = style === "downturn" ? 8 : 0;
    const eye = (cx: number, flip: number) => (
      <g transform={`rotate(${tilt * flip} ${cx} ${y})`}>
        <ellipse cx={cx} cy={y} rx={rxW} ry={ryH} fill="#f7f4ef" />
        <circle cx={cx} cy={y + 0.15} r={iris} fill={tone.eye} />
        <circle cx={cx} cy={y + 0.15} r={iris * 0.42} fill="#0b0908" />
        <circle cx={cx + 1.15} cy={y - 1.2} r="1.05" fill="#fff" />
      </g>
    );
    return (
      <>
        {eye(lx, -1)}
        {eye(rx, 1)}
      </>
    );
  }
  const rxW = style === "lid" ? 5.1 : style === "almond" ? 4.6 : 4.2;
  const ryH = style === "lid" ? 2.35 : style === "hooded" ? 3 : 3.15;
  const lift = style === "almond" ? -0.35 : 0;
  return (
    <>
      <ellipse cx={lx} cy={y + lift} rx={rxW} ry={ryH} fill={tone.eye} />
      <ellipse cx={rx} cy={y + lift} rx={rxW} ry={ryH} fill={tone.eye} />
      <circle cx={lx + 1.2} cy={y - 0.85} r="0.85" fill="#fff" />
      <circle cx={rx + 1.2} cy={y - 0.85} r="0.85" fill="#fff" />
      {style === "hooded" ? (
        <>
          <path d={`M${lx - 5.4} ${y - 1.8} Q${lx} ${y - 4.6} ${lx + 5.4} ${y - 1.6}`} fill="none" stroke={tone.brow} strokeWidth="1.7" strokeLinecap="round" />
          <path d={`M${rx - 5.4} ${y - 1.6} Q${rx} ${y - 4.6} ${rx + 5.4} ${y - 1.8}`} fill="none" stroke={tone.brow} strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : null}
      {style === "lid" ? (
        <>
          <path d={`M${lx - 5.6} ${y - 0.15} Q${lx} ${y - 2.9} ${lx + 5.6} ${y + 0.05}`} fill="none" stroke={tone.brow} strokeWidth="1.45" strokeLinecap="round" />
          <path d={`M${rx - 5.6} ${y - 0.15} Q${rx} ${y - 2.9} ${rx + 5.6} ${y + 0.05}`} fill="none" stroke={tone.brow} strokeWidth="1.45" strokeLinecap="round" />
        </>
      ) : null}
      {style === "almond" ? (
        <>
          <path d={`M${lx - 5.2} ${y + 0.4} Q${lx} ${y - 2.4} ${lx + 5.4} ${y - 0.2}`} fill="none" stroke={tone.brow} strokeWidth="1.15" strokeLinecap="round" opacity="0.55" />
          <path d={`M${rx - 5.4} ${y - 0.2} Q${rx} ${y - 2.4} ${rx + 5.2} ${y + 0.4}`} fill="none" stroke={tone.brow} strokeWidth="1.15" strokeLinecap="round" opacity="0.55" />
        </>
      ) : null}
    </>
  );
}

function Brows({ tone, style, y = 42.5 }: { tone: FaceTone; style: BrowStyle; y?: number }) {
  const lift = style === "arch" ? 2.8 : style === "straight" ? 0.35 : 1.5;
  const width = style === "full" ? 2.7 : style === "soft" ? 1.7 : 2.1;
  return (
    <>
      <path d={`M34.6 ${y} Q42 ${y - lift} 47.8 ${y + 0.35}`} fill="none" stroke={tone.brow} strokeWidth={width} strokeLinecap="round" />
      <path d={`M52.2 ${y + 0.35} Q58 ${y - lift} 65.4 ${y}`} fill="none" stroke={tone.brow} strokeWidth={width} strokeLinecap="round" />
    </>
  );
}

function Nose({ tone, style }: { tone: FaceTone; style: NoseStyle }) {
  const color = tone.brow;
  if (style === "button") {
    return <ellipse cx="50" cy="57.6" rx="2.45" ry="1.85" fill={color} opacity="0.38" />;
  }
  if (style === "broad") {
    return (
      <>
        <path d="M50 51.8 L50 57.4" stroke={color} strokeWidth="1.45" opacity="0.42" strokeLinecap="round" />
        <ellipse cx="46.8" cy="58.5" rx="2.05" ry="1.4" fill={color} opacity="0.36" />
        <ellipse cx="53.2" cy="58.5" rx="2.05" ry="1.4" fill={color} opacity="0.36" />
      </>
    );
  }
  if (style === "straight") {
    return (
      <>
        <path d="M50 50.8 L50 58.4" stroke={color} strokeWidth="1.3" opacity="0.42" strokeLinecap="round" />
        <ellipse cx="50" cy="58.6" rx="1.7" ry="1.1" fill={color} opacity="0.28" />
      </>
    );
  }
  return <path d="M50 52.4 Q48.2 57.8 50 58.6 Q51.8 57.8 50 52.4" fill={color} opacity="0.3" />;
}

function Mouth({
  tone,
  smile = 1,
  fullness = "soft",
  wide,
}: {
  tone: FaceTone;
  smile?: number;
  fullness?: LipStyle;
  wide?: boolean;
}) {
  if (fullness === "full") {
    const span = wide ? 9.2 : 8.1;
    return (
      <>
        <path d={`M${50 - span} 63.1 Q50 61.2 ${50 + span} 63.1 Q50 66.4 ${50 - span} 63.1 Z`} fill={tone.lip} opacity="0.82" />
        <path d={`M${50 - span} 63.3 Q50 ${70.6 + smile * 0.4} ${50 + span} 63.3 Q50 66.8 ${50 - span} 63.3 Z`} fill={tone.lip} />
      </>
    );
  }
  const y = 63.8 + smile * 0.3;
  const span = wide ? 8.6 : fullness === "thin" ? 5.6 : 6.5;
  return (
    <path
      d={`M${50 - span} ${y} Q50 ${y + (fullness === "thin" ? 2.4 : 3.6) + smile * 0.55} ${50 + span} ${y}`}
      fill="none"
      stroke={tone.lip}
      strokeWidth={fullness === "thin" ? 1.4 : 1.95}
      strokeLinecap="round"
    />
  );
}

function Beard({ tone, style }: { tone: FaceTone; style: BeardStyle }) {
  if (style === "none") return null;
  if (style === "mustache") {
    return <path d="M42.2 61 Q50 65.2 57.8 61" fill="none" stroke={tone.hair} strokeWidth="2.25" strokeLinecap="round" />;
  }
  if (style === "goatee") {
    return <path d="M45.4 66.2 C47.6 76 52.4 76 54.6 66.2 C52.2 71.4 47.8 71.4 45.4 66.2 Z" fill={tone.hair} />;
  }
  if (style === "stubble") {
    return <path d="M33 60 C35.5 76 64.5 76 67 60 C62.5 71 37.5 71 33 60 Z" fill={tone.hair} opacity="0.4" />;
  }
  return <path d="M31 57.5 C33.5 80.5 66.5 80.5 69 57.5 C64.5 74 35.5 74 31 57.5 Z" fill={tone.hair} />;
}

function AgeMarks({ tone }: { tone: FaceTone }) {
  return (
    <>
      <path d="M33.5 37.5 Q38 35.6 42.5 37.8" fill="none" stroke={tone.brow} strokeWidth="0.95" opacity="0.38" strokeLinecap="round" />
      <path d="M57.5 37.8 Q62 35.6 66.5 37.5" fill="none" stroke={tone.brow} strokeWidth="0.95" opacity="0.38" strokeLinecap="round" />
      <path d="M35.5 62.5 Q39.5 67 37.5 71.5" fill="none" stroke={tone.brow} strokeWidth="0.9" opacity="0.28" strokeLinecap="round" />
      <path d="M64.5 62.5 Q60.5 67 62.5 71.5" fill="none" stroke={tone.brow} strokeWidth="0.9" opacity="0.28" strokeLinecap="round" />
    </>
  );
}

function Glasses({ color }: { color: string }) {
  return (
    <>
      <circle cx="41.2" cy="51" r="8.4" fill="none" stroke={color} strokeWidth="2.15" />
      <circle cx="58.8" cy="51" r="8.4" fill="none" stroke={color} strokeWidth="2.15" />
      <path d="M49.5 51 H50.5" stroke={color} strokeWidth="2" />
      <path d="M32.8 50 H26.2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M67.2 50 H73.8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Hoop({ accent, side = "left" }: { accent: string; side?: "left" | "right" | "both" }) {
  return (
    <>
      {side !== "right" ? <circle cx="24.6" cy="58.5" r="3.55" fill="none" stroke={accent} strokeWidth="1.75" /> : null}
      {side !== "left" ? <circle cx="75.4" cy="58.5" r="3.55" fill="none" stroke={accent} strokeWidth="1.75" /> : null}
    </>
  );
}

function Flower({ x, y, petal, center }: { x: number; y: number; petal: string; center: string }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        return (
          <ellipse
            key={i}
            cx={x + Math.cos(a) * 4.2}
            cy={y + Math.sin(a) * 4.2}
            rx="3.1"
            ry="2.2"
            fill={petal}
            transform={`rotate(${(a * 180) / Math.PI} ${x + Math.cos(a) * 4.2} ${y + Math.sin(a) * 4.2})`}
          />
        );
      })}
      <circle cx={x} cy={y} r="2.1" fill={center} />
    </g>
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
  fullness = "soft",
  aged,
}: {
  tone: FaceTone;
  shape: FaceShape;
  eyes: EyeStyle;
  nose: NoseStyle;
  brows: BrowStyle;
  smile?: number;
  beard?: BeardStyle;
  wideMouth?: boolean;
  fullness?: LipStyle;
  aged?: boolean;
}) {
  return (
    <>
      <Brows tone={tone} style={brows} />
      <Eyes tone={tone} style={eyes} />
      <Nose tone={tone} style={nose} />
      <Beard tone={tone} style={beard} />
      <Mouth tone={tone} smile={smile} wide={wideMouth} fullness={fullness} />
      {aged ? <AgeMarks tone={tone} /> : null}
    </>
  );
}

function CropFace({ accent }: { accent: string }) {
  const tone = CROP;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <path d="M27 50 C27 20 73 20 73 50 C69 26 31 26 27 50 Z" fill={tone.hair} />
      <Head skin={tone.skin} shape="diamond" />
      <path d="M28 43 C33 24 52 20 62 28 C47 22 31 33 28 43 Z" fill={tone.hair} />
      <Face tone={tone} shape="diamond" eyes="almond" nose="soft" brows="arch" fullness="soft" />
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
      <path d="M31 27 C42 18 60 18 69 29 C62 22 38 22 31 27 Z" fill={tone.hair} />
      <Face tone={tone} shape="square" eyes="deep" nose="broad" brows="full" smile={0.1} beard="full" fullness="full" />
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
      <path d="M16 60 C18 16 82 16 84 60 C80 82 20 82 16 60 Z" fill={accent} />
      <path d="M22 56 C26 26 74 26 78 56 C72 36 28 36 22 56 Z" fill={accent} />
      <ellipse cx="50" cy="54.5" rx="21.2" ry="24.2" fill={tone.skin} />
      <Face tone={tone} shape="oval" eyes="almond" nose="soft" brows="arch" fullness="soft" />
      <circle cx="73" cy="63" r="2.15" fill={accent} stroke="#fff" strokeWidth="0.7" />
    </>
  );
}

function AfroFace({ accent }: { accent: string }) {
  const tone = AFRO;
  return (
    <>
      <Shoulders color={accent} />
      <circle cx="50" cy="40" r="42" fill={tone.hair} />
      <circle cx="22" cy="38" r="16" fill={tone.hair} />
      <circle cx="78" cy="38" r="16" fill={tone.hair} />
      <circle cx="36" cy="18" r="14" fill={tone.hair} />
      <circle cx="64" cy="18" r="14" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <Face tone={tone} shape="round" eyes="round" nose="broad" brows="arch" smile={1.2} fullness="full" />
    </>
  );
}

function LongWaveFace({ accent }: { accent: string }) {
  const tone = LONGWAVE;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M20 36 C16 6 84 2 88 40 C94 80 78 102 70 100 C76 70 78 46 70 34 C56 6 26 14 20 36 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="heart" />
      <path d="M22 46 C26 58 24 80 20 94 C28 74 32 52 30 42 Z" fill={tone.hair} />
      <Face tone={tone} shape="heart" eyes="downturn" nose="soft" brows="arch" fullness="soft" />
      <Glasses color="#2a1c14" />
    </>
  );
}

function BraidsFace({ accent }: { accent: string }) {
  const tone = BRAIDS;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M22 28 C28 8 72 8 78 28 C82 44 76 52 72 48 C68 20 32 20 28 48 C24 52 18 42 22 28 Z" fill={tone.hair} />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M${29 + i * 11} 46 C${27 + i * 11} 70 ${33 + i * 11} 88 ${29 + i * 11} 100`}
          fill="none"
          stroke={tone.hair}
          strokeWidth="5.4"
          strokeLinecap="round"
        />
      ))}
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="oval" />
      <Face tone={tone} shape="oval" eyes="round" nose="broad" brows="full" fullness="full" />
      <Hoop accent={accent} side="both" />
    </>
  );
}

function HoodFace({ accent }: { accent: string }) {
  const tone = HOOD;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M12 100 C10 46 22 12 50 10 C78 12 90 46 88 100 Z" fill={accent} />
      <path d="M24 100 C24 54 32 26 50 24 C68 26 76 54 76 100 Z" fill="#0f172a" opacity="0.18" />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="oval" />
      <path d="M32 40 C38 26 62 26 68 40 C60 30 40 30 32 40 Z" fill={tone.hair} />
      <Face tone={tone} shape="oval" eyes="wide" nose="button" brows="soft" smile={0.35} fullness="thin" />
    </>
  );
}

function PuffFace({ accent }: { accent: string }) {
  const tone = PUFF;
  return (
    <>
      <Shoulders color={accent} />
      <circle cx="50" cy="20" r="23.5" fill={tone.hair} />
      <path d="M27 40 C32 26 68 26 73 40 C68 32 32 32 27 40 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <Face tone={tone} shape="round" eyes="round" nose="broad" brows="arch" smile={1.15} fullness="full" />
      <circle cx="75.2" cy="58" r="2.45" fill="#f4e6c8" />
    </>
  );
}

function LocsFace({ accent }: { accent: string }) {
  const tone = LOCS;
  return (
    <>
      <Shoulders color={accent} />
      <ellipse cx="50" cy="22" rx="21" ry="16.5" fill={tone.hair} />
      {[16, 27, 38, 62, 73, 84].map((x) => (
        <path
          key={x}
          d={`M${x} 28 C${x - 3} 58 ${x + 4} 78 ${x} 98`}
          fill="none"
          stroke={tone.hair}
          strokeWidth="6.2"
          strokeLinecap="round"
        />
      ))}
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="square" />
      <Face tone={tone} shape="square" eyes="deep" nose="broad" brows="full" smile={0.25} beard="goatee" fullness="full" />
    </>
  );
}

function SilverFace({ accent }: { accent: string }) {
  const tone = SILVER;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <path d="M26 48 C26 18 74 18 74 48 C70 24 30 24 26 48 Z" fill={tone.hair} />
      <Head skin={tone.skin} shape="square" />
      <path d="M36 64 C40 71 60 71 64 64" fill="none" stroke={tone.hair} strokeWidth="1.45" opacity="0.45" />
      <Face tone={tone} shape="square" eyes="hooded" nose="straight" brows="straight" smile={0.2} beard="stubble" fullness="thin" aged />
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
      <path d="M29 46 C29 16 71 14 73 44 C64 20 36 22 29 46 Z" fill={tone.hair} />
      <Head skin={tone.skin} shape="wide" />
      <path d="M27 40 C34 28 50 22 63 28 C50 24 34 32 27 40 Z" fill={tone.hair} />
      <Face tone={tone} shape="wide" eyes="round" nose="broad" brows="full" beard="stubble" fullness="full" />
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
      <path d="M18 56 C16 14 84 14 82 56 C78 26 22 26 18 56 Z" fill={accent} />
      <path d="M20 54 C25 32 75 32 80 54 C74 40 26 40 20 54 Z" fill={accent} />
      <ellipse cx="50" cy="34" rx="19" ry="8.4" fill={accent} />
      <Head skin={tone.skin} shape="oval" ears={false} />
      <Face tone={tone} shape="oval" eyes="almond" nose="broad" brows="arch" fullness="full" />
      <path d="M50 78 C46 85 54 85 50 78" fill="none" stroke={accent} strokeWidth="2.2" />
    </>
  );
}

function BobFace({ accent }: { accent: string }) {
  const tone = BOB;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M20 40 C22 10 78 10 80 40 C82 70 70 80 64 74 C62 48 38 48 36 74 C30 80 18 66 20 40 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="heart" />
      <path d="M30 42 C36 28 64 28 70 42 C62 32 38 32 30 42 Z" fill={tone.hair} />
      <Face tone={tone} shape="heart" eyes="lid" nose="button" brows="soft" fullness="soft" />
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
          d={`M${31 + i * 9.5} 20 C${33 + i * 9.5} 36 ${31 + i * 9.5} 50 ${33 + i * 9.5} 62`}
          fill="none"
          stroke={tone.hair}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      ))}
      <Face tone={tone} shape="long" eyes="deep" nose="broad" brows="straight" smile={0.2} fullness="full" />
      <Hoop accent={accent} />
    </>
  );
}

function TwistsFace({ accent }: { accent: string }) {
  const tone = TWISTS;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M21 38 C25 8 75 8 79 38 C83 58 75 64 71 58 C67 20 33 20 29 58 C25 64 17 54 21 38 Z" fill={tone.hair} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <circle cx={31 + i * 9.5} cy={64 + (i % 2) * 8} r="4.5" fill={tone.hair} />
          <circle cx={31 + i * 9.5} cy={78 + (i % 2) * 8} r="4.3" fill={tone.hair} />
        </g>
      ))}
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="heart" />
      <path d="M28 40 C50 26 72 40 72 40" fill="none" stroke={accent} strokeWidth="3.5" strokeLinecap="round" />
      <Face tone={tone} shape="heart" eyes="round" nose="soft" brows="arch" fullness="full" />
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
      <path d="M16 38 C20 6 80 6 86 44 C78 80 70 98 64 94 C72 58 70 34 62 26 C46 8 26 20 16 38 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="long" />
      <Face tone={tone} shape="long" eyes="hooded" nose="straight" brows="full" smile={0.55} beard="mustache" fullness="soft" />
    </>
  );
}

function KohlFace({ accent }: { accent: string }) {
  const tone = KOHL;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M18 34 C22 4 78 4 82 36 C88 80 74 102 66 100 C74 70 76 40 68 30 C54 6 28 14 18 34 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="oval" />
      <path d="M30 40 C50 26 70 40 70 40" fill="none" stroke={tone.hair} strokeWidth="3.3" />
      <Face tone={tone} shape="oval" eyes="almond" nose="soft" brows="arch" fullness="full" />
      <circle cx="50" cy="56.6" r="1.4" fill={accent} />
      <Hoop accent={accent} side="both" />
    </>
  );
}

function RussetFace({ accent }: { accent: string }) {
  const tone = RUSSET;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M20 42 C18 10 82 8 82 44 C84 72 72 82 64 74 C62 50 38 50 36 74 C28 82 18 66 20 42 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <path d="M30 42 C38 26 64 26 70 42 C62 30 38 30 30 42 Z" fill={tone.hair} />
      {[
        [40, 56],
        [46, 59],
        [54, 56],
        [60, 59],
        [43, 62],
        [57, 62],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#c47a72" opacity="0.78" />
      ))}
      <Face tone={tone} shape="round" eyes="wide" nose="button" brows="soft" smile={1.05} fullness="soft" />
    </>
  );
}

function MesaFace({ accent }: { accent: string }) {
  const tone = MESA;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M24 32 C28 8 72 8 76 32 C80 50 72 56 68 50 C64 20 36 20 32 50 C28 56 20 46 24 32 Z" fill={tone.hair} />
      <path d="M70 50 C74 72 78 90 72 100 C68 84 64 66 62 50 Z" fill={tone.hair} />
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="square" />
      <Face tone={tone} shape="square" eyes="almond" nose="broad" brows="straight" smile={0.15} fullness="soft" />
    </>
  );
}

function NileFace({ accent }: { accent: string }) {
  const tone = NILE;
  return (
    <>
      <Shoulders color={accent} />
      {[32, 42, 50, 58, 68].map((x, i) => (
        <circle key={x} cx={x} cy={22 + (i % 2) * 5} r="7.8" fill={tone.hair} />
      ))}
      <path d="M29 38 C36 26 64 26 71 38 C64 30 36 30 29 38 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="long" />
      <Face tone={tone} shape="long" eyes="round" nose="straight" brows="arch" smile={0.5} fullness="full" />
      <circle cx="75.4" cy="58" r="2.25" fill={accent} />
    </>
  );
}

function IslandFace({ accent }: { accent: string }) {
  const tone = ISLAND;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M14 40 C16 6 84 4 88 42 C92 80 78 102 70 98 C78 70 80 44 70 34 C54 8 26 14 14 40 Z" fill={tone.hair} />
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="wide" />
      <Face tone={tone} shape="wide" eyes="round" nose="broad" brows="full" smile={0.95} wideMouth fullness="full" />
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
      <path d="M30 44 C32 16 70 14 72 42 C66 20 38 22 30 44 Z" fill={tone.hair} />
      <Head skin={tone.skin} shape="oval" />
      <path d="M32 38 C40 24 62 24 68 38 C58 26 40 28 32 38 Z" fill={tone.hair} />
      <Face tone={tone} shape="oval" eyes="lid" nose="straight" brows="straight" smile={0.3} fullness="thin" />
    </>
  );
}

function PampasFace({ accent }: { accent: string }) {
  const tone = PAMPAS;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M20 38 C18 8 82 6 84 40 C86 74 74 88 66 80 C68 52 36 52 34 80 C26 88 18 68 20 38 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <path d="M28 42 C38 26 64 26 72 42 C62 30 38 30 28 42 Z" fill={tone.hair} />
      <Face tone={tone} shape="round" eyes="wide" nose="soft" brows="full" smile={0.65} beard="stubble" fullness="soft" />
    </>
  );
}

function BunFace({ accent }: { accent: string }) {
  const tone = BUN;
  return (
    <>
      <Shoulders color={accent} />
      <circle cx="50" cy="14.5" r="14.2" fill={tone.hair} />
      <path d="M32 40 C36 22 64 22 68 40 C62 28 38 28 32 40 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="oval" />
      <Face tone={tone} shape="oval" eyes="lid" nose="button" brows="soft" smile={0.4} fullness="soft" />
      <circle cx="75.2" cy="58" r="1.85" fill={accent} />
    </>
  );
}

function BangsFace({ accent }: { accent: string }) {
  const tone = BANGS;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M18 38 C20 6 80 6 82 40 C86 80 74 102 68 98 C76 70 76 46 68 36 C54 10 28 14 18 38 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="oval" />
      <path d="M29 41 C38 31 62 31 71 41 C64 48 36 48 29 41 Z" fill={tone.hair} />
      <Face tone={tone} shape="oval" eyes="lid" nose="straight" brows="straight" smile={0.25} fullness="thin" />
    </>
  );
}

function TurbanFace({ accent }: { accent: string }) {
  const tone = TURBAN;
  const cloth = "#efe6d0";
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="oval" ears={false} />
      <path d="M16 50 C18 14 82 14 84 50 C80 68 20 68 16 50 Z" fill={cloth} />
      <path d="M22 48 C28 28 72 28 78 48 C72 36 28 36 22 48 Z" fill={cloth} />
      <path d="M20 52 C50 63 80 52" fill="none" stroke="#c4b496" strokeWidth="2.25" strokeLinecap="round" />
      <ellipse cx="50" cy="26" rx="17" ry="7.4" fill={cloth} />
      <path d="M33 22 C50 15 67 22" fill="none" stroke="#c4b496" strokeWidth="1.65" strokeLinecap="round" />
      <Face tone={tone} shape="oval" eyes="almond" nose="soft" brows="full" smile={0.15} beard="full" fullness="soft" />
    </>
  );
}

function KufiFace({ accent }: { accent: string }) {
  const tone = KUFI;
  const cap = "#1c3d36";
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="round" />
      <ellipse cx="50" cy="31" rx="23" ry="8.6" fill={cap} />
      <path d="M27 33 L27 45 C29 53 71 53 73 45 L73 33 Z" fill={cap} />
      <path d="M31 40 L69 40" stroke="#e8c56a" strokeWidth="1.15" />
      <path d="M50 31 L50 49" stroke="#e8c56a" strokeWidth="1.15" />
      <Face tone={tone} shape="round" eyes="round" nose="broad" brows="arch" smile={0.5} beard="stubble" fullness="full" />
    </>
  );
}

function PixieFace({ accent }: { accent: string }) {
  const tone = PIXIE;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M28 44 C26 16 74 14 74 42 C70 22 36 24 28 44 Z" fill={tone.hair} />
      {[30, 38, 46, 54, 62, 70].map((x, i) => (
        <path
          key={x}
          d={`M${x} ${28 - (i % 2) * 4} L${x + 1.5} ${17 - (i % 3)} L${x + 4} ${28 - (i % 2) * 3}`}
          fill={tone.hair}
        />
      ))}
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="heart" />
      <Face tone={tone} shape="heart" eyes="wide" nose="button" brows="arch" smile={0.85} fullness="thin" />
    </>
  );
}

function BaldFace({ accent }: { accent: string }) {
  const tone = BALD;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="round" />
      <ellipse cx="41" cy="33" rx="7.4" ry="3.4" fill="#fff" opacity="0.14" />
      <Face tone={tone} shape="round" eyes="round" nose="broad" brows="full" smile={0.35} fullness="full" />
      <Hoop accent={accent} />
    </>
  );
}

function CurlsFace({ accent }: { accent: string }) {
  const tone = CURLS;
  return (
    <>
      <Shoulders color={accent} />
      {[
        [28, 28],
        [40, 16],
        [50, 12],
        [60, 16],
        [72, 28],
        [20, 42],
        [80, 42],
        [24, 56],
        [76, 56],
        [34, 20],
        [66, 20],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="8.5" fill={tone.hair} />
      ))}
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <Face tone={tone} shape="round" eyes="round" nose="soft" brows="full" smile={0.9} beard="mustache" fullness="full" />
    </>
  );
}

function PlaitsFace({ accent }: { accent: string }) {
  const tone = PLAITS;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M24 32 C28 8 72 8 76 32 C80 48 72 54 68 48 C64 20 36 20 32 48 C28 54 20 44 24 32 Z" fill={tone.hair} />
      {[
        [28, 1],
        [72, -1],
      ].map(([x, dir]) => (
        <g key={x}>
          <path
            d={`M${x} 48 C${x + dir * 6} 66 ${x - dir * 4} 82 ${x + dir * 2} 100`}
            fill="none"
            stroke={tone.hair}
            strokeWidth="7.4"
            strokeLinecap="round"
          />
          {[58, 70, 82, 94].map((y) => (
            <circle key={y} cx={x + dir * (y % 20 === 10 ? 2 : -1)} cy={y} r="3.5" fill={tone.hair} />
          ))}
        </g>
      ))}
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="square" />
      <Face tone={tone} shape="square" eyes="almond" nose="broad" brows="straight" smile={0.2} fullness="full" />
    </>
  );
}

function BeanieFace({ accent }: { accent: string }) {
  const tone = BEANIE;
  const knit = "#3d4a58";
  return (
    <>
      <Shoulders color={accent} />
      <path d="M23 46 C23 14 77 14 77 46 L77 54 C71 61 29 61 23 54 Z" fill={knit} />
      <path d="M23 50 H77" stroke="#0f172a" strokeWidth="1.2" opacity="0.22" />
      <path d="M25 40 H75" stroke="#0f172a" strokeWidth="1.1" opacity="0.16" />
      <ellipse cx="50" cy="16" rx="7.2" ry="5.2" fill={knit} />
      <path d="M32 44 C38 34 62 34 68 44 C60 38 40 38 32 44 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="oval" />
      <Face tone={tone} shape="oval" eyes="hooded" nose="straight" brows="soft" smile={0.45} fullness="thin" />
    </>
  );
}

function FlaxFace({ accent }: { accent: string }) {
  const tone = FLAX;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M28 46 C28 16 72 14 74 44 C66 20 38 22 28 46 Z" fill={tone.hair} />
      <path d="M30 40 C40 24 58 22 68 36 C56 24 40 30 30 40 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="long" />
      <Face tone={tone} shape="long" eyes="wide" nose="straight" brows="soft" smile={0.3} fullness="thin" />
    </>
  );
}

function RidgeFace({ accent }: { accent: string }) {
  const tone = RIDGE;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M42 6 C46 0 54 0 58 6 L60 48 C56 18 44 18 40 48 Z" fill={tone.hair} />
      <path d="M29 46 C34 28 66 28 71 46 C62 32 38 32 29 46 Z" fill={tone.hair} />
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="wide" />
      <Face tone={tone} shape="wide" eyes="round" nose="broad" brows="full" smile={0.15} beard="goatee" fullness="full" />
      <Hoop accent={accent} side="both" />
    </>
  );
}

function PonyFace({ accent }: { accent: string }) {
  const tone = PONY;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M62 22 C80 6 94 26 90 58 C88 84 78 98 72 94 C80 70 82 38 70 28 Z" fill={tone.hair} />
      <ellipse cx="50" cy="24" rx="21" ry="13.5" fill={tone.hair} />
      <path d="M30 40 C38 24 64 22 70 38 C60 26 40 28 30 40 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="heart" />
      <Face tone={tone} shape="heart" eyes="almond" nose="soft" brows="arch" smile={0.75} fullness="soft" />
      <Hoop accent={accent} side="right" />
    </>
  );
}

function PearlFace({ accent }: { accent: string }) {
  const tone = PEARL;
  return (
    <>
      <Shoulders color={accent} />
      <circle cx="71" cy="62" r="11.5" fill={tone.hair} />
      <path d="M28 46 C30 18 72 16 74 44 C68 22 38 24 28 46 Z" fill={tone.hair} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="oval" />
      <path d="M34 64 C38 71 50 73 58 69" fill="none" stroke={tone.hair} strokeWidth="1.25" opacity="0.42" />
      <Face tone={tone} shape="oval" eyes="hooded" nose="soft" brows="soft" smile={0.35} fullness="soft" aged />
      <circle cx="24.8" cy="58" r="2.2" fill="#f4ece0" />
    </>
  );
}

function TiareFace({ accent }: { accent: string }) {
  const tone = TIARE;
  return (
    <>
      <Shoulders color={accent} />
      {[
        [30, 24],
        [42, 14],
        [54, 14],
        [66, 22],
        [22, 40],
        [78, 38],
        [26, 56],
        [76, 54],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="9.4" fill={tone.hair} />
      ))}
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} shape="round" />
      <Face tone={tone} shape="round" eyes="round" nose="broad" brows="arch" smile={1.1} wideMouth fullness="full" />
      <Flower x={77} y={51} petal="#f8f4ea" center={accent} />
    </>
  );
}

function CedarFace({ accent }: { accent: string }) {
  const tone = CEDAR;
  return (
    <>
      <Shoulders color={accent} />
      <path d="M30 44 C32 16 70 14 72 42 C66 20 38 22 30 44 Z" fill={tone.hair} />
      <Neck skin={tone.skin} wide />
      <Head skin={tone.skin} shape="square" />
      <Face tone={tone} shape="square" eyes="deep" nose="straight" brows="full" smile={0.1} beard="full" fullness="soft" />
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
    case "bun":
      return <BunFace accent={accent} />;
    case "bangs":
      return <BangsFace accent={accent} />;
    case "turban":
      return <TurbanFace accent={accent} />;
    case "kufi":
      return <KufiFace accent={accent} />;
    case "pixie":
      return <PixieFace accent={accent} />;
    case "bald":
      return <BaldFace accent={accent} />;
    case "curls":
      return <CurlsFace accent={accent} />;
    case "plaits":
      return <PlaitsFace accent={accent} />;
    case "beanie":
      return <BeanieFace accent={accent} />;
    case "flax":
      return <FlaxFace accent={accent} />;
    case "ridge":
      return <RidgeFace accent={accent} />;
    case "pony":
      return <PonyFace accent={accent} />;
    case "pearl":
      return <PearlFace accent={accent} />;
    case "tiare":
      return <TiareFace accent={accent} />;
    case "cedar":
      return <CedarFace accent={accent} />;
    default:
      return <DigitalCardStudioAvatarFace id={id} accent={accent} />;
  }
}
