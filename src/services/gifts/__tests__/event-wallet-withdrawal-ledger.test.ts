import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";

import { EventWalletService, type LedgerTxClient } from "../event-wallet.service";

function uniqueViolation(target: string) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
    meta: { target },
  });
}

function applyNumericUpdate(current: number, value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "increment" in value) {
    return current + Number((value as { increment: number }).increment);
  }
  return current;
}

function createFakeClient() {
  const accounts = new Map<
    string,
    {
      id: string;
      eventId: string;
      currency: string;
      status: string;
      balanceMinor: number;
      availableMinor: number;
      reservedMinor: number;
      lifetimeGiftMinor: number;
      lifetimeRefundMinor: number;
      lifetimeWithdrawnMinor: number;
      giftCount: number;
      lastLedgerAt: Date | null;
    }
  >();
  const entries: Array<{ idempotencyKey: string; type: string; amountMinor: number }> = [];
  const byKey = new Map<string, { id: string; idempotencyKey: string }>();
  let seq = 0;

  const client = {
    eventWalletAccount: {
      async findUnique({ where }: { where: { eventId?: string; id?: string } }) {
        if (where.eventId) return accounts.get(where.eventId) ?? null;
        return [...accounts.values()].find((a) => a.id === where.id) ?? null;
      },
      async create({ data }: { data: { eventId: string; currency?: string } }) {
        if (accounts.has(data.eventId)) throw uniqueViolation("eventId");
        const account = {
          id: `acct_${data.eventId}`,
          eventId: data.eventId,
          currency: data.currency ?? "GHS",
          status: "ACTIVE",
          balanceMinor: 0,
          availableMinor: 0,
          reservedMinor: 0,
          lifetimeGiftMinor: 0,
          lifetimeRefundMinor: 0,
          lifetimeWithdrawnMinor: 0,
          giftCount: 0,
          lastLedgerAt: null as Date | null,
        };
        accounts.set(data.eventId, account);
        return account;
      },
      async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
        const account = [...accounts.values()].find((a) => a.id === where.id);
        if (!account) throw new Error("account not found");
        account.balanceMinor = applyNumericUpdate(account.balanceMinor, data.balanceMinor);
        account.availableMinor = applyNumericUpdate(account.availableMinor, data.availableMinor);
        account.reservedMinor = applyNumericUpdate(account.reservedMinor, data.reservedMinor);
        account.lifetimeGiftMinor = applyNumericUpdate(
          account.lifetimeGiftMinor,
          data.lifetimeGiftMinor
        );
        account.lifetimeWithdrawnMinor = applyNumericUpdate(
          account.lifetimeWithdrawnMinor,
          data.lifetimeWithdrawnMinor
        );
        account.giftCount = applyNumericUpdate(account.giftCount, data.giftCount);
        if (data.lastLedgerAt instanceof Date) account.lastLedgerAt = data.lastLedgerAt;
        return account;
      },
    },
    eventWalletLedgerEntry: {
      async findUnique({ where }: { where: { idempotencyKey: string } }) {
        return byKey.get(where.idempotencyKey) ?? null;
      },
      async create({
        data,
      }: {
        data: { idempotencyKey: string; type: string; amountMinor: number; [k: string]: unknown };
      }) {
        if (byKey.has(data.idempotencyKey)) throw uniqueViolation("idempotencyKey");
        const entry = { id: `led_${++seq}`, ...data, createdAt: new Date() };
        byKey.set(entry.idempotencyKey, entry);
        entries.push(entry);
        return entry;
      },
    },
  };

  return { client: client as unknown as LedgerTxClient, accounts, entries };
}

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
