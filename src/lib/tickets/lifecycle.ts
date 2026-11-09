/** Order lifecycle rules. Inventory is only decremented when a paid order is reversed. */

export const DEFAULT_TICKET_RESERVATION_TTL_MS = 15 * 60 * 1000;

export function ticketReservationTtlMs(): number {
  const raw = process.env.TICKET_RESERVATION_TTL_MS;
  if (raw == null || raw.trim() === "") return DEFAULT_TICKET_RESERVATION_TTL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_TICKET_RESERVATION_TTL_MS;
  return parsed;
}

export function isPendingReservationExpired(
  createdAt: Date,
  now: Date = new Date(),
  ttlMs: number = ticketReservationTtlMs()
): boolean {
  return createdAt.getTime() + ttlMs <= now.getTime();
}

export function canCancelTicketOrder(status: string): boolean {
  return status === "PENDING";
}

export function canRefundTicketOrder(status: string): boolean {
  return status === "PAID";
}

export function canTransferTicketOrder(status: string): boolean {
  return status === "PAID";
}

export function refundReleasesInventory(status: string): boolean {
  return status === "PAID";
}
