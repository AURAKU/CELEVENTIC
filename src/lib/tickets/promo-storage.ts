import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getUploadRoot } from "@/lib/uploads/file-storage";

export interface TicketPromoRecord {
  id: string;
  eventId: string;
  code: string;
  discountPercent: number;
  discountFixed?: number;
  maxUses?: number;
  usedCount: number;
  active: boolean;
  expiresAt?: string;
  createdAt: string;
}

function promosDir() {
  return path.join(getUploadRoot(), "ticket-promos");
}

function promosFile(eventId: string) {
  return path.join(promosDir(), `${eventId}.json`);
}

async function readPromos(eventId: string): Promise<TicketPromoRecord[]> {
  try {
    const raw = await readFile(promosFile(eventId), "utf8");
    return JSON.parse(raw) as TicketPromoRecord[];
  } catch {
    return [];
  }
}

async function writePromos(eventId: string, promos: TicketPromoRecord[]) {
  const dir = promosDir();
  await mkdir(dir, { recursive: true });
  await writeFile(promosFile(eventId), JSON.stringify(promos, null, 2), "utf8");
}

export async function listTicketPromos(eventId: string) {
  return readPromos(eventId);
}

export async function createTicketPromo(
  eventId: string,
  input: {
    code: string;
    discountPercent?: number;
    discountFixed?: number;
    maxUses?: number;
    expiresAt?: string;
  }
) {
  const promos = await readPromos(eventId);
  const code = input.code.trim().toUpperCase();
  if (promos.some((p) => p.code === code)) throw new Error("Promo code already exists");
  const record: TicketPromoRecord = {
    id: `promo-${Date.now()}`,
    eventId,
    code,
    discountPercent: input.discountPercent ?? 0,
    discountFixed: input.discountFixed,
    maxUses: input.maxUses,
    usedCount: 0,
    active: true,
    expiresAt: input.expiresAt,
    createdAt: new Date().toISOString(),
  };
  promos.push(record);
  await writePromos(eventId, promos);
  return record;
}

export async function deleteTicketPromo(eventId: string, promoId: string) {
  const promos = await readPromos(eventId);
  const next = promos.filter((p) => p.id !== promoId);
  if (next.length === promos.length) throw new Error("Promo not found");
  await writePromos(eventId, next);
}

export async function validateTicketPromo(eventId: string, code: string) {
  const promos = await readPromos(eventId);
  const promo = promos.find((p) => p.code === code.trim().toUpperCase() && p.active);
  if (!promo) return null;
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return null;
  if (promo.maxUses && promo.usedCount >= promo.maxUses) return null;
  return promo;
}

export async function incrementPromoUse(eventId: string, code: string) {
  const promos = await readPromos(eventId);
  const idx = promos.findIndex((p) => p.code === code.trim().toUpperCase());
  if (idx < 0) return;
  promos[idx].usedCount += 1;
  await writePromos(eventId, promos);
}

export function applyPromoDiscount(amount: number, promo: TicketPromoRecord): number {
  if (promo.discountFixed && promo.discountFixed > 0) {
    return Math.max(0, amount - promo.discountFixed);
  }
  if (promo.discountPercent > 0) {
    return Math.max(0, amount * (1 - promo.discountPercent / 100));
  }
  return amount;
}
