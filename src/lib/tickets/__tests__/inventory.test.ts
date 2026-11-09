import test from "node:test";
import assert from "node:assert/strict";
import { hasInventory, isClosedTicketOrder, isSettledTicketOrder, isUsedTicketOrder } from "../inventory";

test("unlimited inventory accepts any positive quantity", () => {
  assert.equal(hasInventory(0, null, 1), true);
  assert.equal(hasInventory(9000, undefined, 40), true);
});

test("capped inventory rejects oversell", () => {
  assert.equal(hasInventory(8, 10, 2), true);
  assert.equal(hasInventory(9, 10, 2), false);
  assert.equal(hasInventory(10, 10, 1), false);
});

test("quantity must be a positive integer-like amount", () => {
  assert.equal(hasInventory(0, 10, 0), false);
  assert.equal(hasInventory(0, 10, -1), false);
  assert.equal(hasInventory(0, 10, Number.NaN), false);
});

test("settled orders must not mint more tickets", () => {
  assert.equal(isSettledTicketOrder("PAID"), true);
  assert.equal(isSettledTicketOrder("USED"), true);
  assert.equal(isSettledTicketOrder("PENDING"), false);
});

test("closed orders are not confirmable", () => {
  assert.equal(isClosedTicketOrder("CANCELLED"), true);
  assert.equal(isClosedTicketOrder("REFUNDED"), true);
  assert.equal(isClosedTicketOrder("EXPIRED"), true);
  assert.equal(isClosedTicketOrder("PENDING"), false);
});

test("used tickets cannot be refunded through the paid path", () => {
  assert.equal(isUsedTicketOrder("USED"), true);
  assert.equal(isUsedTicketOrder("PAID"), false);
});
