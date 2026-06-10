import { prisma } from "@/lib/prisma";

export async function isServiceEnabled(serviceKey: string): Promise<boolean> {
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: `services.${serviceKey}` },
    });
    const value = setting?.value as { enabled?: boolean } | undefined;
    return value?.enabled ?? true;
  } catch {
    return true;
  }
}

export async function getPricingValue<T>(key: string, fallback: T): Promise<T> {
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: `pricing.${key}` },
    });
    if (!setting?.value) return fallback;
    return setting.value as T;
  } catch {
    return fallback;
  }
}

export async function getTicketCommissionPercent(): Promise<number> {
  const val = await getPricingValue<{ percent?: number }>("ticket_commission", { percent: 5 });
  return val.percent ?? 5;
}

export async function getBulkMessagePrice(channel: "sms" | "whatsapp" | "email"): Promise<number> {
  const key = channel === "sms" ? "sms_per_guest" : channel === "whatsapp" ? "whatsapp_per_guest" : "email_per_guest";
  const val = await getPricingValue<{ price?: number }>(key, { price: 0.15 });
  return val.price ?? 0.15;
}
