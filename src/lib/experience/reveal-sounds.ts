/** Lightweight Web Audio reveal sounds — no external files required */

import { createAudioContext } from "@/lib/browser/safe-storage";

export function playWaxCrackSound() {
  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    const duration = 0.35;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 12) * 0.4;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 800;
    src.connect(filter);
    filter.connect(ctx.destination);
    src.start();
    setTimeout(() => void ctx.close(), 500);
  } catch {
    // silent fail — browsers may block without gesture (we call after tap)
  }
}

export function playPaperUnfoldSound() {
  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => void ctx.close(), 700);
  } catch {
    // ignore
  }
}

/** Soft silk whisper for ribbon / satin ceremonies — noise swell, no crack. */
export function playSilkSlipSound() {
  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    const duration = 0.7;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      // Swell in, then fall away — a ribbon sliding, not a snap.
      const envelope = Math.sin((Math.PI * t) / duration) ** 2;
      data[i] = (Math.random() * 2 - 1) * envelope * 0.16;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2600;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    setTimeout(() => void ctx.close(), 900);
  } catch {
    // ignore
  }
}

export function playRevealSounds(enabled?: boolean) {
  if (!enabled) return;
  playWaxCrackSound();
  setTimeout(playPaperUnfoldSound, 200);
}
