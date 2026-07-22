import { prisma } from "@/lib/prisma";
import type { PaymentProvider, Prisma } from "@prisma/client";
import { isProviderEnabled } from "@/lib/integrations/integration-runtime";

export const PLATFORM_DEFAULTS_KEY = "platform.defaultProviders";

/** Active payment providers for new checkouts (Paystack only). */
export type PaymentProviderId = "PAYSTACK";

export interface PlatformDefaultProviders {
  payments: PaymentProviderId;
  email: "RESEND" | string;
  sms: "SMS" | string;
  whatsapp: "WHATSAPP" | string;
}

export const DEFAULT_PLATFORM_PROVIDERS: PlatformDefaultProviders = {
  payments: "PAYSTACK",
  email: "RESEND",
  sms: "SMS",
  whatsapp: "WHATSAPP",
};

const PAYMENT_PROVIDERS: PaymentProviderId[] = ["PAYSTACK"];

export function isPaymentProviderId(value: unknown): value is PaymentProviderId {
  return typeof value === "string" && PAYMENT_PROVIDERS.includes(value as PaymentProviderId);
}

export async function getPlatformDefaultProviders(): Promise<PlatformDefaultProviders> {
  const row = await prisma.adminSetting.findUnique({ where: { key: PLATFORM_DEFAULTS_KEY } });
  const value = (row?.value as Partial<PlatformDefaultProviders> | null) ?? {};

  // Migrate legacy Flutterwave/Hubtel defaults → Paystack
  const paymentsRaw = value.payments as string | undefined;
  const payments: PaymentProviderId =
    paymentsRaw === "PAYSTACK" || isPaymentProviderId(paymentsRaw)
      ? "PAYSTACK"
      : DEFAULT_PLATFORM_PROVIDERS.payments;

  return {
    payments,
    email: typeof value.email === "string" && value.email ? value.email : DEFAULT_PLATFORM_PROVIDERS.email,
    sms: typeof value.sms === "string" && value.sms ? value.sms : DEFAULT_PLATFORM_PROVIDERS.sms,
    whatsapp:
      typeof value.whatsapp === "string" && value.whatsapp
        ? value.whatsapp
        : DEFAULT_PLATFORM_PROVIDERS.whatsapp,
  };
}

export async function setPlatformDefaultProviders(
  patch: Partial<PlatformDefaultProviders>
): Promise<PlatformDefaultProviders> {
  const current = await getPlatformDefaultProviders();
  const next: PlatformDefaultProviders = {
    payments: isPaymentProviderId(patch.payments) ? patch.payments : current.payments,
    email: typeof patch.email === "string" && patch.email ? patch.email : current.email,
    sms: typeof patch.sms === "string" && patch.sms ? patch.sms : current.sms,
    whatsapp:
      typeof patch.whatsapp === "string" && patch.whatsapp ? patch.whatsapp : current.whatsapp,
  };

  await prisma.adminSetting.upsert({
    where: { key: PLATFORM_DEFAULTS_KEY },
    create: {
      key: PLATFORM_DEFAULTS_KEY,
      category: "integrations",
      value: next as unknown as Prisma.InputJsonValue,
    },
    update: { value: next as unknown as Prisma.InputJsonValue },
  });

  return next;
}

/**
 * Resolve which payment provider to charge with.
 * Explicit request provider wins when enabled; otherwise platform default;
 * otherwise first enabled payment provider.
 */
export async function resolvePaymentProvider(
  requested?: PaymentProvider | string | null
): Promise<PaymentProviderId> {
  if (isPaymentProviderId(requested) && (await isProviderEnabled(requested))) {
    return requested;
  }

  const defaults = await getPlatformDefaultProviders();
  if (await isProviderEnabled(defaults.payments)) {
    return defaults.payments;
  }

  for (const provider of PAYMENT_PROVIDERS) {
    if (await isProviderEnabled(provider)) return provider;
  }

  throw new Error(
    "No payment provider is enabled. Configure Paystack in Admin → Integrations."
  );
}
