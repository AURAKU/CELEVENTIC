"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Temporary form draft persistence.
 *
 * Storage choice: **localStorage** by default so drafts survive refresh and
 * browser restarts (create-event wizards, invitation details, thank-you copy).
 * Pass `storage: "session"` when a draft should die with the tab.
 *
 * This is client-only — it does not write to the database. Studio canvases
 * that already autosave to the server should keep using `useStudioAutosave`.
 */

export type FormDraftStatus = "idle" | "restored" | "dirty" | "saved" | "cleared";

export type FormDraftStorage = "local" | "session";

const STORAGE_PREFIX = "celeventic:form-draft:v1:";

/** Never persist secrets / payment fields even if the form includes them. */
const SENSITIVE_KEY_RE =
  /password|passwd|secret|token|api[_-]?key|cardNumber|card_number|cvv|cvc|ssn|pin|otp|payment|creditCard/i;

export interface FormDraftKeyParts {
  formId: string;
  userId?: string | null;
  eventId?: string | null;
  orderId?: string | null;
}

export interface UseFormDraftOptions<T extends Record<string, unknown>> extends FormDraftKeyParts {
  /** Current form values — watched and debounced to storage. */
  value: T;
  /** When false, no restore/save runs (use after server hydrate). Default true. */
  enabled?: boolean;
  debounceMs?: number;
  /** Prefer localStorage for cross-refresh; session for tab-scoped drafts. */
  storage?: FormDraftStorage;
  /** Extra keys to strip before persist (beyond built-in sensitive patterns). */
  omitKeys?: readonly (keyof T & string)[];
  /** If true (default), wipe storage when the sanitized value is empty. */
  clearWhenEmpty?: boolean;
  /** Custom emptiness check. Defaults to blank strings / empty arrays. */
  isEmpty?: (value: T) => boolean;
  /**
   * When true (default), load + call onRestore once on mount (when enabled).
   * Set false and call `load()` yourself when you merge with server data.
   */
  restoreOnMount?: boolean;
  onRestore?: (draft: T) => void;
}

export interface UseFormDraftResult<T extends Record<string, unknown>> {
  status: FormDraftStatus;
  lastSavedAt: Date | null;
  hasDraft: boolean;
  wasRestored: boolean;
  storageKey: string;
  /** Imperative load (null if missing / corrupt). */
  load: () => T | null;
  /** Imperative save (respects omit/empty rules). */
  save: (next?: T) => void;
  /** Discard draft from storage. Does not reset React state. */
  clear: () => void;
  /** Alias for clear — discard temporary draft. */
  clearDraft: () => void;
}

interface StoredEnvelope {
  v: 1;
  savedAt: string;
  data: Record<string, unknown>;
}

export function buildFormDraftKey(parts: FormDraftKeyParts): string {
  return [
    STORAGE_PREFIX,
    parts.formId,
    parts.userId?.trim() || "anon",
    parts.eventId?.trim() || "none",
    parts.orderId?.trim() || "none",
  ].join(":");
}

function getStore(kind: FormDraftStorage): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function sanitizeFormDraft<T extends Record<string, unknown>>(
  value: T,
  omitKeys: readonly string[] = []
): Record<string, unknown> {
  const omit = new Set(omitKeys);
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (omit.has(key) || SENSITIVE_KEY_RE.test(key)) continue;
    out[key] = raw;
  }
  return out;
}

/**
 * Treat booleans / known defaults as non-content so empty wizards wipe drafts.
 * Pass `ignoreKeys` for fields that always have a default (e.g. pricingType).
 */
export function isBlankFormDraft(
  value: Record<string, unknown>,
  ignoreKeys: readonly string[] = []
): boolean {
  const ignore = new Set(ignoreKeys);
  return Object.entries(value).every(([key, raw]) => {
    if (ignore.has(key) || SENSITIVE_KEY_RE.test(key)) return true;
    if (raw == null) return true;
    if (typeof raw === "boolean") return true;
    if (typeof raw === "number") return Number.isNaN(raw);
    if (typeof raw === "string") return raw.trim() === "";
    if (Array.isArray(raw)) return raw.length === 0;
    if (typeof raw === "object") return Object.keys(raw as object).length === 0;
    return false;
  });
}

