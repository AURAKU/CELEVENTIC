import test from "node:test";
import assert from "node:assert/strict";
import {
  canCancelTicketOrder,
  canRefundTicketOrder,
  canTransferTicketOrder,
  refundReleasesInventory,
  isPendingReservationExpired,
  DEFAULT_TICKET_RESERVATION_TTL_MS,
} from "../lifecycle";

test("pending unpaid orders cancel without touching soldCount", () => {
  assert.equal(canCancelTicketOrder("PENDING"), true);
  assert.equal(canRefundTicketOrder("PENDING"), false);
  assert.equal(refundReleasesInventory("PENDING"), false);
});

test("paid unused orders can refund or transfer", () => {
  assert.equal(canRefundTicketOrder("PAID"), true);
  assert.equal(canTransferTicketOrder("PAID"), true);
  assert.equal(canCancelTicketOrder("PAID"), false);
  assert.equal(refundReleasesInventory("PAID"), true);
});

test("used or already closed orders cannot move", () => {
  for (const status of ["USED", "CANCELLED", "REFUNDED", "EXPIRED"]) {
    assert.equal(canCancelTicketOrder(status), false);
    assert.equal(canRefundTicketOrder(status), false);
    assert.equal(canTransferTicketOrder(status), false);
  }
});

test("pending reservations expire after the hold TTL", () => {
  const createdAt = new Date("2026-11-07T07:00:00.000Z");
  const stillValid = new Date(createdAt.getTime() + DEFAULT_TICKET_RESERVATION_TTL_MS - 1);
  const expired = new Date(createdAt.getTime() + DEFAULT_TICKET_RESERVATION_TTL_MS);
  assert.equal(isPendingReservationExpired(createdAt, stillValid, DEFAULT_TICKET_RESERVATION_TTL_MS), false);
  assert.equal(isPendingReservationExpired(createdAt, expired, DEFAULT_TICKET_RESERVATION_TTL_MS), true);
});
