import test from "node:test";
import assert from "node:assert/strict";

import { EventWalletService } from "../event-wallet.service";
import { createFakeLedgerClient as createFakeClient } from "./fake-event-wallet-client";

const service = new EventWalletService();

test("a gift credit appends one entry and rolls the balance forward", async () => {
  const { client, entries } = createFakeClient();

  const result = await service.postEntry(
    {
      eventId: "evt_1",
      type: "GIFT_CREDIT",
      amountMinor: 10000,
      idempotencyKey: "gift_credit:gift_1",
      giftPaymentId: "gift_1",
    },
    client
  );

  assert.equal(result.alreadyApplied, false);
  assert.equal(result.account.balanceMinor, 10000);
  assert.equal(result.account.availableMinor, 10000);
  assert.equal(result.account.lifetimeGiftMinor, 10000);
  assert.equal(result.account.giftCount, 1);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].direction, "CREDIT");
  assert.equal(entries[0].balanceAfterMinor, 10000);
});

test("a replayed webhook credits the wallet exactly once", async () => {
  const { client, entries } = createFakeClient();
  const input = {
    eventId: "evt_1",
    type: "GIFT_CREDIT" as const,
    amountMinor: 25000,
    idempotencyKey: "gift_credit:gift_replay",
    giftPaymentId: "gift_replay",
  };

  const first = await service.postEntry(input, client);
  // Paystack retries a delivery five times; the wallet must not move again.
  const replays = [];
  for (let i = 0; i < 5; i++) replays.push(await service.postEntry(input, client));

  assert.equal(first.alreadyApplied, false);
  assert.ok(replays.every((r) => r.alreadyApplied));
  assert.ok(replays.every((r) => r.entry.id === first.entry.id));
  assert.equal(entries.length, 1);
  assert.equal(replays.at(-1)!.account.balanceMinor, 25000);
  assert.equal(replays.at(-1)!.account.giftCount, 1);
});

test("concurrent fulfilment paths converge on a single credit", async () => {
  const { client, entries } = createFakeClient();
  const input = {
    eventId: "evt_1",
    type: "GIFT_CREDIT" as const,
    amountMinor: 5000,
    idempotencyKey: "gift_credit:gift_race",
  };

  // Webhook, guest poll and organiser reconcile all arrive at once.
  const results = await Promise.all([
    service.postEntry({ ...input, source: "payment_webhook" }, client),
    service.postEntry({ ...input, source: "guest_verify" }, client),
    service.postEntry({ ...input, source: "organiser_verify" }, client),
  ]);

  assert.equal(entries.length, 1);
  assert.equal(results.filter((r) => !r.alreadyApplied).length, 1);
});

test("a reversal is a compensating entry, never a deletion", async () => {
  const { client, entries } = createFakeClient();

  const credit = await service.postEntry(
    {
      eventId: "evt_1",
      type: "GIFT_CREDIT",
      amountMinor: 30000,
      idempotencyKey: "gift_credit:gift_2",
      giftPaymentId: "gift_2",
    },
    client
  );

  const reversal = await service.postEntry(
    {
      eventId: "evt_1",
      type: "GIFT_REVERSAL",
      amountMinor: -30000,
      idempotencyKey: "gift_reversal:gift_2",
      giftPaymentId: "gift_2",
      relatedEntryId: credit.entry.id,
    },
    client
  );

  assert.equal(entries.length, 2, "the original credit is still on the ledger");
  assert.equal(reversal.entry.direction, "DEBIT");
  assert.equal(reversal.entry.relatedEntryId, credit.entry.id);
  assert.equal(reversal.account.balanceMinor, 0);
  assert.equal(reversal.account.lifetimeRefundMinor, 30000);
  // The gift still counts as having happened; only the balance is undone.
  assert.equal(reversal.account.lifetimeGiftMinor, 30000);
  assert.equal(reversal.account.giftCount, 1);
});

test("balances always equal the sum of the entries", async () => {
  const { client, entries } = createFakeClient();
  const movements: Array<[string, number]> = [
    ["GIFT_CREDIT", 10000],
    ["GIFT_CREDIT", 25000],
    ["REFUND_DEBIT", -5000],
    ["ADJUSTMENT_CREDIT", 1500],
    ["WITHDRAWAL_DEBIT", -20000],
  ];

  let last;
  for (const [type, amountMinor] of movements) {
    last = await service.postEntry(
      {
        eventId: "evt_1",
        type: type as never,
        amountMinor,
        idempotencyKey: `${type}:${amountMinor}`,
      },
      client
    );
  }

  const ledgerSum = entries.reduce((sum, e) => sum + e.amountMinor, 0);
  assert.equal(ledgerSum, 11500);
  assert.equal(last!.account.balanceMinor, ledgerSum);
  assert.equal(last!.account.lifetimeWithdrawnMinor, 20000);
});

test("entries with the wrong sign for their type are refused", async () => {
  const { client, entries } = createFakeClient();

  await assert.rejects(
    () =>
      service.postEntry(
        { eventId: "evt_1", type: "GIFT_CREDIT", amountMinor: -100, idempotencyKey: "a" },
        client
      ),
    /must be a credit/
  );
  await assert.rejects(
    () =>
      service.postEntry(
        { eventId: "evt_1", type: "REFUND_DEBIT", amountMinor: 100, idempotencyKey: "b" },
        client
      ),
    /must be a debit/
  );
  assert.equal(entries.length, 0);
});

test("non-integer and zero amounts never reach the ledger", async () => {
  const { client, entries } = createFakeClient();

  for (const amountMinor of [10.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    await assert.rejects(
      () =>
        service.postEntry(
          { eventId: "evt_1", type: "GIFT_CREDIT", amountMinor, idempotencyKey: `k${amountMinor}` },
          client
        ),
      /integer minor units/
    );
  }

  await assert.rejects(
    () =>
      service.postEntry(
        { eventId: "evt_1", type: "GIFT_CREDIT", amountMinor: 0, idempotencyKey: "zero" },
        client
      ),
    /cannot be zero/
  );
  assert.equal(entries.length, 0);
});

test("a closed wallet accepts no further entries", async () => {
  const { client, entries } = createFakeClient({ accountStatus: "CLOSED" });

  await assert.rejects(
    () =>
      service.postEntry(
        { eventId: "evt_1", type: "GIFT_CREDIT", amountMinor: 1000, idempotencyKey: "closed" },
        client
      ),
    /wallet is closed/
  );
  assert.equal(entries.length, 0);
});
