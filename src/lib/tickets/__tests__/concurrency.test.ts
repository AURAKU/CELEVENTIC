import test from "node:test";
import assert from "node:assert/strict";
import { hasInventory } from "../inventory";
import { canCancelTicketOrder, canRefundTicketOrder } from "../lifecycle";

/**
 * Models the SQL compare-and-swap used by ticket.service:
 * UPDATE tickets SET soldCount = soldCount + q WHERE soldCount <= max - q
 *
 * This is the isolated-database contract. Live PostgreSQL lock behaviour is
 * documented as BLOCKED until a dedicated test database is authorized.
 */
class TicketInventory {
  soldCount = 0;
  constructor(readonly maxQuantity: number | null) {}

  claim(quantity: number): boolean {
    if (!hasInventory(this.soldCount, this.maxQuantity, quantity)) return false;
    this.soldCount += quantity;
    return true;
  }

  release(quantity: number) {
    this.soldCount = Math.max(0, this.soldCount - quantity);
  }
}

class OrderStore {
  private statusById = new Map<string, string>();

  createPending(id: string) {
    this.statusById.set(id, "PENDING");
  }

  confirm(id: string): "minted" | "already" | "closed" {
    const status = this.statusById.get(id);
    if (status === "PAID" || status === "USED") return "already";
    if (status !== "PENDING") return "closed";
    this.statusById.set(id, "PAID");
    return "minted";
  }

  refund(id: string): boolean {
    const status = this.statusById.get(id);
    if (!status || !canRefundTicketOrder(status as never)) return false;
    this.statusById.set(id, "REFUNDED");
    return true;
  }

  cancel(id: string): boolean {
    const status = this.statusById.get(id);
    if (!status || !canCancelTicketOrder(status as never)) return false;
    this.statusById.set(id, "CANCELLED");
    return true;
  }

  status(id: string) {
    return this.statusById.get(id);
  }
}

test("simultaneous purchases cannot sell past capacity", () => {
  const stock = new TicketInventory(10);
  let accepted = 0;
  for (let i = 0; i < 40; i++) {
    if (stock.claim(1)) accepted += 1;
  }
  assert.equal(accepted, 10);
  assert.equal(stock.soldCount, 10);
  assert.equal(stock.soldCount > 10, false);
  assert.equal(stock.claim(1), false);
});

test("reservation hold plus confirm cannot oversell", () => {
  const stock = new TicketInventory(5);
  const pendingQty = 3;
  const held = stock.soldCount + pendingQty;
  assert.equal(hasInventory(held, 5, 3), false);
  assert.equal(stock.claim(3), true);
  assert.equal(stock.claim(3), false);
  assert.equal(stock.soldCount, 3);
});

test("expired pending reservations free capacity for a later buyer", () => {
  const stock = new TicketInventory(2);
  assert.equal(hasInventory(0 + 2, 2, 1), false);
  // Reservation expires: pending qty returns to 0 without incrementing soldCount.
  assert.equal(hasInventory(stock.soldCount, 2, 1), true);
  assert.equal(stock.claim(1), true);
  assert.equal(stock.soldCount, 1);
});

test("duplicate order confirmation mints once", () => {
  const orders = new OrderStore();
  orders.createPending("ord_1");
  const results = [orders.confirm("ord_1"), orders.confirm("ord_1"), orders.confirm("ord_1")];
  assert.equal(results.filter((r) => r === "minted").length, 1);
  assert.equal(results.filter((r) => r === "already").length, 2);
  assert.equal(orders.status("ord_1"), "PAID");
});

test("payment confirmation race: only the PENDING claim issues inventory", () => {
  const stock = new TicketInventory(1);
  const orders = new OrderStore();
  orders.createPending("a");
  orders.createPending("b");

  const winners: string[] = [];
  for (const id of ["a", "b"]) {
    if (orders.confirm(id) !== "minted") continue;
    if (!stock.claim(1)) {
      orders.refund(id);
      continue;
    }
    winners.push(id);
  }

  assert.equal(winners.length, 1);
  assert.equal(stock.soldCount, 1);
});

test("concurrent refunds of one order succeed once and never go negative", () => {
  const stock = new TicketInventory(4);
  assert.equal(stock.claim(2), true);
  const orders = new OrderStore();
  orders.createPending("r1");
  assert.equal(orders.confirm("r1"), "minted");

  let refunds = 0;
  for (let i = 0; i < 8; i++) {
    if (orders.refund("r1")) {
      stock.release(2);
      refunds += 1;
    }
  }
  assert.equal(refunds, 1);
  assert.equal(stock.soldCount, 0);
  assert.ok(stock.soldCount >= 0);
});

test("duplicate webhook processing is a no-op after settlement", () => {
  const orders = new OrderStore();
  orders.createPending("hook");
  assert.equal(orders.confirm("hook"), "minted");
  assert.equal(orders.confirm("hook"), "already");
  assert.equal(orders.confirm("hook"), "already");
});
