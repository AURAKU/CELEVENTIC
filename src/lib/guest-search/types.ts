import type { GuestPartyType, GuestStatus, InvitationStatus } from "@prisma/client";
import type { MatchField } from "./query";

/**
 * The shape a search result takes on the wire.
 *
 * Invitation-centric, not guest-centric: an organiser searching "Obuah" wants
 * the *invitation* — its link, its allowance, its pass — not three guest rows
 * that happen to share a surname. Named party members ride along on the card.
 */

export interface SearchResultMember {
  id: string;
  name: string;
  /** True once this person has been ticked through the gate. */
  admitted: boolean;
}

export interface SearchResultCard {
  invitationId: string;
  /** Primary guest row, when the invitation has one. */
  guestId: string | null;
  name: string;
  status: InvitationStatus;
  guestStatus: GuestStatus | null;
  partyType: GuestPartyType;
  /** Heads this invitation admits. */
  partySize: number;
  /** Heads already through the gate. */
  admittedCount: number;
  email: string | null;
  phone: string | null;
  /** Guest Entry Pass admission code (4 or 6 digits), when a pass is issued. */
  admissionCode: string | null;
  /** Legacy per-guest gate code. */
  manualCode: string | null;
  tableNumber: string | null;
  seatLabel: string | null;
  members: SearchResultMember[];
  /** Absolute, shareable personal link. */
  inviteUrl: string;
  /** Relative path for in-app navigation. */
  invitePath: string;
  isGeneralPass: boolean;
  archivedAt: string | null;
  /** True when the pass has been revoked but the invitation still exists. */
  passRevoked: boolean;
  createdAt: string;
  updatedAt: string;
  /** Why this row matched, for the "matched table 12" line. */
  matchedField: MatchField;
  matchReason: string;
  /** Relevance score, exposed so the UI can group "exact" above "also found". */
  score: number;
  /**
   * Private organizer CRM relationship tags (family/friends/etc).
   * Never sent to guest-facing invitation surfaces.
   */
  tags: GuestTagSummary[];
}

/** Organizer-only chip shown on Guest CRM cards. */
export interface GuestTagSummary {
  id: string;
  label: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResultCard[];
  /** Total matches found before the limit was applied. */
  total: number;
  /** 1-based page for browse mode. */
  page?: number;
  /** Total pages for browse mode. */
  pages?: number;
  /** Page size used for this response. */
  limit?: number;
  /** True when ranking ran against a truncated candidate set. */
  truncated: boolean;
  /** Milliseconds spent server-side, surfaced in the UI in dev. */
  tookMs: number;
}

/** Detail returned after a quick create, enough to render the success card. */
export interface QuickInviteResult {
  invitationId: string;
  guestId: string;
  name: string;
  partySize: number;
  partyType: GuestPartyType;
  status: InvitationStatus;
  inviteUrl: string;
  invitePath: string;
  admissionCode: string | null;
  manualCode: string | null;
  /** Endpoint that renders this invitation's QR as an image. */
  qrImageUrl: string;
  placeCardEnabled: boolean;
  entryPassEnabled: boolean;
}

export interface DuplicateWarning {
  kind: "guest" | "invitation";
  id: string;
  name: string;
  message: string;
}

export interface QuickInvitePreview {
  displayName: string;
  partyType: GuestPartyType;
  partySize: number;
  allowanceConfirmed: boolean;
  memberNames: string[];
  hint: string | null;
  /** Phone as it will be stored, when normalisation changed it. */
  normalizedPhone: string | null;
  phoneWarning: string | null;
  emailWarning: string | null;
  duplicates: DuplicateWarning[];
}
