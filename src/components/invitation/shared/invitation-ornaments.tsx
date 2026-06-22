export function GoldFrame({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-3 border-2 border-[#D4AF37]/80 sm:inset-4 ${className}`}>
      <div className="absolute inset-1 border border-[#D4AF37]/40" />
    </div>
  );
}

export function VineBorder({ color = "#F5F0E6" }: { color?: string }) {
  return (
    <svg className="pointer-events-none absolute inset-x-2 top-2 h-16 w-[calc(100%-1rem)] opacity-70" viewBox="0 0 400 60" fill="none">
      <path d="M10 40 Q80 10 200 30 T390 35" stroke={color} strokeWidth="1.2" />
      <path d="M30 45 Q100 20 210 38 T380 42" stroke={color} strokeWidth="0.8" opacity="0.6" />
      <circle cx="80" cy="28" r="3" fill={color} opacity="0.5" />
      <circle cx="200" cy="32" r="2.5" fill={color} opacity="0.5" />
      <circle cx="310" cy="36" r="3" fill={color} opacity="0.5" />
      <path d="M75 26c2-4 6-4 8 0M195 30c2-4 6-4 8 0M305 34c2-4 6-4 8 0" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}

export function LaceBorder({ position = "top" }: { position?: "top" | "bottom" }) {
  const flip = position === "bottom" ? "rotate-180 bottom-0 top-auto" : "top-0";
  return (
    <div className={`pointer-events-none absolute inset-x-0 h-20 ${flip} overflow-hidden opacity-90`}>
      <svg viewBox="0 0 400 80" className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id="lace" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1.5" fill="white" opacity="0.8" />
            <path d="M0 20 Q10 5 20 20 T40 20" stroke="white" strokeWidth="0.8" fill="none" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="400" height="80" fill="url(#lace)" opacity="0.85" />
        <path d="M0 60 Q50 20 100 55 T200 50 T300 58 T400 52 L400 80 L0 80 Z" fill="white" opacity="0.15" />
      </svg>
    </div>
  );
}

export function FloralCorner({ className = "" }: { className?: string }) {
  return (
    <svg className={`absolute h-20 w-20 opacity-60 ${className}`} viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="8" fill="#D4A5A5" opacity="0.4" />
      <circle cx="30" cy="32" r="6" fill="#E8C4C4" opacity="0.5" />
      <circle cx="50" cy="32" r="5" fill="#D4A5A5" opacity="0.4" />
      <circle cx="35" cy="48" r="5" fill="#C9B896" opacity="0.4" />
      <path d="M40 10 Q55 25 40 40 Q25 25 40 10" fill="#B89E67" opacity="0.3" />
      <path d="M10 40 Q25 55 40 40" stroke="#B89E67" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

export function HexagonFrame({ color = "#B89E67" }: { color?: string }) {
  return (
    <svg className="pointer-events-none absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)]" viewBox="0 0 300 500" fill="none">
      <path
        d="M150 10 L270 90 L270 250 L150 330 L30 250 L30 90 Z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M150 25 L255 95 L255 245 L150 315 L45 245 L45 95 Z"
        stroke={color}
        strokeWidth="0.8"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}

export function InterlockingRings({ color = "#D4AF37", size = 28 }: { color?: string; size?: number }) {
  return (
    <svg width={size * 2} height={size} viewBox="0 0 56 28" className="inline-block mx-3">
      <circle cx="18" cy="14" r="11" stroke={color} strokeWidth="2" fill="none" />
      <circle cx="38" cy="14" r="11" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  );
}
