/**
 * Instagram reel inspiration mapped to Celeventic invite features.
 * Refs: invitationmedia-style digital wedding hubs + luxury reel UX patterns.
 */
export const INSPO_REEL_REFERENCES = [
  { id: "DYO8V8XSM25", themes: ["full digital hub", "live countdown", "maps", "organized sections", "premium custom"] },
  { id: "DXjOwYJDc_Z", themes: ["tap-to-open", "envelope ceremony", "personalized guest name"] },
  { id: "DZYEbrSR32l", themes: ["scratch / foil reveal", "luxury gold aesthetic"] },
  { id: "DXkUR8NDUac", themes: ["passport / booklet", "destination wedding"] },
  { id: "DW1LeRxjdRx", themes: ["scroll unroll", "parchment / letter unfold"] },
] as const;

export const INSPO_FEATURE_MAP: Record<string, string> = {
  "full digital hub": "GuestInvitationPortal + blocks",
  "live countdown": "FloatingCountdownPill + Countdown block",
  "maps": "Maps CTA + directions chip",
  "tap-to-open": "InvitationRevealCeremony + envelope mode",
  "scratch / foil reveal": "ScratchReveal",
  "passport / booklet": "PassportReveal + passport-luxe template",
  "scroll unroll": "ScrollUnrollReveal",
  "glass swipe": "GlassReveal",
  "seating qr": "Seat lookup + branded QR pass",
};
