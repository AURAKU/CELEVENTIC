import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { SMARTCARD_PLANS } from "@/lib/digital-business-card/plans";
import { resolveCeleCardLifecycle } from "@/lib/digital-business-card/lifecycle";
import {
  activateDigitalCardFromPayment,
  createDigitalCard,
  isDigitalCardLive,
} from "../digital-business-card.service";

const stamp = Date.now();
const userIds: string[] = [];

async function makeOwner(label: string) {
  const user = await prisma.user.create({
    data: {
      email: `celecard.plans.${label}.${stamp}@local.test`,
      name: `Plan ${label}`,
      role: "ORGANIZER",
      status: "ACTIVE",
      passwordHash: await hashPassword("PlanCheckout9!"),
    },
  });
  userIds.push(user.id);
  return user;
}

describe("CeleYou prepaid checkout amounts", () => {
  after(async () => {
    for (const id of userIds.reverse()) {
      await prisma.digitalBusinessCard.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
  });

  it("activates monthly, quarterly, half-yearly, and yearly from catalog amounts and keeps identity on replay", async () => {
    for (const plan of SMARTCARD_PLANS) {
      const owner = await makeOwner(plan.id);
      const card = await createDigitalCard(owner.id, {
        displayName: `Plan ${plan.label}`,
        title: "Product Lead",
        themeId: "gold-folio",
        isPublished: true,
      });
      const slug = card.slug;
      const publicToken = card.publicToken;

      const refused = await activateDigitalCardFromPayment({
        userId: owner.id,
        cardId: card.id,
        planId: plan.id,
        amountGhs: 1,
        paymentId: `pay_${plan.id}_wrong_${stamp}`,
      });
      assert.equal(refused, null);

      const activated = await activateDigitalCardFromPayment({
        userId: owner.id,
        cardId: card.id,
        planId: plan.id,
        amountGhs: plan.priceGhs,
        chargedPriceGhs: plan.priceGhs,
        months: plan.months,
        paymentId: `pay_${plan.id}_${stamp}`,
      });
      assert.ok(activated);
      assert.equal(activated.subscriptionStatus, "ACTIVE");
      assert.equal(isDigitalCardLive(activated), true);
      assert.equal(activated.slug, slug);
      assert.equal(activated.publicToken, publicToken);
      assert.equal(resolveCeleCardLifecycle(activated), "ACTIVE");

      const replay = await activateDigitalCardFromPayment({
        userId: owner.id,
        cardId: card.id,
        planId: plan.id,
        amountGhs: plan.priceGhs,
        chargedPriceGhs: plan.priceGhs,
        months: plan.months,
        paymentId: `pay_${plan.id}_${stamp}`,
      });
      assert.equal(replay?.subscriptionExpiresAt?.getTime(), activated.subscriptionExpiresAt?.getTime());
      assert.equal(replay?.slug, slug);
      assert.equal(replay?.publicToken, publicToken);
    }
  });

  it("honours a historical yearly 449 snapshot without rewriting the catalog", async () => {
    const owner = await makeOwner("historical449");
    const card = await createDigitalCard(owner.id, {
      displayName: "Historical Yearly",
      title: "Product Lead",
      themeId: "teal-pulse",
      isPublished: true,
    });
    const activated = await activateDigitalCardFromPayment({
      userId: owner.id,
      cardId: card.id,
      planId: "yearly",
      amountGhs: 449,
      chargedPriceGhs: 449,
      months: 12,
      paymentId: `pay_historical_449_${stamp}`,
    });
    assert.ok(activated);
    assert.equal(activated.subscriptionStatus, "ACTIVE");
    assert.equal(getSmartCardPlanPrice("yearly"), 399);
  });

  it("keeps slug and QR identity through grace, courtesy, and renewal", async () => {
    const owner = await makeOwner("renew");
    const card = await createDigitalCard(owner.id, {
      displayName: "Renew Kojo",
      title: "Product Lead",
      themeId: "gold-folio",
      isPublished: true,
    });
    const activated = await activateDigitalCardFromPayment({
      userId: owner.id,
      cardId: card.id,
      planId: "yearly",
      amountGhs: 399,
      chargedPriceGhs: 399,
      months: 12,
      paymentId: `pay_renew_start_${stamp}`,
    });
    assert.ok(activated);
    const slug = activated.slug;
    const publicToken = activated.publicToken;

    const grace = await prisma.digitalBusinessCard.update({
      where: { id: card.id },
      data: {
        subscriptionStatus: "EXPIRED",
        lastActivatedAt: new Date(Date.now() - 40 * 86_400_000),
        subscriptionExpiresAt: new Date(Date.now() - 1 * 86_400_000),
      },
    });
    assert.equal(resolveCeleCardLifecycle(grace), "GRACE_PERIOD");
    assert.equal(isDigitalCardLive(grace), true);
    assert.equal(grace.slug, slug);
    assert.equal(grace.publicToken, publicToken);

    const courtesy = await prisma.digitalBusinessCard.update({
      where: { id: card.id },
      data: {
        subscriptionExpiresAt: new Date(Date.now() - 5 * 86_400_000),
      },
    });
    assert.equal(resolveCeleCardLifecycle(courtesy), "COURTESY");
    assert.equal(isDigitalCardLive(courtesy), false);
    assert.equal(courtesy.slug, slug);
    assert.equal(courtesy.publicToken, publicToken);

    const renewed = await activateDigitalCardFromPayment({
      userId: owner.id,
      cardId: card.id,
      planId: "yearly",
      amountGhs: 399,
      chargedPriceGhs: 399,
      months: 12,
      paymentId: `pay_renew_again_${stamp}`,
    });
    assert.ok(renewed);
    assert.equal(renewed.subscriptionStatus, "ACTIVE");
    assert.equal(isDigitalCardLive(renewed), true);
    assert.equal(renewed.slug, slug);
    assert.equal(renewed.publicToken, publicToken);
    assert.equal(renewed.lastActivationPaymentId, `pay_renew_again_${stamp}`);
  });
});

function getSmartCardPlanPrice(id: "yearly") {
  const plan = SMARTCARD_PLANS.find((item) => item.id === id);
  return plan?.priceGhs ?? null;
}
