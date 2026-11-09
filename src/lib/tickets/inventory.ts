/** Pure inventory rules used by TicketService. Safe to unit-test without Prisma. */

export function hasInventory(
  soldCount: number,
  maxQuantity: number | null | undefined,
  quantity: number
): boolean {
  if (!Number.isFinite(quantity) || quantity < 1) return false;
  if (maxQuantity == null) return true;
  return soldCount + quantity <= maxQuantity;
}

export function isSettledTicketOrder(status: string): boolean {
  return status === "PAID" || status === "USED";
}

export function isClosedTicketOrder(status: string): boolean {
  return status === "CANCELLED" || status === "REFUNDED" || status === "EXPIRED";
}

export function isUsedTicketOrder(status: string): boolean {
  return status === "USED";
}
