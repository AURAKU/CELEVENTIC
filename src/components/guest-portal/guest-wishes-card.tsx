"use client";

import { Heart, MessageCircle, Sparkles } from "lucide-react";

const SAMPLE_WISHES = [
  { name: "Ama K.", message: "Wishing you a lifetime of love and laughter!" },
  { name: "Kwesi O.", message: "So happy for you both. Can't wait to celebrate!" },
];

interface GuestWishesCardProps {
  accentColor?: string;
  memoryVaultEnabled?: boolean;
  onScrollToRsvp?: () => void;
  variant?: "light" | "dark";
}

export function GuestWishesCard({ accentColor = "#0B8A83", memoryVaultEnabled, variant = "light" }: GuestWishesCardProps) {
  const dark = variant === "dark";
  return (
    <div
      className={`inv-3d-scene rounded-2xl border p-6 shadow-lg ${
        dark
          ? "border-white/15 bg-black/35 backdrop-blur-xl"
          : "border-rose-200/60 bg-gradient-to-br from-rose-50 to-white"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Heart className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className={`font-display text-lg font-bold ${dark ? "text-white" : "text-slate-900"}`}>Guest Wishes</h3>
      </div>
      <p className={`text-sm mb-4 ${dark ? "text-white/70" : "text-slate-600"}`}>
        Leave a blessing, share your joy, or upload memories after the celebration.
      </p>
      <div className="space-y-3 mb-4">
        {SAMPLE_WISHES.map((w) => (
          <div
            key={w.name}
            className={`inv-3d-card rounded-xl px-4 py-3 shadow-sm border ${
              dark ? "bg-white/10 border-white/15" : "bg-white/90 border-rose-100"
            }`}
          >
            <p className={`text-xs font-semibold flex items-center gap-1 ${dark ? "text-rose-300" : "text-rose-600"}`}>
              <MessageCircle className="h-3 w-3" /> {w.name}
            </p>
            <p className={`text-sm mt-1 italic ${dark ? "text-white/85" : "text-slate-700"}`}>&ldquo;{w.message}&rdquo;</p>
          </div>
        ))}
      </div>
      {memoryVaultEnabled ? (
        <p className={`text-xs text-center flex items-center justify-center gap-1 ${dark ? "text-white/50" : "text-slate-500"}`}>
          <Sparkles className="h-3 w-3" /> Memory Vault opens after the event
        </p>
      ) : (
        <p className={`text-xs text-center ${dark ? "text-white/40" : "text-slate-400"}`}>Wishes appear here when guests leave messages</p>
      )}
    </div>
  );
}
