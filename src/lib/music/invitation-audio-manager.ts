import type { MusicSelection } from "@/lib/music/music-types";
import { formatAudioTime } from "@/lib/music/trimmed-audio-playback";
import { resolveMusicUrl } from "@/lib/music/validate-selection";

let activeInvitationAudioManager: InvitationAudioManager | null = null;
let invitationAudioDucked = false;

/** Stops any invitation audio currently playing (e.g. when leaving a preview). */
export function pauseAllInvitationAudio(): void {
  activeInvitationAudioManager?.pause();
}

/** Pause bed music while a guest-started film owns the audio stage. */
export function duckInvitationAudio(): void {
  const manager = activeInvitationAudioManager;
  if (!manager) return;
  invitationAudioDucked = manager.isPlaying();
  manager.pause();
}

/** Resume bed music after the film yields, if it was playing before the duck. */
export function unduckInvitationAudio(): void {
  if (!invitationAudioDucked) return;
  invitationAudioDucked = false;
  void activeInvitationAudioManager?.resume();
}

export interface InvitationAudioManager {
  /** Create the element and begin buffering (safe outside a gesture). */
  prime: () => void;
  /**
   * Must run inside a click/tap handler. Starts play immediately so Safari
   * keeps the user-activation chain — never await network first.
   */
  unlock: () => Promise<boolean>;
  /**
   * Spend a user gesture to authorise this element for later programmatic
   * playback **without emitting any sound**: play muted at volume 0, then
   * pause. Used when the invitation intro video owns the audio stage and
   * template music must not start yet.
   */
  armSilently: () => Promise<boolean>;
  play: () => Promise<boolean>;
  /** Continue from the current playhead after a film duck — do not rewind. */
  resume: () => Promise<boolean>;
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
  let fadeInterval: ReturnType<typeof setInterval> | null = null;

  function clearFade() {
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
  }

  function applyMuteToElement(a: HTMLAudioElement) {
    // Prefer the native muted flag (iOS/Safari respects this more reliably than
    // volume alone) and zero volume so fade/trim loops cannot leak sound.
    a.muted = true;
    a.volume = 0;
  }

  function applyUnmuteToElement(a: HTMLAudioElement) {
    a.muted = false;
    a.volume = savedVolume;
  }

