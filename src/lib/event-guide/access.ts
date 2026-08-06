/**
 * Event Guide availability gating.
 *
 * Pure decision function so token isolation and the draft-is-never-public rule
 * are unit-testable without a database. Every rejection carries a reason that
 * maps to polished guest copy — a guest never sees a bare 404 or a 500.
 */

import type { GuideUnavailableReason } from "./types";

export interface GuideLinkState {
  type: string;
  status: string;
  eventId: string;
  expiresAt: Date | string | null;
}

export interface GuideRecordState {
  eventId: string;
  enabled: boolean;
  status: string;
  publishedVersion: number | null;
}

export type GuideAvailability =
  | { available: true }
  | { available: false; reason: GuideUnavailableReason };

const OFFLINE_LINK_TYPE = "EVENT_GUIDE_OFFLINE";
const ONLINE_LINK_TYPE = "EVENT_GUIDE";

export function evaluateGuideAvailability(input: {
  link: GuideLinkState | null;
  guide: GuideRecordState | null;
  eventStatus: string | null;
  now?: Date;
}): GuideAvailability {
  const { link, guide } = input;
  const now = input.now ?? new Date();

  if (!link) return { available: false, reason: "NOT_FOUND" };

  // An offline pack token must never resolve on the public domain, and a
  // programme/menu/seat token must never open the guide.
  if (link.type !== ONLINE_LINK_TYPE) {
    return {
      available: false,
      reason: link.type === OFFLINE_LINK_TYPE ? "NOT_FOUND" : "WRONG_TYPE",
    };
  }

  if (link.status === "REVOKED") return { available: false, reason: "REVOKED" };
  if (link.status === "DISABLED") return { available: false, reason: "DISABLED" };
  if (link.status === "EXPIRED") return { available: false, reason: "EXPIRED" };
  if (link.status !== "ACTIVE") return { available: false, reason: "DISABLED" };

  if (link.expiresAt) {
    const expiry = link.expiresAt instanceof Date ? link.expiresAt : new Date(link.expiresAt);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= now.getTime()) {
      return { available: false, reason: "EXPIRED" };
    }
  }

  if (input.eventStatus === "CANCELLED") {
    return { available: false, reason: "EVENT_CANCELLED" };
  }

  if (!guide) return { available: false, reason: "NOT_ENABLED" };

  // A token belonging to one event can never render another event's guide.
  if (guide.eventId !== link.eventId) return { available: false, reason: "NOT_FOUND" };

  if (!guide.enabled) return { available: false, reason: "NOT_ENABLED" };
  if (guide.status !== "PUBLISHED" || guide.publishedVersion === null) {
    return { available: false, reason: "NOT_PUBLISHED" };
  }

  return { available: true };
}

/**
 * Revoked/unpublished must be distinguishable from "never existed" by the
 * service worker so it knows to purge its cache — but only for tokens that were
 * genuinely retired, never for a random guessed string.
 */
export function shouldPurgeOfflineCache(reason: GuideUnavailableReason): boolean {
  return (
    reason === "REVOKED" ||
    reason === "EXPIRED" ||
    reason === "DISABLED" ||
    reason === "NOT_ENABLED" ||
    reason === "NOT_PUBLISHED" ||
    reason === "EVENT_CANCELLED"
  );
}

export function unavailableHttpStatus(reason: GuideUnavailableReason): number {
  return shouldPurgeOfflineCache(reason) ? 410 : 404;
}
