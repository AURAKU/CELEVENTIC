"use client";

import type { DigitalCardAtmosphere, DigitalCardTheme } from "@/lib/digital-business-card/themes";

function Scene({
  uid,
  children,
}: {
  uid: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 400 250"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="18%" r="42%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {children}
    </svg>
  );
}

function Windows({ x, y, cols, rows, color }: { x: number; y: number; cols: number; rows: number; color: string }) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 3 === 0) continue;
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={x + c * 5}
          y={y + r * 6}
          width="2.4"
          height="3.2"
          fill={color}
          opacity={0.55 + ((r + c) % 2) * 0.25}
        />
      );
    }
  }
  return <g>{cells}</g>;
}

/** Guest-stage lighting. One rig for every template: key, bloom, horizon, grain. */
export function CeleCardStageField() {
  return (
    <div className="celecard-stage-field" aria-hidden>
      <span className="celecard-stage-key" />
      <span className="celecard-stage-bloom" />
      <span className="celecard-stage-horizon" />
      <span className="celecard-stage-vignette" />
      <span className="celecard-stage-grain" />
      <span className="celecard-stage-meridian" />
    </div>
  );
}

export function DigitalCardAtmosphere({
  atmosphere,
  theme,
  compact,
}: {
  atmosphere: DigitalCardAtmosphere;
  theme: DigitalCardTheme;
  compact?: boolean;
}) {
  if (!atmosphere || atmosphere === "none") return null;
  const uid = `dca-${theme.id}${compact ? "c" : ""}`;
  const a = theme.accent;
  const m = theme.muted;
  const t = theme.text;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {atmosphere === "film-credits" ? (
        <Scene uid={uid}>
          <rect width="400" height="28" fill="#050505" />
          <rect y="222" width="400" height="28" fill="#050505" />
          {Array.from({ length: 11 }).map((_, i) => (
            <rect key={i} x={8} y={6 + i * 22} width="10" height="8" rx="1" fill="#1c1917" stroke={a} strokeWidth="0.6" />
          ))}
          <ellipse cx="200" cy="40" rx="120" ry="36" fill={a} opacity="0.18" />
          <rect x="118" y="96" width="164" height="1.2" fill={a} />
          <rect x="138" y="104" width="124" height="0.6" fill={a} opacity="0.55" />
          <rect x="0" y="28" width="400" height="194" fill={`url(#${uid}-scan)`} opacity="0.12" />
          <defs>
            <linearGradient id={`${uid}-scan`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </Scene>
      ) : null}

      {atmosphere === "silver-screen" ? (
        <Scene uid={uid}>
          <rect width="400" height="250" fill="#111" />
          <rect x="28" y="36" width="108" height="72" fill="#d4d4d4" opacity="0.22" />
          <rect x="146" y="48" width="108" height="72" fill="#e5e5e5" opacity="0.16" />
          <rect x="264" y="40" width="108" height="72" fill="#d4d4d4" opacity="0.2" />
          <rect x="28" y="36" width="344" height="72" fill="none" stroke="#fafafa" strokeWidth="1.2" opacity="0.35" />
          {Array.from({ length: 18 }).map((_, i) => (
            <rect key={i} x={18 + i * 21} y="18" width="8" height="6" fill="#fafafa" opacity="0.55" />
          ))}
          <line x1="90" y1="0" x2="70" y2="250" stroke="#fff" strokeWidth="0.4" opacity="0.2" />
          <line x1="312" y1="0" x2="330" y2="250" stroke="#fff" strokeWidth="0.35" opacity="0.15" />
        </Scene>
      ) : null}

      {atmosphere === "desert-road" ? (
        <Scene uid={uid}>
          <rect width="400" height="250" fill="#9a3412" />
          <rect width="400" height="118" fill={a} opacity="0.25" />
          <circle cx="292" cy="58" r="28" fill="#fff7ed" opacity="0.85" />
          <path d="M0 128 C80 110 140 148 220 132 C300 116 350 150 400 128 L400 250 L0 250 Z" fill="#7c2d12" />
          <path d="M0 168 C120 150 180 190 280 170 C340 158 380 184 400 176 L400 250 L0 250 Z" fill="#c2410c" opacity="0.85" />
          <polygon points="200,132 214,132 360,250 40,250" fill="#1c1917" opacity="0.45" />
          <polyline points="207,138 200,250" fill="none" stroke="#fde68a" strokeWidth="2" strokeDasharray="8 10" opacity="0.8" />
        </Scene>
      ) : null}

      {atmosphere === "rain-city" ? (
        <Scene uid={uid}>
          <rect width="400" height="250" fill="#020617" />
          <rect x="24" y="78" width="42" height="172" fill="#0f172a" />
          <rect x="76" y="46" width="58" height="204" fill="#111827" />
          <rect x="146" y="96" width="36" height="154" fill="#1e293b" />
          <rect x="192" y="28" width="72" height="222" fill="#0b1220" />
          <rect x="276" y="70" width="48" height="180" fill="#1e293b" />
          <rect x="336" y="108" width="40" height="142" fill="#0f172a" />
          <Windows x={32} y={90} cols={6} rows={14} color={a} />
          <Windows x={86} y={58} cols={8} rows={18} color={a} />
          <Windows x={204} y={40} cols={10} rows={20} color={a} />
          <Windows x={284} y={82} cols={6} rows={14} color="#c026d3" />
          {Array.from({ length: 22 }).map((_, i) => (
            <line
              key={i}
              x1={18 + i * 18}
              y1="0"
              x2={6 + i * 18}
              y2="250"
              stroke={a}
              strokeWidth="0.7"
              opacity="0.22"
            />
          ))}
          <rect y="210" width="400" height="40" fill={a} opacity="0.08" />
        </Scene>
      ) : null}

      {atmosphere === "skyline" ? (
        <Scene uid={uid}>
          <circle cx="318" cy="42" r="18" fill={a} opacity="0.55" />
          <rect x="18" y="128" width="28" height="122" fill={t} opacity="0.45" />
          <rect x="52" y="88" width="40" height="162" fill={t} opacity="0.38" />
          <rect x="100" y="148" width="22" height="102" fill={t} opacity="0.5" />
          <rect x="130" y="64" width="54" height="186" fill={t} opacity="0.32" />
          <polygon points="157,36 171,64 143,64" fill={t} opacity="0.4" />
          <rect x="196" y="108" width="34" height="142" fill={t} opacity="0.42" />
          <rect x="238" y="78" width="48" height="172" fill={t} opacity="0.3" />
          <rect x="294" y="118" width="30" height="132" fill={t} opacity="0.44" />
          <rect x="332" y="96" width="44" height="154" fill={t} opacity="0.28" />
          <Windows x={138} y={78} cols={8} rows={16} color={a} />
          <Windows x={246} y={90} cols={7} rows={14} color={a} />
        </Scene>
      ) : null}

      {atmosphere === "arch-monument" ? (
        <Scene uid={uid}>
          <circle cx="200" cy="78" r="46" fill={a} opacity="0.55" />
          <path d="M0 210 C80 190 140 220 200 200 C270 178 330 214 400 198 L400 250 L0 250 Z" fill="#1c1917" opacity="0.55" />
          <rect x="92" y="118" width="36" height="110" fill={a} />
          <rect x="272" y="118" width="36" height="110" fill={a} />
          <path d="M92 124 C92 64 308 64 308 124" fill="none" stroke={a} strokeWidth="18" />
          <rect x="70" y="224" width="260" height="10" fill={a} opacity="0.7" />
        </Scene>
      ) : null}

      {atmosphere === "dunes" ? (
        <Scene uid={uid}>
          <circle cx="286" cy="48" r="26" fill="#fff7ed" opacity="0.9" />
          <path d="M-20 170 C70 120 140 200 230 150 C310 110 370 180 430 140 L430 260 L-20 260 Z" fill={a} opacity="0.28" />
          <path d="M-20 198 C90 160 150 220 250 180 C330 150 380 210 430 186 L430 260 L-20 260 Z" fill={theme.accentSoft} />
          <path d="M-20 222 C80 196 170 236 260 214 C330 198 380 232 430 218 L430 260 L-20 260 Z" fill={a} opacity="0.45" />
        </Scene>
      ) : null}

      {atmosphere === "mist-peak" ? (
        <Scene uid={uid}>
          <path d="M40 230 L150 70 L250 230 Z" fill={t} opacity="0.28" />
          <path d="M140 230 L230 96 L340 230 Z" fill={a} opacity="0.45" />
          <path d="M210 230 L310 128 L400 230 Z" fill={t} opacity="0.22" />
          <ellipse cx="200" cy="188" rx="180" ry="28" fill="#fff" opacity="0.28" />
          <ellipse cx="160" cy="160" rx="120" ry="16" fill="#fff" opacity="0.18" />
        </Scene>
      ) : null}

      {atmosphere === "cliff-white" ? (
        <Scene uid={uid}>
          <rect width="400" height="118" fill="#7dd3fc" />
          <rect y="108" width="400" height="142" fill="#38bdf8" opacity="0.45" />
          <path d="M0 250 L0 110 L70 118 L92 86 L148 96 L170 58 L230 78 L250 48 L318 70 L400 60 L400 250 Z" fill="#f8fafc" />
          <rect x="96" y="102" width="22" height="14" rx="6" fill="#38bdf8" opacity="0.7" />
          <rect x="176" y="78" width="18" height="12" rx="6" fill="#38bdf8" opacity="0.6" />
          <circle cx="258" cy="62" r="14" fill="#f8fafc" stroke="#e2e8f0" />
          <rect x="40" y="150" width="10" height="8" fill="#0369a1" opacity="0.35" />
          <rect x="58" y="164" width="10" height="8" fill="#0369a1" opacity="0.28" />
        </Scene>
      ) : null}

      {atmosphere === "river-gold" ? (
        <Scene uid={uid}>
          <circle cx="300" cy="46" r="30" fill={a} opacity="0.8" />
          <polygon points="70,210 110,86 150,210" fill={m} opacity="0.45" />
          <polygon points="250,218 278,120 308,218" fill={m} opacity="0.32" />
          <path d="M0 168 C70 150 90 196 160 176 C230 156 250 200 330 178 C370 168 400 188 400 188 L400 250 L0 250 Z" fill={a} opacity="0.7" />
          <path d="M0 198 C80 184 120 214 190 196 C260 178 300 214 400 200 L400 250 L0 250 Z" fill={a} opacity="0.4" />
        </Scene>
      ) : null}

      {atmosphere === "flat-mountain" ? (
        <Scene uid={uid}>
          <rect y="150" width="400" height="100" fill="#042f2e" opacity="0.5" />
          <path d="M36 168 L70 112 L330 108 L368 168 Z" fill={t} opacity="0.55" />
          <path d="M70 112 L90 92 L310 90 L330 108 Z" fill={a} opacity="0.7" />
          <ellipse cx="200" cy="176" rx="150" ry="18" fill="#fff" opacity="0.25" />
        </Scene>
      ) : null}

      {atmosphere === "canal" ? (
        <Scene uid={uid}>
          <rect x="18" y="28" width="110" height="150" fill={a} opacity="0.45" />
          <rect x="272" y="40" width="110" height="138" fill={m} opacity="0.4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <g key={i}>
              <path d={`M${34 + (i % 2) * 48} ${58 + Math.floor(i / 2) * 42} a14 18 0 0 1 28 0 v18 h-28 z`} fill="#1c1917" opacity="0.35" />
              <path d={`M${288 + (i % 2) * 44} ${64 + Math.floor(i / 2) * 40} a12 16 0 0 1 24 0 v16 h-24 z`} fill="#1c1917" opacity="0.3" />
            </g>
          ))}
          <path d="M128 150 C160 110 240 110 272 150" fill="none" stroke={a} strokeWidth="10" />
          <path d="M0 176 C80 160 140 200 200 176 C270 150 330 198 400 174 L400 250 L0 250 Z" fill={a} opacity="0.35" />
          <ellipse cx="200" cy="196" rx="70" ry="10" fill="#fff" opacity="0.12" />
        </Scene>
      ) : null}

      {atmosphere === "dawn-peak" ? (
        <Scene uid={uid}>
          <circle cx="200" cy="64" r="34" fill={a} opacity="0.9" />
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1="200"
              y1="64"
              x2={200 + Math.cos((i / 8) * Math.PI * 2) * 90}
              y2={64 + Math.sin((i / 8) * Math.PI * 2) * 40}
              stroke={a}
              strokeWidth="1.4"
              opacity="0.35"
            />
          ))}
          <path d="M40 230 L200 58 L360 230 Z" fill={t} opacity="0.5" />
          <path d="M168 110 L200 58 L232 110 Z" fill="#fff" opacity="0.55" />
        </Scene>
      ) : null}

      {atmosphere === "canopy" ? (
        <Scene uid={uid}>
          <ellipse cx="80" cy="30" rx="90" ry="60" fill={a} opacity="0.4" />
          <ellipse cx="210" cy="16" rx="110" ry="70" fill={m} opacity="0.4" />
          <ellipse cx="340" cy="36" rx="90" ry="58" fill={a} opacity="0.35" />
          <ellipse cx="140" cy="70" rx="70" ry="40" fill={a} opacity="0.3" />
          <rect x="118" y="90" width="6" height="160" fill={t} opacity="0.35" />
          <rect x="248" y="78" width="5" height="172" fill={t} opacity="0.28" />
          <rect x="332" y="96" width="4" height="154" fill={t} opacity="0.22" />
        </Scene>
      ) : null}

      {atmosphere === "lantern-street" ? (
        <Scene uid={uid}>
          <rect x="0" y="40" width="400" height="140" fill={t} opacity="0.08" />
          {[70, 150, 250, 330].map((x) => (
            <g key={x}>
              <line x1={x} y1="18" x2={x} y2="96" stroke={a} strokeWidth="1.4" />
              <path d={`M${x - 12} 96 Q${x} 128 ${x + 12} 96 Z`} fill={a} />
              <circle cx={x} cy="110" r="16" fill={a} opacity="0.22" />
            </g>
          ))}
          <rect y="178" width="400" height="72" fill="#000" opacity="0.28" />
          {Array.from({ length: 16 }).map((_, i) => (
            <rect key={i} x={12 + i * 24} y="186" width="14" height="4" rx="1" fill={a} opacity="0.25" />
          ))}
        </Scene>
      ) : null}

      {atmosphere === "spire" ? (
        <Scene uid={uid}>
          {Array.from({ length: 18 }).map((_, i) => (
            <circle key={i} cx={30 + (i * 47) % 380} cy={18 + (i * 13) % 80} r={i % 4 === 0 ? 1.6 : 0.8} fill="#fff" opacity="0.7" />
          ))}
          <polygon points="200,18 228,210 172,210" fill={a} opacity="0.75" />
          <polygon points="188,90 212,90 220,150 180,150" fill={m} opacity="0.4" />
          <rect x="164" y="208" width="72" height="18" fill={a} opacity="0.5" />
        </Scene>
      ) : null}

      {atmosphere === "alpine" ? (
        <Scene uid={uid}>
          <rect width="400" height="110" fill="#bfdbfe" opacity="0.45" />
          <path d="M0 230 L90 90 L170 230 Z" fill={m} />
          <path d="M110 230 L210 48 L320 230 Z" fill={t} opacity="0.5" />
          <path d="M250 230 L340 110 L400 230 Z" fill={m} opacity="0.8" />
          <path d="M186 92 L210 48 L234 92 Z" fill="#fff" opacity="0.7" />
        </Scene>
      ) : null}

      {atmosphere === "leather" ? (
        <Scene uid={uid}>
          <rect width="400" height="250" fill={theme.accentSoft} />
          {Array.from({ length: 40 }).map((_, i) => (
            <circle
              key={i}
              cx={(i * 37) % 400}
              cy={(i * 53) % 250}
              r="1.2"
              fill="#000"
              opacity="0.12"
            />
          ))}
          <rect x="36" y="36" width="328" height="178" fill="none" stroke={a} strokeWidth="1.2" strokeDasharray="3 5" />
          <circle cx="200" cy="125" r="22" fill="none" stroke={a} strokeWidth="3" />
          <rect x="188" y="118" width="24" height="14" rx="2" fill={a} opacity="0.7" />
        </Scene>
      ) : null}

      {atmosphere === "porcelain" ? (
        <Scene uid={uid}>
          <circle cx="310" cy="40" r="70" fill="none" stroke={a} strokeWidth="1" opacity="0.35" />
          <circle cx="70" cy="210" r="90" fill="none" stroke={theme.border} strokeWidth="1" opacity="0.3" />
          <path
            d="M200 78 C188 92 176 104 176 118 C176 136 188 148 200 148 C212 148 224 136 224 118 C224 104 212 92 200 78 Z"
            fill="none"
            stroke={a}
            strokeWidth="1.6"
          />
          <circle cx="200" cy="126" r="4" fill={a} />
        </Scene>
      ) : null}

      {atmosphere === "marble-ink" ? (
        <Scene uid={uid}>
          <path d="M0 40 C80 80 120 10 200 50 C280 90 320 20 400 60" fill="none" stroke={theme.border} strokeWidth="1.4" opacity="0.55" />
          <path d="M0 120 C60 90 140 160 220 110 C300 60 340 150 400 120" fill="none" stroke={m} strokeWidth="1" opacity="0.4" />
          <path d="M0 200 C100 170 180 230 280 190 C340 166 380 210 400 200" fill="none" stroke={theme.border} strokeWidth="0.8" opacity="0.35" />
          <rect x="48" y="28" width="1.5" height="194" fill={a} opacity="0.55" />
        </Scene>
      ) : null}

      {atmosphere === "chrome" ? (
        <Scene uid={uid}>
          <rect x="0" y="40" width="400" height="28" fill="#fff" opacity="0.35" />
          <rect x="0" y="110" width="400" height="12" fill="#fff" opacity="0.18" />
          <rect x="0" y="168" width="400" height="40" fill="#000" opacity="0.08" />
          <circle cx="78" cy="78" r="22" fill="none" stroke={a} strokeWidth="3" />
          <rect x="260" y="70" width="90" height="90" rx="18" fill="none" stroke={a} strokeWidth="2" />
        </Scene>
      ) : null}

      {atmosphere === "garden" ? (
        <Scene uid={uid}>
          <ellipse cx="78" cy="118" rx="52" ry="78" fill={a} opacity="0.38" />
          <ellipse cx="132" cy="96" rx="38" ry="60" fill={m} opacity="0.42" />
          <ellipse cx="292" cy="108" rx="50" ry="72" fill={a} opacity="0.32" />
          <ellipse cx="344" cy="88" rx="32" ry="54" fill={m} opacity="0.38" />
          <path d="M200 230 C188 150 236 110 214 48" fill="none" stroke={a} strokeWidth="2.2" />
          <circle cx="210" cy="42" r="12" fill={a} opacity="0.55" />
          <circle cx="198" cy="50" r="8" fill={m} opacity="0.5" />
        </Scene>
      ) : null}

      {atmosphere === "salon" ? (
        <Scene uid={uid}>
          <rect x="22" y="18" width="356" height="214" fill="none" stroke={theme.border} strokeWidth="1.4" />
          <rect x="30" y="26" width="340" height="198" fill="none" stroke={a} strokeWidth="0.6" opacity="0.55" />
          <path d="M40 40 h24 v24" fill="none" stroke={a} strokeWidth="1.2" />
          <path d="M360 40 h-24 v24" fill="none" stroke={a} strokeWidth="1.2" />
          <path d="M40 210 h24 v-24" fill="none" stroke={a} strokeWidth="1.2" />
          <path d="M360 210 h-24 v-24" fill="none" stroke={a} strokeWidth="1.2" />
          <rect x="168" y="36" width="64" height="1.2" fill={a} />
        </Scene>
      ) : null}

      {atmosphere === "wave-pulse" ? (
        <Scene uid={uid}>
          <path d="M0 140 C60 110 100 170 160 140 C220 110 260 170 320 140 C360 122 400 150 400 150 L400 250 L0 250 Z" fill={a} opacity="0.28" />
          <path d="M0 176 C70 150 110 200 180 172 C250 144 290 198 360 170 L400 186 L400 250 L0 250 Z" fill={a} opacity="0.18" />
          <circle cx="70" cy="70" r="36" fill={a} opacity="0.2" />
        </Scene>
      ) : null}

      {atmosphere === "coral-fan" ? (
        <Scene uid={uid}>
          {[-30, 10, 50, 90].map((rot, i) => (
            <ellipse
              key={i}
              cx="200"
              cy="150"
              rx="18"
              ry="70"
              fill={a}
              opacity={0.22 + i * 0.08}
              transform={`rotate(${rot} 200 180)`}
            />
          ))}
          <circle cx="200" cy="186" r="10" fill={a} opacity="0.5" />
        </Scene>
      ) : null}

      {atmosphere === "masthead" ? (
        <Scene uid={uid}>
          <rect x="36" y="36" width="220" height="10" fill={t} />
          <rect x="36" y="56" width="140" height="4" fill={m} />
          <rect x="36" y="80" width="1.5" height="140" fill={t} />
          <rect x="48" y="80" width="90" height="4" fill={t} opacity="0.7" />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x="48" y={96 + i * 14} width={70 + (i % 3) * 12} height="3" fill={m} opacity="0.5" />
          ))}
          <rect x="220" y="80" width="140" height="90" fill={theme.accentSoft} />
        </Scene>
      ) : null}

      {atmosphere === "motion-bars" ? (
        <Scene uid={uid}>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={30 + i * 70} y={40 + (i % 2) * 20} width="48" height={140 - i * 8} rx="8" fill={a} opacity={0.2 + i * 0.1} />
          ))}
        </Scene>
      ) : null}

      {atmosphere === "spotlight" ? (
        <Scene uid={uid}>
          <polygon points="200,0 70,250 330,250" fill={a} opacity="0.22" />
          <circle cx="200" cy="18" r="14" fill={a} />
          <ellipse cx="200" cy="230" rx="110" ry="16" fill={a} opacity="0.25" />
        </Scene>
      ) : null}

      {atmosphere === "aurora-band" ? (
        <Scene uid={uid}>
          <path d="M0 90 C80 40 140 130 220 70 C300 20 350 110 400 60 L400 160 C320 180 240 110 160 160 C80 200 40 140 0 170 Z" fill={a} opacity="0.35" />
          <path d="M0 130 C90 80 160 170 250 110 C320 70 360 150 400 120 L400 190 C300 210 200 140 110 200 C50 220 20 170 0 180 Z" fill={m} opacity="0.28" />
        </Scene>
      ) : null}

      {atmosphere === "canvas-frame" ? (
        <Scene uid={uid}>
          <rect x="40" y="28" width="320" height="194" fill="none" stroke={theme.border} strokeWidth="10" />
          <rect x="58" y="46" width="284" height="158" fill={theme.accentSoft} />
          <path d="M90 170 C140 90 200 150 250 80 C290 40 330 110 340 90" fill="none" stroke={a} strokeWidth="3" />
        </Scene>
      ) : null}

      {atmosphere === "pop-burst" ? (
        <Scene uid={uid}>
          {Array.from({ length: 28 }).map((_, i) => (
            <circle
              key={i}
              cx={30 + (i * 53) % 370}
              cy={20 + (i * 37) % 220}
              r={4 + (i % 4) * 3}
              fill={i % 2 ? a : m}
              opacity="0.55"
            />
          ))}
          <polygon points="200,40 214,96 272,96 224,130 242,186 200,154 158,186 176,130 128,96 186,96" fill={a} />
        </Scene>
      ) : null}

      {atmosphere === "comic-panel" ? (
        <Scene uid={uid}>
          <rect x="16" y="16" width="180" height="110" fill="none" stroke={t} strokeWidth="3" />
          <rect x="206" y="16" width="176" height="110" fill="none" stroke={t} strokeWidth="3" />
          <rect x="16" y="136" width="366" height="96" fill="none" stroke={t} strokeWidth="3" />
          <polygon points="300,70 390,20 390,90" fill={a} />
          {Array.from({ length: 20 }).map((_, i) => (
            <circle key={i} cx={40 + (i % 10) * 14} cy={160 + Math.floor(i / 10) * 16} r="2.2" fill={t} />
          ))}
        </Scene>
      ) : null}

      {atmosphere === "deco-fan" ? (
        <Scene uid={uid}>
          {Array.from({ length: 14 }).map((_, i) => (
            <line
              key={i}
              x1="200"
              y1="210"
              x2={40 + i * 24}
              y2="20"
              stroke={a}
              strokeWidth="1.2"
              opacity="0.55"
            />
          ))}
          <rect x="70" y="200" width="260" height="8" fill={a} />
          <rect x="90" y="214" width="220" height="4" fill={a} opacity="0.5" />
        </Scene>
      ) : null}

      {atmosphere === "ukiyo-print" ? (
        <Scene uid={uid}>
          <path d="M-10 170 C40 120 80 210 140 150 C200 90 240 200 310 140 C360 100 400 170 420 150 L420 260 L-10 260 Z" fill={a} opacity="0.35" />
          <path d="M-10 200 C50 160 90 230 160 186 C230 140 270 230 340 180 C380 150 420 200 430 190 L430 260 L-10 260 Z" fill={m} opacity="0.4" />
          <circle cx="320" cy="48" r="22" fill={a} opacity="0.7" />
          <path d="M60 80 C90 40 70 20 110 18" fill="none" stroke={a} strokeWidth="2" />
        </Scene>
      ) : null}

      {atmosphere === "cel-speed" ? (
        <Scene uid={uid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={i} x1={20} y1={40 + i * 14} x2={380 - i * 8} y2={30 + i * 14} stroke={t} strokeWidth="1.2" opacity={0.15 + (i % 3) * 0.08} />
          ))}
          <circle cx="250" cy="120" r="36" fill={a} opacity="0.35" />
          <rect x="24" y="24" width="352" height="202" fill="none" stroke={t} strokeWidth="4" />
        </Scene>
      ) : null}

      {atmosphere === "street-asphalt" ? (
        <Scene uid={uid}>
          <rect y="150" width="400" height="100" fill="#111" opacity="0.45" />
          <rect x="40" y="196" width="320" height="8" fill={a} opacity="0.8" />
          <polygon points="200,36 212,70 248,70 218,92 230,128 200,108 170,128 182,92 152,70 188,70" fill={a} />
        </Scene>
      ) : null}

      {atmosphere === "renaissance-arch" ? (
        <Scene uid={uid}>
          <path d="M80 230 V110 A120 120 0 0 1 320 110 V230" fill="none" stroke={a} strokeWidth="8" />
          <rect x="70" y="228" width="260" height="10" fill={a} />
          <circle cx="200" cy="96" r="10" fill={a} />
          <rect x="188" y="150" width="24" height="80" fill={a} opacity="0.4" />
        </Scene>
      ) : null}

      {atmosphere === "ballroom" ? (
        <Scene uid={uid}>
          <ellipse cx="200" cy="36" rx="70" ry="12" fill={a} opacity="0.5" />
          {[-40, -20, 0, 20, 40].map((dx) => (
            <g key={dx}>
              <line x1={200 + dx} y1="36" x2={200 + dx * 1.6} y2="90" stroke={a} strokeWidth="1" />
              <circle cx={200 + dx * 1.6} cy="94" r="5" fill={a} />
            </g>
          ))}
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 10 }).map((_, c) => (
              <rect
                key={`${r}-${c}`}
                x={20 + c * 36}
                y={150 + r * 16}
                width="36"
                height="16"
                fill={a}
                opacity={(r + c) % 2 ? 0.12 : 0.22}
              />
            ))
          )}
        </Scene>
      ) : null}

      {atmosphere === "mesa" ? (
        <Scene uid={uid}>
          <circle cx="70" cy="58" r="24" fill={a} opacity="0.8" />
          <path d="M40 170 L70 110 L130 110 L160 170 Z" fill={t} opacity="0.45" />
          <path d="M180 180 L210 96 L290 96 L330 180 Z" fill={t} opacity="0.35" />
          <path d="M300 190 L330 140 L380 140 L400 190 Z" fill={m} opacity="0.4" />
          <rect y="188" width="400" height="62" fill="#1c1917" opacity="0.35" />
        </Scene>
      ) : null}

      {atmosphere === "starfield" ? (
        <Scene uid={uid}>
          {Array.from({ length: 40 }).map((_, i) => (
            <circle
              key={i}
              cx={(i * 73) % 390 + 6}
              cy={(i * 47) % 240 + 6}
              r={i % 7 === 0 ? 1.8 : 0.7}
              fill="#fff"
              opacity={0.4 + (i % 5) * 0.12}
            />
          ))}
          <circle cx="300" cy="70" r="26" fill={a} opacity="0.55" />
          <circle cx="300" cy="70" r="18" fill={m} opacity="0.4" />
          <ellipse cx="120" cy="160" rx="80" ry="18" fill={a} opacity="0.2" transform="rotate(-18 120 160)" />
        </Scene>
      ) : null}

      {atmosphere === "spy-glass" ? (
        <Scene uid={uid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} y={10 + i * 26} width="400" height="10" fill="#000" opacity="0.28" />
          ))}
          <rect x="220" y="40" width="140" height="170" fill={a} opacity="0.12" />
          <Windows x={230} y={50} cols={10} rows={16} color={a} />
        </Scene>
      ) : null}

      {atmosphere === "fog-bridge" ? (
        <Scene uid={uid}>
          <path d="M0 150 C80 80 160 80 200 150 C240 80 320 80 400 150" fill="none" stroke={a} strokeWidth="6" />
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={i} x1={20 + i * 45} y1="150" x2={20 + i * 45} y2={90 + Math.abs(4 - i) * 8} stroke={a} strokeWidth="1.4" />
          ))}
          <rect x="0" y="148" width="400" height="6" fill={a} />
          <ellipse cx="200" cy="190" rx="180" ry="24" fill="#fff" opacity="0.22" />
        </Scene>
      ) : null}

      {atmosphere === "harbor" ? (
        <Scene uid={uid}>
          <polygon points="200,20 214,148 186,148" fill={a} />
          <rect x="176" y="148" width="48" height="14" fill={a} />
          <polygon points="200,28 320,200 200,200" fill={a} opacity="0.16" />
          <path d="M0 200 C80 184 160 214 240 196 C320 178 360 210 400 198 L400 250 L0 250 Z" fill={t} opacity="0.35" />
        </Scene>
      ) : null}

      {atmosphere === "granite-peak" ? (
        <Scene uid={uid}>
          <rect y="170" width="400" height="80" fill={a} opacity="0.25" />
          <path d="M110 210 L200 36 L290 210 Z" fill={t} opacity="0.5" />
          <path d="M200 36 L230 90 L200 100 L176 86 Z" fill="#fff" opacity="0.35" />
          <ellipse cx="200" cy="214" rx="90" ry="10" fill="#fff" opacity="0.15" />
        </Scene>
      ) : null}

      {atmosphere === "blossom" ? (
        <Scene uid={uid}>
          <path d="M40 250 C60 140 40 80 90 40" fill="none" stroke={t} strokeWidth="3" />
          <path d="M70 120 C120 90 150 140 190 100" fill="none" stroke={t} strokeWidth="2" />
          {[
            [90, 40],
            [120, 70],
            [160, 96],
            [70, 90],
            [200, 60],
            [240, 110],
            [300, 48],
            [330, 90],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="8" fill={a} opacity="0.55" />
              <circle cx={x + 8} cy={y + 2} r="7" fill={a} opacity="0.4" />
              <circle cx={x - 6} cy={y + 4} r="6" fill={m} opacity="0.4" />
            </g>
          ))}
        </Scene>
      ) : null}

      {atmosphere === "civic-dome" ? (
        <Scene uid={uid}>
          <path d="M80 150 A120 90 0 0 1 320 150" fill={a} opacity="0.55" />
          <rect x="90" y="148" width="220" height="70" fill={a} opacity="0.3" />
          {Array.from({ length: 7 }).map((_, i) => (
            <rect key={i} x={104 + i * 28} y="156" width="12" height="50" fill={t} opacity="0.25" />
          ))}
          <circle cx="200" cy="70" r="8" fill={a} />
          <rect x="197" y="78" width="6" height="30" fill={a} />
        </Scene>
      ) : null}

      {atmosphere === "herringbone" ? (
        <Scene uid={uid}>
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 6 }).map((_, c) => (
              <path
                key={`${r}-${c}`}
                d={
                  (r + c) % 2 === 0
                    ? `M${c * 70} ${r * 32} l70 16 l0 16 l-70 -16 z`
                    : `M${c * 70} ${r * 32 + 16} l70 -16 l0 16 l-70 16 z`
                }
                fill={a}
                opacity={0.12 + ((r + c) % 3) * 0.08}
              />
            ))
          )}
          <line x1="40" y1="40" x2="140" y2="200" stroke={a} strokeWidth="1" strokeDasharray="4 6" />
        </Scene>
      ) : null}

      {atmosphere === "lacquer" ? (
        <Scene uid={uid}>
          <rect width="400" height="250" fill="#0a0a0a" opacity="0.2" />
          <path d="M60 200 C120 80 200 60 260 120 C300 156 340 80 370 60" fill="none" stroke={a} strokeWidth="2.4" />
          <circle cx="300" cy="90" r="16" fill="none" stroke={a} strokeWidth="1.4" />
          <rect x="48" y="36" width="304" height="178" fill="none" stroke={a} strokeWidth="1" opacity="0.4" />
        </Scene>
      ) : null}

      {atmosphere === "linen" ? (
        <Scene uid={uid}>
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 14} x2="400" y2={i * 14} stroke={a} strokeWidth="0.6" opacity="0.25" />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 26} y1="0" x2={i * 26} y2="250" stroke={m} strokeWidth="0.6" opacity="0.2" />
          ))}
          <rect x="48" y="48" width="304" height="154" fill="none" stroke={a} strokeWidth="1.2" />
        </Scene>
      ) : null}

      {atmosphere === "grid-panel" ? (
        <Scene uid={uid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`h${i}`} x1="20" y1={24 + i * 28} x2="380" y2={24 + i * 28} stroke={theme.border} strokeWidth="1" />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`v${i}`} x1={20 + i * 36} y1="24" x2={20 + i * 36} y2="220" stroke={theme.border} strokeWidth="1" />
          ))}
          <rect x="56" y="52" width="72" height="56" fill={a} opacity="0.18" />
        </Scene>
      ) : null}
    </div>
  );
}
