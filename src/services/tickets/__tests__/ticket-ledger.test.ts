import test from "node:test";
import assert from "node:assert/strict";
import { EventWalletService } from "../../gifts/event-wallet.service";
import { createFakeLedgerClient } from "../../gifts/__tests__/fake-event-wallet-client";
import {
  paymentMatchesTicketOrder,
  postTicketRefund,
  postTicketSale,
  splitTicketRevenue,
} from "../ticket-ledger.service";

test("commission split uses integer minor units and never exceeds gross", () => {
  assert.deepEqual(splitTicketRevenue(10000, 5), { feeMinor: 500, netMinor: 9500 });
  assert.deepEqual(splitTicketRevenue(1, 5), { feeMinor: 0, netMinor: 1 });
  assert.deepEqual(splitTicketRevenue(10000, 0), { feeMinor: 0, netMinor: 10000 });
  assert.deepEqual(splitTicketRevenue(10000, 100), { feeMinor: 10000, netMinor: 0 });
});

test("a ticket sale posts balanced gross credit and commission debit", async () => {
  const { client, entries, accounts } = createFakeLedgerClient();

  const result = await postTicketSale(
    {
      eventId: "evt_t1",
      paymentId: "pay_1",
      orderId: "ord_1",
      grossMinor: 20000,
      commissionPercent: 5,
      reference: "ref_1",
    },
    client
  );

  assert.equal(result.alreadyApplied, false);
  assert.equal(result.feeMinor, 1000);
  assert.equal(result.netMinor, 19000);
  assert.equal(result.balanceMinor, 19000);
  assert.equal(entries.length, 2);
  assert.equal(entries.reduce((sum, e) => sum + e.amountMinor, 0), 19000);
  assert.equal(accounts.get("evt_t1:TICKET")?.lifetimeTicketGrossMinor, 20000);
  assert.equal(accounts.get("evt_t1:TICKET")?.lifetimeTicketCommissionMinor, 1000);
  assert.equal(accounts.get("evt_t1:GIFT"), undefined);
});

test("duplicate payment webhooks credit the ticket book once", async () => {
  const { client, entries } = createFakeLedgerClient();
  const input = {
    eventId: "evt_t2",
    paymentId: "pay_dup",
    grossMinor: 15000,
    commissionPercent: 5,
  };

  const first = await postTicketSale(input, client);
  const replays = await Promise.all([
    postTicketSale(input, client),
    postTicketSale(input, client),
    postTicketSale(input, client),
  ]);

  assert.equal(first.alreadyApplied, false);
  assert.ok(replays.every((r) => r.alreadyApplied));
  assert.equal(entries.length, 2);
  assert.equal(replays.at(-1)!.balanceMinor, 14250);
});

test("ticket refund reverses gross and commission without deleting sale rows", async () => {
  const { client, entries } = createFakeLedgerClient();
  await postTicketSale(
    { eventId: "evt_t3", paymentId: "pay_3", orderId: "ord_3", grossMinor: 10000, commissionPercent: 5 },
    client
  );

  const refund = await postTicketRefund(
    { eventId: "evt_t3", orderId: "ord_3", paymentId: "pay_3" },
    client
  );
  const replay = await postTicketRefund(
    { eventId: "evt_t3", orderId: "ord_3", paymentId: "pay_3" },
    client
  );

  assert.equal(refund.alreadyApplied, false);
  assert.equal(replay.alreadyApplied, true);
  assert.equal(entries.length, 4);
  assert.equal(entries.reduce((sum, e) => sum + e.amountMinor, 0), 0);
  assert.equal(refund.balanceMinor, 0);
});

test("gift credits and ticket credits never share a balance", async () => {
  const { client, accounts } = createFakeLedgerClient();
  const wallet = new EventWalletService();

  await wallet.postEntry(
    {
      eventId: "evt_mix",
      type: "GIFT_CREDIT",
      amountMinor: 50000,
      idempotencyKey: "gift_credit:mix",
    },
    client
  );
  await postTicketSale(
    { eventId: "evt_mix", paymentId: "pay_mix", grossMinor: 10000, commissionPercent: 5 },
    client
  );

  assert.equal(accounts.get("evt_mix:GIFT")?.balanceMinor, 50000);
  assert.equal(accounts.get("evt_mix:TICKET")?.balanceMinor, 9500);
});

test("payment must match order amount and currency", () => {
  const ok = paymentMatchesTicketOrder({
    orderAmount: "120.00",
    orderCurrency: "GHS",
    paymentAmount: "120.00",
    paymentCurrency: "ghs",
  });
  assert.equal(ok.ok, true);

  const amount = paymentMatchesTicketOrder({
    orderAmount: "120.00",
    orderCurrency: "GHS",
    paymentAmount: "100.00",
    paymentCurrency: "GHS",
  });
  assert.equal(amount.ok, false);

  const currency = paymentMatchesTicketOrder({
    orderAmount: "120.00",
    orderCurrency: "GHS",
    paymentAmount: "120.00",
    paymentCurrency: "NGN",
  });
  assert.equal(currency.ok, false);
});
