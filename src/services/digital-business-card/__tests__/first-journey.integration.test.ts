import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { onboardingService } from "@/services/workspace/onboarding.service";
import {
  activateDigitalCardFromPayment,
  createDigitalCard,
  isDigitalCardLive,
} from "../digital-business-card.service";
import { toGuestPublicPayload } from "@/lib/digital-business-card/access";

const email = `celecard.journey.${Date.now()}@local.test`;
let userId: string | null = null;

describe("CeleYou first commercial journey", () => {
  after(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
  });

  it("registers a CeleYou-first owner, lets them design unpaid, and withholds the public card until verified payment entitlement", async () => {
    const registered = await onboardingService.register({
      accountType: "EVENT_OWNER",
      name: "Kojo Mensah",
      email,
      passwordHash: await hashPassword("JourneyTest9!"),
      productIntent: "celecard",
    });
    userId = registered.user.id;
    assert.equal(registered.redirect, "/dashboard/business-card");
    assert.ok(registered.user.onboardingCompletedAt);

    const card = await createDigitalCard(registered.user.id, {
      displayName: "Kojo Mensah",
      title: "Product Lead",
      company: "Aura Group",
      email,
      themeId: "gold-folio",
      isPublished: true,
    });
    assert.equal(card.subscriptionStatus, "TRIAL");
    assert.equal(isDigitalCardLive(card), false);
    const unpaidGuest = toGuestPublicPayload(card);
    assert.equal(unpaidGuest.presentationMode, "unavailable");
    assert.equal(unpaidGuest.email, null);
    assert.equal(unpaidGuest.phone, null);
    assert.equal(unpaidGuest.publicToken, "");
    assert.equal(unpaidGuest.displayName, "");

    const wrongAmount = await activateDigitalCardFromPayment({
      userId: registered.user.id,
      cardId: card.id,
      planId: "yearly",
      amountGhs: 1,
      paymentId: "pay_wrong_amount",
    });
    assert.equal(wrongAmount, null);
    const stillUnpaid = await prisma.digitalBusinessCard.findUniqueOrThrow({ where: { id: card.id } });
    assert.equal(isDigitalCardLive(stillUnpaid), false);

    const mismatchedQuote = await activateDigitalCardFromPayment({
      userId: registered.user.id,
      cardId: card.id,
      planId: "yearly",
      amountGhs: 1,
      chargedPriceGhs: 449,
      months: 12,
      paymentId: "pay_quote_mismatch",
    });
    assert.equal(mismatchedQuote, null);

    const activated = await activateDigitalCardFromPayment({
      userId: registered.user.id,
      cardId: card.id,
      planId: "yearly",
      amountGhs: 400,
      chargedPriceGhs: 400,
      months: 12,
      paymentId: "pay_quoted_at_checkout",
    });
    assert.ok(activated);
    assert.equal(activated?.subscriptionStatus, "ACTIVE");
    assert.equal(isDigitalCardLive(activated!), true);
    const liveGuest = toGuestPublicPayload(activated!);
    assert.equal(liveGuest.presentationMode, "live");
    assert.equal(liveGuest.displayName, "Kojo Mensah");
    assert.equal(liveGuest.slug, card.slug);
    assert.equal(liveGuest.publicToken, card.publicToken);

    const duplicate = await activateDigitalCardFromPayment({
      userId: registered.user.id,
      cardId: card.id,
      planId: "yearly",
      amountGhs: 400,
      chargedPriceGhs: 400,
      months: 12,
      paymentId: "pay_quoted_at_checkout",
    });
    assert.equal(duplicate?.subscriptionExpiresAt?.getTime(), activated?.subscriptionExpiresAt?.getTime());
  });
});
