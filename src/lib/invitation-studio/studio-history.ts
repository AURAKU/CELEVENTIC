/**
 * Studio undo/redo + local version history (MVP).
 * Snapshots are kept in-memory / sessionStorage — no schema migration required.
 */
import type { InvitationDesignConfig } from "@/types/invitation-design";
import type { MusicSelection } from "@/lib/music/music-types";

export interface StudioSnapshot {
  id: string;
  label: string;
  at: number;
  design: InvitationDesignConfig;
  musicSelection: MusicSelection | null;
  galleryUrls: string[];
}

export interface StudioHistoryState {
  past: StudioSnapshot[];
  present: StudioSnapshot;
  future: StudioSnapshot[];
  versions: StudioSnapshot[];
}

const MAX_UNDO = 40;
const MAX_VERSIONS = 12;

export function createSnapshot(
  design: InvitationDesignConfig,
  musicSelection: MusicSelection | null,
  galleryUrls: string[],
  label = "Edit"
): StudioSnapshot {
  return {
    id: `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    at: Date.now(),
    design: structuredClone(design),
    musicSelection: musicSelection ? structuredClone(musicSelection) : null,
    galleryUrls: [...galleryUrls],
  };
}

export function initHistory(
  design: InvitationDesignConfig,
  musicSelection: MusicSelection | null,
  galleryUrls: string[]
): StudioHistoryState {
  const present = createSnapshot(design, musicSelection, galleryUrls, "Initial");
  return { past: [], present, future: [], versions: [present] };
}

export function pushHistory(
  state: StudioHistoryState,
  design: InvitationDesignConfig,
  musicSelection: MusicSelection | null,
  galleryUrls: string[],
  label = "Edit"
): StudioHistoryState {
  const next = createSnapshot(design, musicSelection, galleryUrls, label);
  const past = [...state.past, state.present].slice(-MAX_UNDO);
  return {
    past,
    present: next,
    future: [],
    versions: state.versions,
  };
}

export function undoHistory(state: StudioHistoryState): StudioHistoryState | null {
  if (state.past.length === 0) return null;
  const past = [...state.past];
  const previous = past.pop()!;
  return {
    past,
    present: previous,
    future: [state.present, ...state.future].slice(0, MAX_UNDO),
    versions: state.versions,
  };
}

export function redoHistory(state: StudioHistoryState): StudioHistoryState | null {
  if (state.future.length === 0) return null;
  const [next, ...rest] = state.future;
  return {
    past: [...state.past, state.present].slice(-MAX_UNDO),
    present: next,
    future: rest,
    versions: state.versions,
  };
}

export function checkpointVersion(state: StudioHistoryState, label = "Checkpoint"): StudioHistoryState {
  const version = { ...state.present, id: `ver-${Date.now().toString(36)}`, label, at: Date.now() };
  return {
    ...state,
    versions: [version, ...state.versions].slice(0, MAX_VERSIONS),
  };
}

export function restoreVersion(state: StudioHistoryState, versionId: string): StudioHistoryState | null {
  const version = state.versions.find((v) => v.id === versionId);
  if (!version) return null;
  return {
    past: [...state.past, state.present].slice(-MAX_UNDO),
    present: createSnapshot(version.design, version.musicSelection, version.galleryUrls, `Restored: ${version.label}`),
    future: [],
    versions: state.versions,
  };
}

const STORAGE_KEY = "celeventic-studio-versions";

export function persistVersionsToSession(orderId: string, versions: StudioSnapshot[]): void {
  try {
    const slim = versions.map((v) => ({
      id: v.id,
      label: v.label,
      at: v.at,
      design: v.design,
      musicSelection: v.musicSelection,
      galleryUrls: v.galleryUrls,
    }));
    sessionStorage.setItem(`${STORAGE_KEY}:${orderId}`, JSON.stringify(slim));
  } catch {
    /* quota / SSR */
  }
}

export function loadVersionsFromSession(orderId: string): StudioSnapshot[] {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}:${orderId}`);
    if (!raw) return [];
    return JSON.parse(raw) as StudioSnapshot[];
  } catch {
    return [];
  }
}
