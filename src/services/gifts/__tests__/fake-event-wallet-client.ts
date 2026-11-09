import { Prisma } from "@prisma/client";
import type { LedgerTxClient } from "../event-wallet.service";

export interface FakeAccount {
  id: string;
  eventId: string;
  book: string;
  currency: string;
  status: string;
  balanceMinor: number;
  availableMinor: number;
  reservedMinor: number;
  lifetimeGiftMinor: number;
  lifetimeRefundMinor: number;
  lifetimeWithdrawnMinor: number;
  giftCount: number;
  lifetimeTicketGrossMinor: number;
  lifetimeTicketCommissionMinor: number;
  lifetimeTicketRefundMinor: number;
  ticketSaleCount: number;
  lastLedgerAt: Date | null;
}

export interface FakeEntry {
  id: string;
  accountId: string;
  eventId: string;
  type: string;
  direction: string;
  amountMinor: number;
  currency: string;
  balanceAfterMinor: number;
  idempotencyKey: string;
  giftPaymentId?: string;
  relatedEntryId?: string;
  source: string;
  metadata?: unknown;
  createdAt: Date;
}

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

function accountKey(eventId: string, book: string) {
  return `${eventId}:${book}`;
}

export function createFakeLedgerClient(options: { accountStatus?: string } = {}) {
  const accounts = new Map<string, FakeAccount>();
  const entries: FakeEntry[] = [];
  const byKey = new Map<string, FakeEntry>();
  let seq = 0;

  const client = {
    eventWalletAccount: {
      async findUnique({
        where,
      }: {
        where: { eventId?: string; id?: string; eventId_book?: { eventId: string; book: string } };
      }) {
        if (where.eventId_book) {
          return accounts.get(accountKey(where.eventId_book.eventId, where.eventId_book.book)) ?? null;
        }
        if (where.eventId) return accounts.get(accountKey(where.eventId, "GIFT")) ?? null;
        return [...accounts.values()].find((a) => a.id === where.id) ?? null;
      },
      async create({
        data,
      }: {
        data: { eventId: string; currency?: string; book?: string };
      }) {
        const book = data.book ?? "GIFT";
        const key = accountKey(data.eventId, book);
        if (accounts.has(key)) throw uniqueViolation("eventId_book");
        const account: FakeAccount = {
          id: `acct_${data.eventId}_${book}`,
          eventId: data.eventId,
          book,
          currency: data.currency ?? "GHS",
          status: options.accountStatus ?? "ACTIVE",
          balanceMinor: 0,
          availableMinor: 0,
          reservedMinor: 0,
          lifetimeGiftMinor: 0,
          lifetimeRefundMinor: 0,
          lifetimeWithdrawnMinor: 0,
          giftCount: 0,
          lifetimeTicketGrossMinor: 0,
          lifetimeTicketCommissionMinor: 0,
          lifetimeTicketRefundMinor: 0,
          ticketSaleCount: 0,
          lastLedgerAt: null,
        };
        accounts.set(key, account);
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
        account.lifetimeRefundMinor = applyNumericUpdate(
          account.lifetimeRefundMinor,
          data.lifetimeRefundMinor
        );
        account.lifetimeWithdrawnMinor = applyNumericUpdate(
          account.lifetimeWithdrawnMinor,
          data.lifetimeWithdrawnMinor
        );
        account.giftCount = applyNumericUpdate(account.giftCount, data.giftCount);
        account.lifetimeTicketGrossMinor = applyNumericUpdate(
          account.lifetimeTicketGrossMinor,
          data.lifetimeTicketGrossMinor
        );
        account.lifetimeTicketCommissionMinor = applyNumericUpdate(
          account.lifetimeTicketCommissionMinor,
          data.lifetimeTicketCommissionMinor
        );
        account.lifetimeTicketRefundMinor = applyNumericUpdate(
          account.lifetimeTicketRefundMinor,
          data.lifetimeTicketRefundMinor
        );
        account.ticketSaleCount = applyNumericUpdate(account.ticketSaleCount, data.ticketSaleCount);
        if (data.lastLedgerAt instanceof Date) account.lastLedgerAt = data.lastLedgerAt;
        return account;
      },
    },
    eventWalletLedgerEntry: {
      async findUnique({ where }: { where: { idempotencyKey: string } }) {
        return byKey.get(where.idempotencyKey) ?? null;
      },
      async create({ data }: { data: Omit<FakeEntry, "id" | "createdAt"> }) {
        if (byKey.has(data.idempotencyKey)) throw uniqueViolation("idempotencyKey");
        const entry: FakeEntry = { ...data, id: `led_${++seq}`, createdAt: new Date() };
        byKey.set(entry.idempotencyKey, entry);
        entries.push(entry);
        return entry;
      },
    },
  };

  return { client: client as unknown as LedgerTxClient, accounts, entries };
}
