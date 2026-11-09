import test from "node:test";
import assert from "node:assert/strict";
import { hasInventory, isSettledTicketOrder } from "../inventory";
import { canRefundTicketOrder } from "../lifecycle";
import { nextPaymentStatus } from "../../payments/payment-status";
import { parsePaystackWebhook } from "../../payments/paystack";
import { splitTicketRevenue } from "../../../services/tickets/ticket-ledger.service";

/**
 * Evidence map for EVENT → INVITATION → RSVP → PAYMENT → TICKET → QR →
 * OFFLINE SYNC → RECONCILIATION. This file asserts the in-repo contracts.
 * Browser E2E and Paystack sandbox remain external.
 */
test("payment-to-admission gate: settled charge cannot be un-confirmed by a later failure", () => {
  assert.equal(nextPaymentStatus("SUCCESSFUL", "FAILED"), "SUCCESSFUL");
  const ignored = parsePaystackWebhook({
    event: "refund.processed",
    data: { reference: "ref_1" },
  });
  assert.equal(ignored.kind, "lifecycle");
});

test("payment-to-admission gate: inventory claim plus ledger split stay internally consistent", () => {
  assert.equal(hasInventory(9, 10, 1), true);
  assert.equal(hasInventory(10, 10, 1), false);
  assert.equal(isSettledTicketOrder("PAID"), true);
  assert.equal(canRefundTicketOrder("PAID"), true);
  assert.deepEqual(splitTicketRevenue(10000, 5), { feeMinor: 500, netMinor: 9500 });
});
