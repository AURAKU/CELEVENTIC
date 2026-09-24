import { prisma } from "@/lib/prisma";
import { currencyService } from "@/services/commerce/currency.service";
import type { DisplayCurrency } from "@/lib/commerce/constants";
import {
  getInvitationPackage,
  isQuoteOnlyInvitationPackage,
  resolveInvitationPackageSlug,
} from "@/lib/invitation-mvp/packages";

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
    const canonical = resolveInvitationPackageSlug(packageSlug) ?? packageSlug;
    const bundled = getInvitationPackage(canonical);
    try {
      const pkg = await prisma.invitationProductPackage.findUnique({
        where: { slug: canonical },
        include: { prices: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 } },
      });
      if (!pkg) return bundled?.priceGhs ?? 0;
      const activePrice = pkg.prices[0];
      return bundled?.priceGhs ?? Number(activePrice?.amountGhs ?? pkg.priceGhs);
    } catch {
      return bundled?.priceGhs ?? 0;
    }
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
    const canonical = resolveInvitationPackageSlug(packageSlug) ?? packageSlug;
    const bundled = getInvitationPackage(canonical);
    let pkg: { name: string } | null = bundled ? { name: bundled.name } : null;
    try {
      const row = await prisma.invitationProductPackage.findUnique({ where: { slug: canonical } });
      if (row) pkg = { name: bundled?.name ?? row.name };
    } catch {
      /* bundled name is sufficient */
    }
    const packageAmountGhs = await this.getPackagePriceGhs(canonical);

    const lineItems: OrderPricing["lineItems"] = [];
    if (pkg) {
      lineItems.push({ slug: canonical, name: pkg.name, amountGhs: packageAmountGhs });
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
    if (isQuoteOnlyInvitationPackage(packageSlug)) return false;
    const canonical = resolveInvitationPackageSlug(packageSlug) ?? packageSlug;
    const bundled = getInvitationPackage(canonical);
    try {
      const pkg = await prisma.invitationProductPackage.findUnique({ where: { slug: canonical } });
      const price = await this.getPackagePriceGhs(canonical);
      if (price <= 0) return false;
      if (!pkg) return bundled?.paymentRequiredToPublish !== false;
      return pkg.paymentRequiredToPublish;
    } catch {
      const price = bundled?.priceGhs ?? 0;
      return price > 0 && bundled?.paymentRequiredToPublish !== false;
    }
  }

  isQuoteOnly(packageSlug: string): boolean {
    return isQuoteOnlyInvitationPackage(packageSlug);
  }
}

export const pricingService = new PricingService();
