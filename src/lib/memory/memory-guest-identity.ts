/**
 * Client-safe Memory Vault identity helpers (no Node.js builtins).
 * Server hashing lives in `memory-guest-identity-crypto.ts`.
 */

export const MEMORY_GUEST_KEY_STORAGE = "celeventic.memory.guestKey";
export const MEMORY_CONSENT_STORAGE_PREFIX = "celeventic.memory.consent.";
export const MEMORY_COMMENT_TOKENS_STORAGE = "celeventic.memory.commentTokens";

/** Client helpers — safe to import from "use client" modules. */
export function readOrCreateClientGuestKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(MEMORY_GUEST_KEY_STORAGE);
    if (existing && existing.length >= 16) return existing;
    const next = crypto.getRandomValues(new Uint8Array(24));
    const raw = Array.from(next, (b) => b.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(MEMORY_GUEST_KEY_STORAGE, raw);
    return raw;
  } catch {
    return `anon-${Date.now()}`;
  }
}

export function consentStorageKey(token: string): string {
  return `${MEMORY_CONSENT_STORAGE_PREFIX}${token}`;
}

export function readLocalConsent(token: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(consentStorageKey(token)) === "1";
  } catch {
    return false;
  }
}

export function writeLocalConsent(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(consentStorageKey(token), "1");
  } catch {
    /* ignore quota */
  }
}

export function readOwnedCommentTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MEMORY_COMMENT_TOKENS_STORAGE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeOwnedCommentToken(commentId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readOwnedCommentTokens(), [commentId]: token };
    window.localStorage.setItem(MEMORY_COMMENT_TOKENS_STORAGE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function removeOwnedCommentToken(commentId: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readOwnedCommentTokens() };
    delete next[commentId];
    window.localStorage.setItem(MEMORY_COMMENT_TOKENS_STORAGE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
