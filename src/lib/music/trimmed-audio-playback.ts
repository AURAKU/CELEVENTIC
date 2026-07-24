import type { MusicSelection } from "@/lib/music/music-types";
import { resolveMusicUrl } from "@/lib/music/validate-selection";

export interface PlayTrimmedAudioOptions {
  volume?: number;
  loop?: boolean;
  baseUrl?: string;
  fadeInSec?: number;
  fadeOutSec?: number;
  /** Fires as the clip plays with (secondsIntoClip, clipLengthSec) — never raw track time. */
  onProgress?: (positionSec: number, clipLenSec: number) => void;
  /** Fires whenever the underlying element starts/stops playing. */
  onPlayStateChange?: (playing: boolean) => void;
  /** Fires if the source fails to load. */
  onError?: () => void;
}

export function playTrimmedAudio(
  selection: MusicSelection,
  options: PlayTrimmedAudioOptions = {}
): HTMLAudioElement {
  const audio = new Audio(resolveMusicUrl(selection.url, options.baseUrl));
  const targetVolume = Math.max(0, Math.min(1, options.volume ?? selection.volume ?? 0.4));
  const loop = options.loop ?? selection.loop ?? true;
  const fadeIn = Math.max(0, options.fadeInSec ?? selection.fadeInSec ?? 0);
  const fadeOut = Math.max(0, options.fadeOutSec ?? selection.fadeOutSec ?? 0);

  audio.volume = fadeIn > 0 ? 0 : targetVolume;
  audio.preload = "auto";

  const start = selection.startSec;
  const end = selection.endSec;
  const clipLen = Math.max(0.1, end - start);
  let fadeTimer: ReturnType<typeof setInterval> | null = null;

  function clearFadeTimer() {
    if (fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }

  function fadeVolumeTo(target: number, durationSec: number) {
    clearFadeTimer();
    if (durationSec <= 0) {
      audio.volume = Math.max(0, Math.min(1, target));
      return;
    }
    const steps = 20;
    let step = 0;
    const from = audio.volume;
    fadeTimer = setInterval(() => {
      step++;
      audio.volume = Math.max(0, Math.min(1, from + ((target - from) * step) / steps));
      if (step >= steps) clearFadeTimer();
    }, (durationSec * 1000) / steps);
  }

  function onTimeUpdate() {
    // Clamp any drift/seek outside the trimmed window back into the clip —
    // this preview must never be heard playing from the raw track start.
    if (audio.currentTime < start - 0.25 || audio.currentTime > end + 0.25) {
      audio.currentTime = start;
      return;
    }
    options.onProgress?.(Math.max(0, Math.min(clipLen, audio.currentTime - start)), clipLen);
    if (fadeOut > 0 && audio.currentTime >= end - fadeOut && audio.currentTime < end) {
      const remaining = Math.max(0, end - audio.currentTime);
      audio.volume = targetVolume * Math.min(1, remaining / fadeOut);
    }
    if (audio.currentTime >= end - 0.05) {
      if (loop) {
        audio.currentTime = start;
        options.onProgress?.(0, clipLen);
        fadeVolumeTo(targetVolume, Math.max(fadeIn, fadeOut > 0 ? 0.4 : 0));
      } else {
        audio.pause();
        audio.removeEventListener("timeupdate", onTimeUpdate);
      }
    }
  }

  function beginPlayback() {
    audio.currentTime = start;
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio
      .play()
      .then(() => fadeVolumeTo(targetVolume, fadeIn))
      .catch(() => options.onError?.());
  }

  audio.addEventListener("play", () => options.onPlayStateChange?.(true));
  audio.addEventListener("pause", () => {
    clearFadeTimer();
    options.onPlayStateChange?.(false);
  });
  audio.addEventListener("error", () => options.onError?.());

  // Never start playback before the trim point has been honored — seeking
  // before metadata is loaded is unreliable across browsers and is the
  // classic cause of a trimmed clip audibly starting from the track's 0:00.
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    beginPlayback();
  } else {
    audio.addEventListener("loadedmetadata", beginPlayback, { once: true });
  }

  return audio;
}

/** Seeks within the trimmed clip only — offsetSec is clamped to [0, clipLen]. */
export function seekTrimmedAudio(
  audio: HTMLAudioElement,
  selection: Pick<MusicSelection, "startSec" | "endSec">,
  offsetSec: number
): number {
  const clipLen = Math.max(0.1, selection.endSec - selection.startSec);
  const clamped = Math.max(0, Math.min(clipLen, offsetSec));
  audio.currentTime = selection.startSec + clamped;
  return clamped;
}

export function formatAudioTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
