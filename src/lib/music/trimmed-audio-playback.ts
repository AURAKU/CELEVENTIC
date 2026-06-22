import type { MusicSelection } from "@/lib/music/music-types";
import { resolveMusicUrl } from "@/lib/music/validate-selection";

export function playTrimmedAudio(
  selection: MusicSelection,
  options?: { volume?: number; loop?: boolean; baseUrl?: string; fadeInSec?: number }
): HTMLAudioElement {
  const audio = new Audio(resolveMusicUrl(selection.url, options?.baseUrl));
  const targetVolume = options?.volume ?? selection.volume ?? 0.4;
  const loop = options?.loop ?? selection.loop ?? true;
  const fadeIn = options?.fadeInSec ?? selection.fadeInSec ?? 0;

  audio.volume = fadeIn > 0 ? 0 : targetVolume;
  audio.preload = "auto";

  const start = selection.startSec;
  const end = selection.endSec;

  function onTimeUpdate() {
    if (audio.currentTime >= end - 0.05) {
      if (loop) {
        audio.currentTime = start;
      } else {
        audio.pause();
        audio.removeEventListener("timeupdate", onTimeUpdate);
      }
    }
  }

  audio.addEventListener("loadedmetadata", () => {
    audio.currentTime = start;
    void audio.play().catch(() => undefined);
    if (fadeIn > 0) {
      const steps = 20;
      let step = 0;
      const iv = setInterval(() => {
        step++;
        audio.volume = Math.min(targetVolume, (step / steps) * targetVolume);
        if (step >= steps) clearInterval(iv);
      }, (fadeIn * 1000) / steps);
    }
  });

  audio.addEventListener("timeupdate", onTimeUpdate);
  void audio.play().catch(() => undefined);
  return audio;
}

export function formatAudioTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
