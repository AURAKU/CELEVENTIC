import test from "node:test";
import assert from "node:assert/strict";

import { EventWalletService } from "../event-wallet.service";
import { createFakeLedgerClient as createFakeClient } from "./fake-event-wallet-client";

const service = new EventWalletService();

test("withdrawal reserve holds available balance without moving cash", async () => {
  const { client } = createFakeClient();
  await service.postEntry(
    {
      eventId: "evt_wd",
      type: "GIFT_CREDIT",
      amountMinor: 50000,
      idempotencyKey: "gift_credit:1",
    },
    client
  );

  const reserved = await service.postEntry(
    {
      eventId: "evt_wd",
      type: "WITHDRAWAL_RESERVE",
      amountMinor: -20000,
      idempotencyKey: "withdrawal_reserve:1",
    },
    client
  );

  assert.equal(reserved.account.balanceMinor, 50000);
  assert.equal(reserved.account.reservedMinor, 20000);
  assert.equal(reserved.account.availableMinor, 30000);
});

test("cannot reserve more than available", async () => {
  const { client } = createFakeClient();
  await service.postEntry(
    {
      eventId: "evt_wd2",
      type: "GIFT_CREDIT",
      amountMinor: 10000,
      idempotencyKey: "gift_credit:2",
    },
    client
  );

  await assert.rejects(
    () =>
      service.postEntry(
        {
          eventId: "evt_wd2",
          type: "WITHDRAWAL_RESERVE",
          amountMinor: -20000,
          idempotencyKey: "withdrawal_reserve:2",
        },
        client
      ),
    /Insufficient available balance/
  );
});

test("paid withdrawal debits balance and clears reservation", async () => {
  const { client } = createFakeClient();
  await service.postEntry(
    {
      eventId: "evt_wd3",
      type: "GIFT_CREDIT",
      amountMinor: 40000,
      idempotencyKey: "gift_credit:3",
    },
    client
  );
  await service.postEntry(
    {
      eventId: "evt_wd3",
      type: "WITHDRAWAL_RESERVE",
      amountMinor: -15000,
      idempotencyKey: "withdrawal_reserve:3",
    },
    client
  );

  const paid = await service.postEntry(
    {
      eventId: "evt_wd3",
      type: "WITHDRAWAL_DEBIT",
      amountMinor: -15000,
      idempotencyKey: "withdrawal_debit:3",
    },
    client
  );

  assert.equal(paid.account.balanceMinor, 25000);
  assert.equal(paid.account.reservedMinor, 0);
  assert.equal(paid.account.availableMinor, 25000);
  assert.equal(paid.account.lifetimeWithdrawnMinor, 15000);
});

test("failed payout releases reservation back to available", async () => {
  const { client } = createFakeClient();
  await service.postEntry(
    {
      eventId: "evt_wd4",
      type: "GIFT_CREDIT",
      amountMinor: 30000,
      idempotencyKey: "gift_credit:4",
    },
    client
  );
  await service.postEntry(
    {
      eventId: "evt_wd4",
      type: "WITHDRAWAL_RESERVE",
      amountMinor: -10000,
      idempotencyKey: "withdrawal_reserve:4",
    },
    client
  );

  const released = await service.releaseReservation("evt_wd4", 10000, client);
  assert.equal(released.reservedMinor, 0);
  assert.equal(released.availableMinor, 30000);
  assert.equal(released.balanceMinor, 30000);
});

test("withdrawal reserve is idempotent", async () => {
  const { client, entries } = createFakeClient();
  await service.postEntry(
    {
      eventId: "evt_wd5",
      type: "GIFT_CREDIT",
      amountMinor: 20000,
      idempotencyKey: "gift_credit:5",
    },
    client
  );
  const input = {
    eventId: "evt_wd5",
    type: "WITHDRAWAL_RESERVE" as const,
    amountMinor: -5000,
    idempotencyKey: "withdrawal_reserve:5",
  };
  const first = await service.postEntry(input, client);
  const second = await service.postEntry(input, client);
  assert.equal(first.alreadyApplied, false);
  assert.equal(second.alreadyApplied, true);
  assert.equal(entries.filter((e) => e.type === "WITHDRAWAL_RESERVE").length, 1);
  assert.equal(second.account.reservedMinor, 5000);
});