function readEnvelope(store: Storage, key: string): StoredEnvelope | null {
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEnvelope;
    if (!parsed || parsed.v !== 1 || typeof parsed.data !== "object" || !parsed.data) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeEnvelope(store: Storage, key: string, data: Record<string, unknown>): void {
  const envelope: StoredEnvelope = {
    v: 1,
    savedAt: new Date().toISOString(),
    data,
  };
  store.setItem(key, JSON.stringify(envelope));
}

/** Synchronous draft read for server-merge flows (invitation details, event edit). */
export function readFormDraft<T extends Record<string, unknown>>(
  parts: FormDraftKeyParts,
  storage: FormDraftStorage = "local"
): T | null {
  const store = getStore(storage);
  if (!store) return null;
  const envelope = readEnvelope(store, buildFormDraftKey(parts));
  if (!envelope) return null;
  return envelope.data as T;
}

/** Remove a draft without needing the hook instance. */
export function clearFormDraft(
  parts: FormDraftKeyParts,
  storage: FormDraftStorage = "local"
): void {
  const store = getStore(storage);
  try {
    store?.removeItem(buildFormDraftKey(parts));
  } catch {
    /* ignore */
  }
}

/**
 * Debounced local/session draft autosave for typed forms.
 * Restore on return, continue editing, clear completely via `clearDraft`.
 */
export function useFormDraft<T extends Record<string, unknown>>({
  formId,
  userId,
  eventId,
  orderId,
  value,
  enabled = true,
  debounceMs = 400,
  storage = "local",
  omitKeys = [],
  clearWhenEmpty = true,
  isEmpty,
  restoreOnMount = true,
  onRestore,
}: UseFormDraftOptions<T>): UseFormDraftResult<T> {
  const storageKey = buildFormDraftKey({ formId, userId, eventId, orderId });
  const [status, setStatus] = useState<FormDraftStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [wasRestored, setWasRestored] = useState(false);

  const valueRef = useRef(value);
  valueRef.current = value;
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const omitRef = useRef(omitKeys);
  omitRef.current = omitKeys;
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredOnceRef = useRef(false);
  const lastSerializedRef = useRef<string | null>(null);
  const skipNextSaveRef = useRef(false);

  const checkEmpty = useCallback((data: Record<string, unknown>) => {
    if (isEmptyRef.current) return isEmptyRef.current(data as T);
    return isBlankFormDraft(data);
  }, []);

  const load = useCallback((): T | null => {
    const store = getStore(storage);
    if (!store) return null;
    const envelope = readEnvelope(store, storageKey);
    if (!envelope) return null;
    return envelope.data as T;
  }, [storage, storageKey]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const store = getStore(storage);
    try {
      store?.removeItem(storageKey);
    } catch {
      /* quota / privacy mode */
    }
    lastSerializedRef.current = null;
    skipNextSaveRef.current = true;
    setHasDraft(false);
    setLastSavedAt(null);
    setStatus("cleared");
    setWasRestored(false);
  }, [storage, storageKey]);

  const save = useCallback(
    (next?: T) => {
      const store = getStore(storage);
      if (!store) return;

      const source = next ?? valueRef.current;
      const sanitized = sanitizeFormDraft(source, omitRef.current as readonly string[]);
      const serialized = JSON.stringify(sanitized);

      if (clearWhenEmpty && checkEmpty(sanitized)) {
        try {
          store.removeItem(storageKey);
        } catch {
          /* ignore */
        }
        lastSerializedRef.current = null;
        setHasDraft(false);
        setLastSavedAt(null);
        setStatus((s) => (s === "restored" ? "cleared" : "cleared"));
        return;
      }

      if (serialized === lastSerializedRef.current) {
        setStatus((s) => (s === "dirty" ? "saved" : s));
        return;
      }

      try {
        writeEnvelope(store, storageKey, sanitized);
        lastSerializedRef.current = serialized;
        setHasDraft(true);
        setLastSavedAt(new Date());
        setStatus("saved");
      } catch {
        /* QuotaExceeded or private mode — fail silent */
      }
    },
    [storage, storageKey, clearWhenEmpty, checkEmpty]
  );

  // When key changes (user/event switch), reset restore/save baseline first.
  useEffect(() => {
    restoredOnceRef.current = false;
    lastSerializedRef.current = null;
    setWasRestored(false);
    setStatus("idle");
  }, [storageKey]);

  // Restore once when enabled
  useEffect(() => {
    if (!enabled || !restoreOnMount || restoredOnceRef.current) return;
    restoredOnceRef.current = true;

    const store = getStore(storage);
    if (!store) return;

    const envelope = readEnvelope(store, storageKey);
    if (!envelope) {
      setHasDraft(false);
      return;
    }

    if (checkEmpty(envelope.data)) {
      try {
        store.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      setHasDraft(false);
      return;
    }

    lastSerializedRef.current = JSON.stringify(envelope.data);
    setHasDraft(true);
    setWasRestored(true);
    setStatus("restored");
    if (envelope.savedAt) {
      const at = new Date(envelope.savedAt);
      if (!Number.isNaN(at.getTime())) setLastSavedAt(at);
    }
    onRestoreRef.current?.(envelope.data as T);
  }, [enabled, restoreOnMount, storage, storageKey, checkEmpty]);

  // Seed baseline when enabling without restore (server-hydrated forms)
  // so we don't immediately persist unchanged server data as a "draft".
  useEffect(() => {
    if (!enabled) return;
    if (lastSerializedRef.current !== null) return;

    const store = getStore(storage);
    const envelope = store ? readEnvelope(store, storageKey) : null;
    if (envelope && !checkEmpty(envelope.data)) {
      lastSerializedRef.current = JSON.stringify(envelope.data);
      setHasDraft(true);
      if (envelope.savedAt) {
        const at = new Date(envelope.savedAt);
        if (!Number.isNaN(at.getTime())) setLastSavedAt(at);
      }
      return;
    }

    const sanitized = sanitizeFormDraft(valueRef.current, omitRef.current as readonly string[]);
    lastSerializedRef.current = JSON.stringify(sanitized);
  }, [enabled, storage, storageKey, checkEmpty]);

  // Debounced autosave
  useEffect(() => {
    if (!enabled) return;

    const sanitized = sanitizeFormDraft(value, omitKeys as readonly string[]);
    const serialized = JSON.stringify(sanitized);

    // After clearDraft + setForm(reset), accept the next value as baseline (no write).
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      lastSerializedRef.current = serialized;
      return;
    }

    if (serialized === lastSerializedRef.current) return;

    if (clearWhenEmpty && checkEmpty(sanitized)) {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Immediate wipe when user clears the form completely
      const store = getStore(storage);
      try {
        store?.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      lastSerializedRef.current = null;
      setHasDraft(false);
      setLastSavedAt(null);
      setStatus("cleared");
      return;
    }

    setStatus((s) => (s === "restored" || s === "saved" || s === "idle" || s === "cleared" ? "dirty" : s));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      save(value);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, debounceMs, omitKeys, clearWhenEmpty, checkEmpty, save, storage, storageKey]);

  return {
    status,
    lastSavedAt,
    hasDraft,
    wasRestored,
    storageKey,
    load,
    save,
    clear,
    clearDraft: clear,
  };
}
