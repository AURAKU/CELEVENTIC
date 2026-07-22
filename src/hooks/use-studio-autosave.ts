"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StudioSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface UseStudioAutosaveOptions<T> {
  value: T;
  enabled: boolean;
  debounceMs?: number;
  save: (value: T) => Promise<void>;
  /** Serialize for dirty detection; defaults to JSON.stringify */
  serialize?: (value: T) => string;
}

/**
 * Debounced auto-save for studio drafts. Does not navigate — save-only.
 */
export function useStudioAutosave<T>({
  value,
  enabled,
  debounceMs = 1800,
  save,
  serialize = (v) => JSON.stringify(v),
}: UseStudioAutosaveOptions<T>) {
  const [status, setStatus] = useState<StudioSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastSavedSerialized = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const latestValue = useRef(value);
  latestValue.current = value;

  const markBaseline = useCallback(
    (v: T) => {
      lastSavedSerialized.current = serialize(v);
      setStatus("saved");
      setLastSavedAt(new Date());
    },
    [serialize]
  );

  const flush = useCallback(async () => {
    if (!enabled || inFlight.current) return;
    const current = latestValue.current;
    const serialized = serialize(current);
    if (serialized === lastSavedSerialized.current) {
      setStatus((s) => (s === "dirty" ? "saved" : s));
      return;
    }
    inFlight.current = true;
    setStatus("saving");
    try {
      await save(current);
      lastSavedSerialized.current = serialized;
      setLastSavedAt(new Date());
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [enabled, save, serialize]);

  useEffect(() => {
    if (!enabled) return;
    if (lastSavedSerialized.current === null) {
      lastSavedSerialized.current = serialize(value);
      setStatus("idle");
      return;
    }
    if (serialize(value) === lastSavedSerialized.current) return;

    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, debounceMs, flush, serialize]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await flush();
  }, [flush]);

  return { status, lastSavedAt, saveNow, markBaseline, flush };
}
