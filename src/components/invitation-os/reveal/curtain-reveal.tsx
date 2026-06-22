"use client";

import { useEffect, useState } from "react";

interface CurtainRevealProps {
  eventTitle: string;
  theme?: "wedding" | "concert" | "award" | "birthday" | "corporate";
  onComplete: () => void;
}

const CURTAIN_THEMES = {
  wedding: { top: "#8B0000", bottom: "#5c0000", accent: "#D4A63A", bg: "#000" },
  concert: { top: "#1a1a2e", bottom: "#0f0f1a", accent: "#7dd3fc", bg: "#050508" },
  award: { top: "#2d1f0f", bottom: "#1a1208", accent: "#D4A63A", bg: "#0a0806" },
  birthday: { top: "#7c3aed", bottom: "#4c1d95", accent: "#fbbf24", bg: "#1a0a2e" },
  corporate: { top: "#1e3a5f", bottom: "#0f2744", accent: "#38bdf8", bg: "#0a1628" },
};

export function CurtainReveal({ eventTitle, theme = "wedding", onComplete }: CurtainRevealProps) {
  const colors = CURTAIN_THEMES[theme];
  const [raised, setRaised] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setRaised(true);
      setTimeout(onComplete, 1200);
    }, 400);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: colors.bg }}>
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <h2 className="font-display text-2xl sm:text-3xl text-center px-6 animate-pulse" style={{ color: colors.accent }}>{eventTitle}</h2>
      </div>
      <div
        className="absolute top-0 left-0 right-0 h-1/2 transition-transform duration-[1.2s] ease-in-out shadow-2xl"
        style={{ background: `linear-gradient(to bottom, ${colors.top}, ${colors.bottom})`, transform: raised ? "translateY(-100%)" : "translateY(0)" }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-1/2 transition-transform duration-[1.2s] ease-in-out shadow-2xl"
        style={{ background: `linear-gradient(to top, ${colors.top}, ${colors.bottom})`, transform: raised ? "translateY(100%)" : "translateY(0)" }}
      />
      <div className="absolute top-0 left-0 right-0 h-8 z-20" style={{ background: `${colors.accent}4D`, transform: raised ? "translateY(-100%)" : "translateY(0)", transition: "transform 1.2s ease-in-out" }} />
    </div>
  );
}