  function wireTrimLoop(a: HTMLAudioElement) {
    if (!musicSelection) return;
    const start = musicSelection.startSec;
    const end = musicSelection.endSec;
    const loop = musicSelection.loop ?? true;
    const fadeOutSec = musicSelection.fadeOutSec ?? 0;
    const fadeInSec = musicSelection.fadeInSec ?? 0;

    trimHandler = () => {
      const targetVol = musicSelection?.volume ?? savedVolume;
      // Seeks/drift outside the trimmed window (OS media keys, background tab
      // throttling, scrub bars, etc.) must snap back into the clip — never
      // let the guest hear audio before start or past end.
      if (a.currentTime < start - 0.25) {
        a.currentTime = start;
        return;
      }
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
    audio.muted = muted;
    loadPromise = waitForAudioReady(audio).catch(() => undefined);
    return audio;
  }

  function applyFadeIn(targetVol: number, fadeSec: number) {
    const a = audio;
    if (!a) return;
    clearFade();
    if (muted) {
      applyMuteToElement(a);
      return;
    }
    if (fadeSec <= 0) {
      a.muted = false;
      a.volume = targetVol;
      return;
    }
    a.muted = false;
    a.volume = 0;
    const steps = 24;
    let step = 0;
    fadeInterval = setInterval(() => {
      step++;
      if (!audio) {
        clearFade();
        return;
      }
      if (muted) {
        applyMuteToElement(audio);
        clearFade();
        return;
      }
      audio.muted = false;
      audio.volume = Math.min(targetVol, (step / steps) * targetVol);
      if (step >= steps) clearFade();
    }, (fadeSec * 1000) / steps);
  }

  async function playNow(keepPlaying: boolean): Promise<boolean> {
    const a = ensureAudio();
    const targetVol = musicSelection?.volume ?? savedVolume;
    const fadeIn = musicSelection?.fadeInSec ?? 1.5;

    try {
      if (activeInvitationAudioManager && activeInvitationAudioManager !== manager) {
        activeInvitationAudioManager.pause();
      }
      activeInvitationAudioManager = manager;

      // Seek best-effort without awaiting network — awaiting before play()
      // drops the Safari/Chrome user-activation token and blocks autoplay.
      if (musicSelection && a.readyState >= HTMLMediaElement.HAVE_METADATA) {
        try {
          a.currentTime = musicSelection.startSec;
        } catch {
          /* ignore seek before ready */
        }
      }

      // Start muted when the guest already muted — still unlocks the element
      // so a later unmute is instant on iOS/Safari.
      if (muted) applyMuteToElement(a);

      await a.play();

      if (!keepPlaying) {
        a.pause();
        if (musicSelection) {
          try {
            a.currentTime = musicSelection.startSec;
          } catch {
            /* ignore */
          }
        }
        return true;
      }

      if (muted) {
        applyMuteToElement(a);
      } else {
        applyFadeIn(targetVol, fadeIn);
      }
      return true;
    } catch {
      // Retry once after the element can decode, for non-gesture recoveries.
      try {
        if (loadPromise) await loadPromise;
        else await waitForAudioReady(a);
        if (musicSelection) {
          try {
            a.currentTime = musicSelection.startSec;
          } catch {
            /* ignore */
          }
        }
        if (muted) applyMuteToElement(a);
        await a.play();
        if (!keepPlaying) {
          a.pause();
          return true;
        }
        if (muted) {
          applyMuteToElement(a);
        } else {
          applyFadeIn(targetVol, fadeIn);
        }
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Silent gesture spend. The element is played muted at volume 0 and paused
   * on the next tick, which is enough for Safari/Chrome to mark it
   * user-activated, then rewound to the trim start. No sound reaches the
   * guest, so the invitation intro video keeps the audio stage to itself.
   */
  async function armSilently(): Promise<boolean> {
    const a = ensureAudio();
    clearFade();
    try {
      a.muted = true;
      a.volume = 0;
      await a.play();
      a.pause();
      try {
        a.currentTime = musicSelection?.startSec ?? 0;
      } catch {
        /* metadata not ready — play() will seek later */
      }
      return true;
    } catch {
      return false;
    } finally {
      // Restore the caller's intent; `playNow` re-applies volume via fade-in.
      a.muted = muted;
      a.volume = 0;
    }
  }

  // Declared before methods that close over it so comparisons stay valid.
  // eslint-disable-next-line prefer-const
  let manager: InvitationAudioManager;

  manager = {
    prime() {
      ensureAudio();
    },
    unlock: async () => playNow(true),
    armSilently,
    play: async () => playNow(true),
    async resume() {
      const a = ensureAudio();
      try {
        if (activeInvitationAudioManager && activeInvitationAudioManager !== manager) {
          activeInvitationAudioManager.pause();
        }
        activeInvitationAudioManager = manager;
        if (muted) applyMuteToElement(a);
        await a.play();
        if (muted) {
          applyMuteToElement(a);
        } else {
          clearFade();
          a.muted = false;
          a.volume = musicSelection?.volume ?? savedVolume;
        }
        return true;
      } catch {
        return playNow(true);
      }
    },
    pause() {
      clearFade();
      audio?.pause();
    },
    async toggle() {
      if (!audio || audio.paused) return manager.play();
      audio.pause();
      return false;
    },
    mute() {
      muted = true;
      clearFade();
      if (audio) applyMuteToElement(audio);
    },
    unmute() {
      muted = false;
      clearFade();
      if (audio) applyUnmuteToElement(audio);
    },
    setVolume(v: number) {
      savedVolume = Math.max(0, Math.min(1, v));
      if (audio && !muted) {
        audio.muted = false;
        audio.volume = savedVolume;
      }
    },
    async restart() {
      const a = ensureAudio();
      if (musicSelection && a.readyState >= HTMLMediaElement.HAVE_METADATA) {
        a.currentTime = musicSelection.startSec;
      } else if (!musicSelection) {
        a.currentTime = 0;
      }
      return manager.play();
    },
    destroy() {
      clearFade();
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
      return audio ?? ensureAudio();
    },
  };

  return manager;
}

export { formatAudioTime };
