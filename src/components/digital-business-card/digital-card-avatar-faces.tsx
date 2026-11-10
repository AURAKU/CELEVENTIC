import type { CeleCardHouseAvatarId } from "@/lib/digital-business-card/portraits";
import { DigitalCardStudioAvatarFace } from "@/components/digital-business-card/digital-card-avatar-studio";

type FaceTone = {
  skin: string;
  hair: string;
  brow: string;
  lip: string;
  eye: string;
};

const CROP: FaceTone = { skin: "#d4a574", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a5340", eye: "#1c1917" };
const SPECS: FaceTone = { skin: "#8d5524", hair: "#14110f", brow: "#2a1c14", lip: "#6b3a2a", eye: "#14110f" };
const WRAP: FaceTone = { skin: "#c9a882", hair: "#3f2a1d", brow: "#4a3224", lip: "#a45c4a", eye: "#2a1c14" };
const AFRO: FaceTone = { skin: "#e8c4a0", hair: "#1c1917", brow: "#3f2a1d", lip: "#b56a58", eye: "#1c1917" };
const LONGWAVE: FaceTone = { skin: "#f3d7c4", hair: "#3f2a1d", brow: "#5a3a28", lip: "#c47a72", eye: "#2a1c14" };
const BRAIDS: FaceTone = { skin: "#c68642", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a4e3c", eye: "#1c1917" };
const HOOD: FaceTone = { skin: "#e8b4a0", hair: "#2a1c14", brow: "#4a3224", lip: "#b56a58", eye: "#1c1917" };
const PUFF: FaceTone = { skin: "#5c3317", hair: "#14110f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const LOCS: FaceTone = { skin: "#d4a574", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a5340", eye: "#1c1917" };
const SILVER: FaceTone = { skin: "#c9a882", hair: "#c5c0b5", brow: "#7a6e62", lip: "#a45c4a", eye: "#2a1c14" };
const FADE: FaceTone = { skin: "#e8c4a0", hair: "#1c1917", brow: "#3f2a1d", lip: "#b56a58", eye: "#1c1917" };
const CROWN: FaceTone = { skin: "#8d5524", hair: "#14110f", brow: "#2a1c14", lip: "#6b3a2a", eye: "#14110f" };
const BOB: FaceTone = { skin: "#f3d7c4", hair: "#1c1917", brow: "#3f2a1d", lip: "#c47a72", eye: "#1c1917" };
const ROWS: FaceTone = { skin: "#5c3317", hair: "#14110f", brow: "#1c140f", lip: "#7a4032", eye: "#14110f" };
const TWISTS: FaceTone = { skin: "#c68642", hair: "#1c1917", brow: "#3f2a1d", lip: "#9a4e3c", eye: "#1c1917" };
const COLLAR: FaceTone = { skin: "#d4a574", hair: "#3f2a1d", brow: "#4a3224", lip: "#9a5340", eye: "#1c1917" };

function Shoulders({ color }: { color: string }) {
  return <path d="M8 100 C16 74 30 66 50 66 C70 66 84 74 92 100 Z" fill={color} />;
}

function Neck({ skin }: { skin: string }) {
  return <path d="M42 60 C43 72 45 78 50 78 C55 78 57 72 58 60 Z" fill={skin} />;
}

function Head({ skin }: { skin: string }) {
  return (
    <>
      <ellipse cx="27" cy="52" rx="5.2" ry="7.4" fill={skin} />
      <ellipse cx="73" cy="52" rx="5.2" ry="7.4" fill={skin} />
      <ellipse cx="50" cy="48" rx="23" ry="26.5" fill={skin} />
    </>
  );
}

function Features({ tone, smile = 1 }: { tone: FaceTone; smile?: number }) {
  const mouthY = 64 + smile * 0.4;
  return (
    <>
      <path d="M36 43 Q42 40.5 47.5 43" fill="none" stroke={tone.brow} strokeWidth="2" strokeLinecap="round" />
      <path d="M52.5 43 Q58 40.5 64 43" fill="none" stroke={tone.brow} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="42" cy="51" rx="3.4" ry="4" fill={tone.eye} />
      <ellipse cx="58" cy="51" rx="3.4" ry="4" fill={tone.eye} />
      <circle cx="43.2" cy="49.6" r="1.05" fill="#fff" />
      <circle cx="59.2" cy="49.6" r="1.05" fill="#fff" />
      <path
        d={`M44 ${mouthY} Q50 ${mouthY + 4.4} 56 ${mouthY}`}
        fill="none"
        stroke={tone.lip}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </>
  );
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

function Hoop({ accent }: { accent: string }) {
  return <circle cx="25.5" cy="58" r="3.4" fill="none" stroke={accent} strokeWidth="1.7" />;
}

function CropFace({ accent }: { accent: string }) {
  const tone = CROP;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <path d="M26 50 C26 22 74 22 74 50 C70 28 30 28 26 50 Z" fill={tone.hair} />
      <Head skin={tone.skin} />
      <path d="M28 44 C32 26 50 22 58 28 C46 24 30 34 28 44 Z" fill={tone.hair} />
      <Features tone={tone} />
      <Hoop accent={accent} />
    </>
  );
}

function SpecsFace({ accent }: { accent: string }) {
  const tone = SPECS;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} />
      <path d="M34 30 C42 24 58 24 66 30 C62 26 38 26 34 30 Z" fill={tone.hair} />
      <path d="M34 66 C38 78 62 78 66 66 C62 72 38 72 34 66 Z" fill={tone.hair} />
      <Features tone={tone} smile={0.2} />
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
      <ellipse cx="50" cy="56" rx="21" ry="22" fill={tone.skin} />
      <Features tone={tone} />
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
      <Head skin={tone.skin} />
      <Features tone={tone} smile={1.2} />
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
      <Head skin={tone.skin} />
      <path d="M24 46 C28 58 26 78 22 92 C30 74 34 54 32 44 Z" fill={tone.hair} />
      <Features tone={tone} />
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
      <Head skin={tone.skin} />
      <Features tone={tone} />
      <circle cx="26" cy="58" r="2.1" fill={accent} />
      <circle cx="74" cy="58" r="2.1" fill={accent} />
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
      <ellipse cx="50" cy="50" rx="21" ry="24" fill={tone.skin} />
      <path d="M32 40 C38 28 62 28 68 40 C60 32 40 32 32 40 Z" fill={tone.hair} />
      <Features tone={tone} />
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
      <Head skin={tone.skin} />
      <Features tone={tone} smile={1.1} />
      <circle cx="74" cy="58" r="2.4" fill="#f4e6c8" />
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
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} />
      <Features tone={tone} />
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
      <Head skin={tone.skin} />
      <Features tone={tone} smile={0.4} />
      <Glasses color="#57534e" />
    </>
  );
}

