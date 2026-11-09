import type { PaymentStatus } from "@prisma/client";

const TERMINAL: ReadonlySet<PaymentStatus> = new Set(["SUCCESSFUL", "REFUNDED"]);

/**
 * Settled payments stay settled. A late charge.failed must not un-confirm
 * tickets or reverse a wallet credit. Provider refunds are a separate path
 * and stay disabled for tickets.
 */
export function nextPaymentStatus(
  current: PaymentStatus,
  incoming: PaymentStatus
): PaymentStatus {
  if (current === incoming) return current;
  if (TERMINAL.has(current)) return current;
  return incoming;
}

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL.has(status);
}
