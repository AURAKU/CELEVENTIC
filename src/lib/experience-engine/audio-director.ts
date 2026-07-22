/**
 * AudioDirector — facade over invitation-audio-manager + resolve-invitation-music.
 * Does not rebuild playback; adds a stable director API for the Experience Engine.
 */
import type { MusicSelection } from "@/lib/music/music-types";
import {
  createInvitationAudioManager,
  pauseAllInvitationAudio,
  type InvitationAudioManager,
} from "@/lib/music/invitation-audio-manager";

export interface AudioDirectorOptions {
  musicSelection?: MusicSelection | null;
  musicUrl?: string | null;
  /** When true, play/mute/restart become no-ops that report success (preview parity). */
  suppressPlayback?: boolean;
  defaultVolume?: number;
  loop?: boolean;
}

export interface AudioDirector {
  select: (selection: MusicSelection | null, url?: string | null) => void;
  play: () => Promise<boolean>;
  pause: () => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  setLoop: (loop: boolean) => void;
  fadeTo: (volume: number, durationMs?: number) => void;
  /** Soft start at scene begin — fade in from near-zero if not already playing. */
  onSceneStart: (opts?: { fadeMs?: number; volume?: number }) => Promise<boolean>;
  /** Outro bed — optional fade-out then pause. */
  onOutro: (opts?: { fadeMs?: number; pause?: boolean }) => void;
  restart: () => Promise<boolean>;
  destroy: () => void;
  isPlaying: () => boolean;
  isMuted: () => boolean;
  getVolume: () => number;
  /** Underlying manager for legacy UI (InvitationAudioControls). */
  getManager: () => InvitationAudioManager | null;
}

export function createAudioDirector(options: AudioDirectorOptions = {}): AudioDirector {
  let selection = options.musicSelection ?? null;
  let url = options.musicUrl ?? null;
  let manager: InvitationAudioManager | null = createInvitationAudioManager(selection, url);
  let muted = false;
  let volume = options.defaultVolume ?? selection?.volume ?? 0.55;
  let loop = options.loop ?? selection?.loop ?? true;
  let fadeTimer: ReturnType<typeof setInterval> | null = null;

  function applyLoop() {
    const el = manager?.getAudio();
    if (el && !selection) {
      // Trimmed selections manage loop via timeupdate; raw URLs use native loop.
      el.loop = loop;
    }
  }

  function rebuild() {
    manager?.destroy();
    manager = createInvitationAudioManager(selection, url);
    if (manager) {
      manager.setVolume(volume);
      if (muted) manager.mute();
      applyLoop();
    }
  }

  function clearFade() {
    if (fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }

  const director: AudioDirector = {
    select(nextSelection, nextUrl) {
      selection = nextSelection;
      url = nextUrl ?? nextSelection?.url ?? url;
      if (typeof nextSelection?.loop === "boolean") loop = nextSelection.loop;
      rebuild();
    },
    async play() {
      if (options.suppressPlayback) return false;
      if (!manager) rebuild();
      applyLoop();
      return (await manager?.play()) ?? false;
    },
    pause() {
      manager?.pause();
    },
    mute() {
      muted = true;
      manager?.mute();
    },
    unmute() {
      muted = false;
      manager?.unmute();
    },
    toggleMute() {
      if (muted) director.unmute();
      else director.mute();
    },
    setVolume(v: number) {
      volume = Math.max(0, Math.min(1, v));
      manager?.setVolume(volume);
    },
    setLoop(next) {
      loop = next;
      applyLoop();
    },
    fadeTo(target, durationMs = 800) {
      if (!manager || options.suppressPlayback) {
        director.setVolume(target);
        return;
      }
      clearFade();
      const start = manager.getVolume();
      const end = Math.max(0, Math.min(1, target));
      const steps = 20;
      let step = 0;
      fadeTimer = setInterval(() => {
        step++;
        const t = step / steps;
        const next = start + (end - start) * t;
        director.setVolume(next);
        if (step >= steps) clearFade();
      }, durationMs / steps);
    },
    async onSceneStart(opts) {
      if (options.suppressPlayback) return false;
      const target = opts?.volume ?? volume;
      const fadeMs = opts?.fadeMs ?? 600;
      if (!manager) rebuild();
      director.setVolume(0.02);
      const ok = await director.play();
      if (ok) director.fadeTo(target, fadeMs);
      return ok;
    },
    onOutro(opts) {
      const fadeMs = opts?.fadeMs ?? 900;
      const shouldPause = opts?.pause !== false;
      director.fadeTo(0, fadeMs);
      if (shouldPause && typeof window !== "undefined") {
        window.setTimeout(() => director.pause(), fadeMs + 40);
      }
    },
    async restart() {
      if (options.suppressPlayback) return false;
      return (await manager?.restart()) ?? false;
    },
    destroy() {
      clearFade();
      manager?.destroy();
      manager = null;
    },
    isPlaying() {
      return manager?.isPlaying() ?? false;
    },
    isMuted() {
      return muted || (manager?.isMuted() ?? false);
    },
    getVolume() {
      return manager?.getVolume() ?? volume;
    },
    getManager() {
      return manager;
    },
  };

  applyLoop();
  return director;
}

export function stopAllExperienceAudio(): void {
  pauseAllInvitationAudio();
}
