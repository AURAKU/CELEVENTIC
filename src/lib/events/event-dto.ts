/**
 * Field-level filtering for event API responses.
 *
 * GET /api/events/[id] is a general event document. Guest CRM, invitation
 * bearer links, QR tokens and gate codes belong on permissioned endpoints.
 */

export const EVENT_RESPONSE_FORBIDDEN_KEYS = [
  "qrToken",
  "manualCode",
  "uniqueLink",
  "guests",
] as const;

export type EventGetActor =
  | { kind: "anonymous" }
  | { kind: "guest" }
  | { kind: "unauthorized" }
  | { kind: "member"; canManageGuests: boolean };

export function eventGetStatus(actor: EventGetActor): 401 | 403 | 200 {
  if (actor.kind === "anonymous" || actor.kind === "guest") return 401;
  if (actor.kind === "unauthorized") return 403;
  return 200;
}

export function stripTicketSecrets<T extends { qrToken?: unknown }>(ticket: T): Omit<T, "qrToken"> {
  const { qrToken: _qrToken, ...rest } = ticket;
  return rest;
}

export function stripInvitationSecrets<T extends { uniqueLink?: unknown }>(
  invitation: T
): Omit<T, "uniqueLink"> {
  const { uniqueLink: _uniqueLink, ...rest } = invitation;
  return rest;
}

export function toGuestDirectoryRecord<T extends Record<string, unknown>>(guest: T) {
  const {
    qrToken: _qrToken,
    manualCode: _manualCode,
    invitation,
    ...rest
  } = guest as T & {
    qrToken?: unknown;
    manualCode?: unknown;
    invitation?: Record<string, unknown> | null;
  };

  let safeInvitation: Record<string, unknown> | null = null;
  if (invitation && typeof invitation === "object") {
    const { uniqueLink: _uniqueLink, qrToken: _invQr, ...inviteRest } = invitation;
    safeInvitation = inviteRest;
  }

  return { ...rest, invitation: safeInvitation };
}

export function toEventApiResponse(event: Record<string, unknown>) {
  const {
    guests: _guests,
    invitations: _invitations,
    tickets,
    _count,
    ...rest
  } = event as {
    guests?: unknown;
    invitations?: unknown[];
    tickets?: Array<Record<string, unknown> & { qrToken?: unknown }>;
    _count?: { guests?: number; invitations?: number; tickets?: number; qrScans?: number };
  };

  const counts = _count ?? {};
  return {
    ...rest,
    _count: counts,
    tickets: (tickets ?? []).map((ticket) => stripTicketSecrets(ticket)),
    guestCount: counts.guests ?? 0,
    invitationCount: counts.invitations ?? 0,
  };
}

export function payloadContainsForbiddenEventFields(payload: unknown): string[] {
  const found = new Set<string>();
  const visit = (value: unknown, path: string) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === "guests" && Array.isArray(child)) found.add("guests");
      if (key === "qrToken" && child != null && child !== "") found.add("qrToken");
      if (key === "manualCode" && child != null && child !== "") found.add("manualCode");
      if (key === "uniqueLink" && child != null && child !== "") found.add("uniqueLink");
      visit(child, path ? `${path}.${key}` : key);
    }
  };
  visit(payload, "");
  return [...found];
}
