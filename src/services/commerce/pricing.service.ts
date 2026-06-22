import { prisma } from "@/lib/prisma";
import { currencyService } from "@/services/commerce/currency.service";
import type { DisplayCurrency } from "@/lib/commerce/constants";

export interface OrderPricing {
  packageAmountGhs: number;
  addonsAmountGhs: number;
  totalGhs: number;
  displayCurrency: DisplayCurrency;
  displayAmount: number;
  exchangeRate: number;
  rateSource: string;
  lineItems: { slug: string; name: string; amountGhs: number }[];
}

export class PricingService {
  async getPackagePriceGhs(packageSlug: string): Promise<number> {
    const pkg = await prisma.invitationProductPackage.findUnique({
      where: { slug: packageSlug },
      include: { prices: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!pkg) return 0;
    const activePrice = pkg.prices[0];
    return Number(activePrice?.amountGhs ?? pkg.priceGhs);
  }

  async getAddonPriceGhs(addonSlug: string): Promise<number> {
    const addon = await prisma.invitationAddon.findUnique({ where: { slug: addonSlug } });
    return addon?.isActive ? Number(addon.priceGhs) : 0;
  }

  async calculateOrderPricing(
    packageSlug: string,
    addonSlugs: string[],
    displayCurrency: DisplayCurrency = "GHS"
  ): Promise<OrderPricing> {
    const pkg = await prisma.invitationProductPackage.findUnique({ where: { slug: packageSlug } });
    const packageAmountGhs = await this.getPackagePriceGhs(packageSlug);

    const lineItems: OrderPricing["lineItems"] = [];
    if (pkg) {
      lineItems.push({ slug: packageSlug, name: pkg.name, amountGhs: packageAmountGhs });
    }

    let addonsAmountGhs = 0;
    for (const slug of addonSlugs) {
      const addon = await prisma.invitationAddon.findUnique({ where: { slug } });
      if (!addon || !addon.isActive) continue;
      const price = Number(addon.priceGhs);
      addonsAmountGhs += price;
      lineItems.push({ slug, name: addon.name, amountGhs: price });
    }

    const totalGhs = packageAmountGhs + addonsAmountGhs;
    const converted = await currencyService.convertFromGhs(totalGhs, displayCurrency);

    return {
      packageAmountGhs,
      addonsAmountGhs,
      totalGhs,
      displayCurrency,
      displayAmount: converted.displayAmount,
      exchangeRate: converted.exchangeRate,
      rateSource: converted.rateSource,
      lineItems,
    };
  }

  async isPaymentRequired(packageSlug: string): Promise<boolean> {
    const pkg = await prisma.invitationProductPackage.findUnique({ where: { slug: packageSlug } });
    if (!pkg) return true;
    const price = await this.getPackagePriceGhs(packageSlug);
    if (price <= 0) return false;
    return pkg.paymentRequiredToPublish;
  }
}

export const pricingService = new PricingService();