function FadeFace({ accent }: { accent: string }) {
  const tone = FADE;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <path d="M30 46 C30 18 70 16 72 44 C64 22 36 24 30 46 Z" fill={tone.hair} />
      <Head skin={tone.skin} />
      <path d="M28 40 C34 30 50 24 62 30 C50 26 34 34 28 40 Z" fill={tone.hair} />
      <Features tone={tone} />
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
      <Head skin={tone.skin} />
      <Features tone={tone} />
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
      <Head skin={tone.skin} />
      <path d="M30 42 C36 30 64 30 70 42 C62 34 38 34 30 42 Z" fill={tone.hair} />
      <Features tone={tone} />
    </>
  );
}

function RowsFace({ accent }: { accent: string }) {
  const tone = ROWS;
  return (
    <>
      <Shoulders color={accent} />
      <Neck skin={tone.skin} />
      <Head skin={tone.skin} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${32 + i * 9} 24 C${34 + i * 9} 36 ${32 + i * 9} 48 ${34 + i * 9} 58`}
          fill="none"
          stroke={tone.hair}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      ))}
      <Features tone={tone} smile={0.3} />
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
      <Head skin={tone.skin} />
      <path d="M28 40 C50 28 72 40 72 40" fill="none" stroke={accent} strokeWidth="3.4" strokeLinecap="round" />
      <Features tone={tone} />
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
      <Head skin={tone.skin} />
      <Features tone={tone} smile={0.8} />
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
    default:
      return <DigitalCardStudioAvatarFace id={id} accent={accent} />;
  }
}
