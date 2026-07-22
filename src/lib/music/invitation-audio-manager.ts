import type { MusicSelection } from "@/lib/music/music-types";
import { formatAudioTime } from "@/lib/music/trimmed-audio-playback";
import { resolveMusicUrl } from "@/lib/music/validate-selection";

let activeInvitationAudioManager: InvitationAudioManager | null = null;

/** Stops any invitation audio currently playing (e.g. when leaving a preview). */
export function pauseAllInvitationAudio(): void {
  activeInvitationAudioManager?.pause();
}

export interface InvitationAudioManager {
  play: () => Promise<boolean>;
  pause: () => void;
  toggle: () => Promise<boolean>;
  mute: () => void;
  unmute: () => void;
  setVolume: (v: number) => void;
  restart: () => Promise<boolean>;
  destroy: () => void;
  isPlaying: () => boolean;
  isMuted: () => boolean;
  getVolume: () => number;
  getAudio: () => HTMLAudioElement | null;
}

function waitForAudioReady(a: HTMLAudioElement): Promise<void> {
  if (a.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Audio failed to load"));
    };
    const cleanup = () => {
      a.removeEventListener("canplaythrough", onReady);
      a.removeEventListener("loadeddata", onReady);
      a.removeEventListener("error", onError);
    };
    a.addEventListener("canplaythrough", onReady, { once: true });
    a.addEventListener("loadeddata", onReady, { once: true });
    a.addEventListener("error", onError, { once: true });
    a.load();
  });
}

export function createInvitationAudioManager(
  musicSelection: MusicSelection | null | undefined,
  musicUrl: string | null | undefined
): InvitationAudioManager | null {
  const selectionUrl = musicSelection?.url;
  const fallbackUrl =
    musicUrl?.startsWith("http") || musicUrl?.startsWith("/") ? musicUrl : null;
  const url = selectionUrl ?? fallbackUrl;
  if (!url) return null;
  const resolvedUrl: string = url;

  let audio: HTMLAudioElement | null = null;
  let muted = false;
  let savedVolume = musicSelection?.volume ?? 0.55;
  let trimHandler: (() => void) | null = null;
  let loadPromise: Promise<void> | null = null;

  function wireTrimLoop(a: HTMLAudioElement) {
    if (!musicSelection) return;
    const start = musicSelection.startSec;
    const end = musicSelection.endSec;
    const loop = musicSelection.loop ?? true;
    const fadeOutSec = musicSelection.fadeOutSec ?? 0;
    const fadeInSec = musicSelection.fadeInSec ?? 0;

    trimHandler = () => {
      const targetVol = musicSelection?.volume ?? savedVolume;
      // Fade the clip tail so trimmed audio never hard-cuts.
      if (!muted && fadeOutSec > 0 && a.currentTime >= end - fadeOutSec && a.currentTime < end) {
        const remaining = Math.max(0, end - a.currentTime);
        a.volume = targetVol * (remaining / fadeOutSec);
      }
      if (a.currentTime >= end - 0.05) {
        if (loop) {
          a.currentTime = start;
          if (fadeOutSec > 0 || fadeInSec > 0) {
            applyFadeIn(targetVol, Math.max(fadeInSec, 0.5));
          } else if (!muted) {
            a.volume = targetVol;
          }
        } else {
          a.pause();
          if (!muted) a.volume = targetVol;
          a.removeEventListener("timeupdate", trimHandler!);
        }
      }
    };
    a.addEventListener("timeupdate", trimHandler);
  }

  function ensureAudio(): HTMLAudioElement {
    if (audio) return audio;

    audio = new Audio(resolveMusicUrl(resolvedUrl));
    audio.preload = "auto";
    // Do not set crossOrigin — external CDNs often omit CORS headers and break playback.

    if (musicSelection) {
      audio.loop = false;
      wireTrimLoop(audio);
      audio.addEventListener("loadedmetadata", () => {
        if (audio) audio.currentTime = musicSelection.startSec;
      });
    } else {
      audio.loop = true;
    }

    audio.volume = 0;
    loadPromise = waitForAudioReady(audio).catch(() => undefined);
    return audio;
  }

  function applyFadeIn(targetVol: number, fadeSec: number) {
    const a = audio;
    if (!a) return;
    if (fadeSec <= 0) {
      a.volume = muted ? 0 : targetVol;
      return;
    }
    a.volume = 0;
    const steps = 24;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      if (!audio) {
        clearInterval(iv);
        return;
      }
      audio.volume = muted ? 0 : Math.min(targetVol, (step / steps) * targetVol);
      if (step >= steps) clearInterval(iv);
    }, (fadeSec * 1000) / steps);
  }

  const manager: InvitationAudioManager = {
    play: async (): Promise<boolean> => {
    const a = ensureAudio();
    const targetVol = musicSelection?.volume ?? savedVolume;
    const fadeIn = musicSelection?.fadeInSec ?? 1.5;

    try {
      if (activeInvitationAudioManager && activeInvitationAudioManager !== manager) {
        activeInvitationAudioManager.pause();
      }
      activeInvitationAudioManager = manager;
      if (loadPromise) await loadPromise;
      if (musicSelection) {
        a.currentTime = musicSelection.startSec;
      }
      await a.play();
      applyFadeIn(targetVol, fadeIn);
      return true;
    } catch {
      return false;
    }
  },
    pause() {
      audio?.pause();
    },
    async toggle() {
      if (!audio || audio.paused) return manager.play();
      audio.pause();
      return false;
    },
    mute() {
      muted = true;
      if (audio) audio.volume = 0;
    },
    unmute() {
      muted = false;
      if (audio) audio.volume = savedVolume;
    },
    setVolume(v: number) {
      savedVolume = Math.max(0, Math.min(1, v));
      if (audio && !muted) audio.volume = savedVolume;
    },
    async restart() {
      const a = ensureAudio();
      if (loadPromise) await loadPromise;
      if (musicSelection) {
        a.currentTime = musicSelection.startSec;
      } else {
        a.currentTime = 0;
      }
      return manager.play();
    },
    destroy() {
      if (audio && trimHandler) {
        audio.removeEventListener("timeupdate", trimHandler);
      }
      if (audio) {
        audio.pause();
        audio.src = "";
      }
      if (activeInvitationAudioManager === manager) {
        activeInvitationAudioManager = null;
      }
      audio = null;
      trimHandler = null;
      loadPromise = null;
    },
    isPlaying() {
      return audio ? !audio.paused : false;
    },
    isMuted() {
      return muted;
    },
    getVolume() {
      return savedVolume;
    },
    getAudio() {
      return audio;
    },
  };

  return manager;
}

export { formatAudioTime };
