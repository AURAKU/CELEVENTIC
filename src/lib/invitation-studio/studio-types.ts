export type RevealMode = "envelope" | "scratch" | "passport" | "glass" | "curtain" | "scroll-unroll" | "none";

export type ButtonStyle = "rounded" | "pill" | "sharp" | "glass" | "outline" | "gold";

export type ButtonPosition = "bottom" | "center" | "floating";

export interface InvitationStudioConfig {
  revealMode?: RevealMode;
  buttonStyle?: ButtonStyle;
  buttonPosition?: ButtonPosition;
  headingSize?: number;
  bodySize?: number;
  scriptSize?: number;
  rsvpLabel?: string;
  fullScreen?: boolean;
}

export const REVEAL_MODE_OPTIONS: { id: RevealMode; label: string; description: string }[] = [
  { id: "envelope", label: "Tap envelope", description: "Classic tap-to-open wax seal envelope" },
  { id: "scratch", label: "Scratch reveal", description: "Scratch the foil to unveil the invite" },
  { id: "passport", label: "Passport flip", description: "Open a luxury passport booklet" },
  { id: "glass", label: "Glass acrylic", description: "Frosted glass swipe to reveal" },
  { id: "curtain", label: "Curtain rise", description: "Theatre curtain lifts to unveil" },
  { id: "scroll-unroll", label: "Scroll unroll", description: "Royal parchment scroll unfolds — reel classic" },
  { id: "none", label: "Instant", description: "No opening ceremony — direct view" },
];

export const BUTTON_STYLE_OPTIONS: { id: ButtonStyle; label: string }[] = [
  { id: "rounded", label: "Rounded" },
  { id: "pill", label: "Pill" },
  { id: "sharp", label: "Sharp edge" },
  { id: "glass", label: "Glass" },
  { id: "outline", label: "Outline" },
  { id: "gold", label: "Gold luxury" },
];

export const BUTTON_POSITION_OPTIONS: { id: ButtonPosition; label: string }[] = [
  { id: "bottom", label: "Bottom bar" },
  { id: "center", label: "Center stack" },
  { id: "floating", label: "Floating action" },
];

export const DEFAULT_STUDIO_CONFIG: InvitationStudioConfig = {
  revealMode: "envelope",
  buttonStyle: "gold",
  buttonPosition: "center",
  headingSize: 28,
  bodySize: 14,
  scriptSize: 22,
  rsvpLabel: "RSVP Now",
  fullScreen: true,
};
