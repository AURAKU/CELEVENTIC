/**
 * SoundEffectController — thin facade over reveal-sounds for Experience Engine.
 */
import {
  playPaperUnfoldSound,
  playRevealSounds,
  playWaxCrackSound,
} from "@/lib/experience/reveal-sounds";
import type { RevealMechanicId } from "@/lib/experience-engine/types";

export type SoundEffectId =
  | "wax-crack"
  | "paper-unfold"
  | "reveal-combo"
  | "soft-chime"
  | "page-turn"
  | "seal-press"
  | "petal-soft"
  | "soft-click"
  | "none";

export interface SoundEffectController {
  play: (id: SoundEffectId) => void;
  playForMechanic: (mechanic: RevealMechanicId) => void;
  setEnabled: (enabled: boolean) => void;
  isEnabled: () => boolean;
}

const MECHANIC_SFX: Partial<Record<RevealMechanicId, SoundEffectId>> = {
  envelope: "reveal-combo",
  "wax-seal": "wax-crack",
  "paper-unfold": "paper-unfold",
  scratch: "seal-press",
  curtain: "page-turn",
  "tap-to-bloom": "petal-soft",
  "card-flip": "page-turn",
  gate: "seal-press",
  ribbon: "soft-click",
  peel: "soft-click",
  passport: "soft-click",
  "magazine-page-turn": "page-turn",
  "candle-light": "soft-chime",
};

function playSoftChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
    setTimeout(() => ctx.close(), 600);
  } catch {
    // ignore
  }
}

function playPageTurn() {
  try {
    const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.25;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
    setTimeout(() => ctx.close(), 400);
  } catch {
    // ignore
  }
}

export function createSoundEffectController(enabled = true): SoundEffectController {
  let on = enabled;

  const controller: SoundEffectController = {
    setEnabled(next) {
      on = next;
    },
    isEnabled() {
      return on;
    },
    play(id) {
      if (!on || id === "none") return;
      switch (id) {
        case "wax-crack":
        case "seal-press":
          playWaxCrackSound();
          break;
        case "paper-unfold":
          playPaperUnfoldSound();
          break;
        case "reveal-combo":
          playRevealSounds(true);
          break;
        case "soft-chime":
        case "petal-soft":
          playSoftChime();
          break;
        case "page-turn":
        case "soft-click":
          playPageTurn();
          break;
        default:
          break;
      }
    },
    playForMechanic(mechanic) {
      controller.play(MECHANIC_SFX[mechanic] ?? "reveal-combo");
    },
  };

  return controller;
}
