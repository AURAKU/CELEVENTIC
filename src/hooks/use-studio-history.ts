"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSnapshot,
  loadVersionsFromSession,
  persistVersionsToSession,
  type StudioSnapshot,
} from "@/lib/invitation-studio/studio-history";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import type { MusicSelection } from "@/lib/music/music-types";

const MAX_STACK = 40;
const MAX_VERSIONS = 12;

export interface StudioHistoryValue {
  design: InvitationDesignConfig;
  musicSelection: MusicSelection | null;
  galleryUrls: string[];
}

/**
 * Local undo/redo + named version checkpoints for Invitation Studio.
 * Versions persist in sessionStorage per orderId (no schema migration).
 */
export function useStudioHistory(initial: StudioHistoryValue | null, orderId?: string) {
  const [present, setPresent] = useState<StudioHistoryValue | null>(initial);
  const pastRef = useRef<StudioHistoryValue[]>([]);
  const futureRef = useRef<StudioHistoryValue[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [versions, setVersions] = useState<StudioSnapshot[]>([]);
  const skipPushRef = useRef(false);

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  useEffect(() => {
    if (!orderId) return;
    setVersions(loadVersionsFromSession(orderId));
  }, [orderId]);

  useEffect(() => {
    if (!orderId || versions.length === 0) return;
    persistVersionsToSession(orderId, versions);
  }, [orderId, versions]);

  const reset = useCallback(
    (value: StudioHistoryValue) => {
      pastRef.current = [];
      futureRef.current = [];
      setPresent(value);
      syncFlags();
    },
    [syncFlags]
  );

  const commit = useCallback(
    (
      next: StudioHistoryValue | ((prev: StudioHistoryValue | null) => StudioHistoryValue),
      options?: { recordHistory?: boolean }
    ) => {
      setPresent((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        const record = options?.recordHistory !== false && !skipPushRef.current && prev;
        if (record && prev) {
          try {
            if (JSON.stringify(prev) !== JSON.stringify(resolved)) {
              pastRef.current = [...pastRef.current, prev].slice(-MAX_STACK);
              futureRef.current = [];
            }
          } catch {
            pastRef.current = [...pastRef.current, prev].slice(-MAX_STACK);
            futureRef.current = [];
          }
        }
        skipPushRef.current = false;
        queueMicrotask(syncFlags);
        return resolved;
      });
    },
    [syncFlags]
  );

  const undo = useCallback(() => {
    setPresent((prev) => {
      const past = pastRef.current;
      if (!prev || past.length === 0) return prev;
      const previous = past[past.length - 1];
      pastRef.current = past.slice(0, -1);
      futureRef.current = [prev, ...futureRef.current].slice(0, MAX_STACK);
      queueMicrotask(syncFlags);
      return previous;
    });
  }, [syncFlags]);

  const redo = useCallback(() => {
    setPresent((prev) => {
      const future = futureRef.current;
      if (!prev || future.length === 0) return prev;
      const next = future[0];
      futureRef.current = future.slice(1);
      pastRef.current = [...pastRef.current, prev].slice(-MAX_STACK);
      queueMicrotask(syncFlags);
      return next;
    });
  }, [syncFlags]);

  const saveNamedVersion = useCallback(
    (label?: string) => {
      if (!present) return;
      const snap = createSnapshot(
        present.design,
        present.musicSelection,
        present.galleryUrls,
        label?.trim() || `Revision ${new Date().toLocaleString()}`
      );
      setVersions((prev) => [snap, ...prev].slice(0, MAX_VERSIONS));
    },
    [present]
  );

  const restoreVersion = useCallback(
    (versionId: string) => {
      const version = versions.find((v) => v.id === versionId);
      if (!version || !present) return;
      pastRef.current = [...pastRef.current, present].slice(-MAX_STACK);
      futureRef.current = [];
      setPresent({
        design: structuredClone(version.design),
        musicSelection: version.musicSelection
          ? structuredClone(version.musicSelection)
          : null,
        galleryUrls: [...version.galleryUrls],
      });
      syncFlags();
    },
    [versions, present, syncFlags]
  );

  return {
    present,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    versions,
    saveNamedVersion,
    restoreVersion,
  };
}
