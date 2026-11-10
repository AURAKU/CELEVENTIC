import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { toGuestPublicPayload } from "@/lib/digital-business-card/access";
import { isDigitalCardLive, activateDigitalCardFromPayment } from "@/services/digital-business-card/digital-business-card.service";
import {
  applyCeleCardAdminAction,
  CeleCardAdminError,
  claimCeleCardWithToken,
  createAssistedCeleCard,
  grantManualEntitlement,
  updateAssistedCeleCard,
} from "@/services/digital-business-card/admin-command.service";
import {
  getDigitalCardAnalyticsForUser,
  recordSmartCardInteraction,
} from "@/services/digital-business-card/digital-business-card.service";

const stamp = Date.now();
const ids: string[] = [];

async function makeUser(input: { email: string; name: string; role?: "SUPER_ADMIN" | "ADMIN" | "ORGANIZER" }) {
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role ?? "ORGANIZER",
      status: "ACTIVE",
      passwordHash: await hashPassword("AdminCommand9!"),
    },
  });
  ids.push(user.id);
  return user;
}

describe("CeleYou Admin Command Center", () => {
  after(async () => {
    for (const id of ids.reverse()) {
      await prisma.digitalBusinessCard.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
  });

  it("creates a card for an existing customer, then an unclaimed card that only the invited email can claim", async () => {
    const admin = await makeUser({
      email: `celecard.admin.${stamp}@local.test`,
      name: "Admin Command",
      role: "SUPER_ADMIN",
    });
    const customer = await makeUser({
      email: `celecard.owner.${stamp}@local.test`,
      name: "Ama Serwaa",
    });
    const actor = { id: admin.id, role: admin.role };

    const owned = await createAssistedCeleCard(actor, {
      ownerUserId: customer.id,
      displayName: "Ama Serwaa",
      title: "Creative Director",
      themeId: "elegant-frost",
      activation: { kind: "draft" },
    });
    assert.equal(owned.card.unclaimed, false);
    assert.equal(owned.claimUrl, null);

    const unclaimed = await createAssistedCeleCard(actor, {
      unclaimedEmail: `celecard.claim.${stamp}@local.test`,
      displayName: "Kojo Mensah",
      title: "Product Lead",
      themeId: "gold-folio",
      activation: { kind: "draft" },
    });
    assert.equal(unclaimed.card.unclaimed, true);
    assert.ok(unclaimed.claimUrl);
    const token = unclaimed.claimUrl!.split("/card/claim/")[1];
    assert.ok(token);

    const stranger = await makeUser({
      email: `celecard.stranger.${stamp}@local.test`,
      name: "Stranger",
    });
    await assert.rejects(
      () => claimCeleCardWithToken({ token, userId: stranger.id }),
      (error: unknown) => error instanceof CeleCardAdminError && error.status === 403
    );

    const claimant = await makeUser({
      email: `celecard.claim.${stamp}@local.test`,
      name: "Kojo Mensah",
    });
    const claimed = await claimCeleCardWithToken({ token, userId: claimant.id });
    assert.equal(claimed.userId, claimant.id);
    assert.ok(claimed.claimedAt);

    await assert.rejects(
      () => claimCeleCardWithToken({ token, userId: claimant.id }),
      (error: unknown) => error instanceof CeleCardAdminError
    );
  });

  it("grants a complimentary entitlement without writing a Payment row, and payment cannot clear a suspension", async () => {
    const admin = await makeUser({
      email: `celecard.grant.${stamp}@local.test`,
      name: "Grant Admin",
      role: "SUPER_ADMIN",
    });
    const limited = await makeUser({
      email: `celecard.limited.${stamp}@local.test`,
      name: "Limited Admin",
      role: "ADMIN",
    });
    const customer = await makeUser({
      email: `celecard.pay.${stamp}@local.test`,
      name: "Paid Customer",
    });
    const created = await createAssistedCeleCard(
      { id: admin.id, role: admin.role },
      {
        ownerUserId: customer.id,
        displayName: "Paid Customer",
        activation: { kind: "draft" },
      }
    );
    const cardId = created.card.id;

    await assert.rejects(
      () =>
        grantManualEntitlement(
          { id: limited.id, role: limited.role },
          {
            cardId,
            kind: "complimentary",
            planId: "monthly",
            reason: "courtesy for a partner launch",
          }
        ),
      (error: unknown) => error instanceof CeleCardAdminError && error.status === 403
    );

    const paymentsBefore = await prisma.payment.count({ where: { userId: customer.id } });
    const granted = await grantManualEntitlement(
      { id: admin.id, role: admin.role },
      {
        cardId,
        kind: "complimentary",
        planId: "monthly",
        reason: "authorized complimentary launch window",
      }
    );
    assert.equal(granted.subscriptionStatus, "ACTIVE");
    assert.equal(isDigitalCardLive(granted), true);
    const paymentsAfter = await prisma.payment.count({ where: { userId: customer.id } });
    assert.equal(paymentsAfter, paymentsBefore);
    const ledger = await prisma.smartCardEntitlementGrant.count({ where: { cardId } });
    assert.equal(ledger >= 1, true);
    const audit = await prisma.auditLog.findFirst({
      where: { entity: "celecard", entityId: cardId },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(audit);
    const details = (audit?.details ?? {}) as Record<string, unknown>;
    assert.equal(typeof details.kind, "string");
    assert.equal("password" in details, false);
    assert.equal("token" in details, false);

    await applyCeleCardAdminAction(
      { id: admin.id, role: admin.role },
      { cardId, action: "suspend", reason: "security review of this identity" }
    );
    const suspended = await prisma.digitalBusinessCard.findUniqueOrThrow({ where: { id: cardId } });
    assert.equal(isDigitalCardLive(suspended), false);
    const guest = toGuestPublicPayload(suspended);
    assert.equal(guest.presentationMode, "suspended");
    assert.equal(guest.email, null);

    const paid = await activateDigitalCardFromPayment({
      userId: customer.id,
      cardId,
      planId: "yearly",
      amountGhs: 449,
      paymentId: `pay_should_not_unsuspend_${stamp}`,
    });
    assert.equal(paid, null);
    const still = await prisma.digitalBusinessCard.findUniqueOrThrow({ where: { id: cardId } });
    assert.ok(still.adminSuspendedAt);
    assert.equal(isDigitalCardLive(still), false);

    await applyCeleCardAdminAction(
      { id: admin.id, role: admin.role },
      { cardId, action: "unsuspend", reason: "review closed" }
    );
    await applyCeleCardAdminAction(
      { id: admin.id, role: admin.role },
      { cardId, action: "deactivate", reason: "temporary withhold for the event" }
    );
    const deactivated = await prisma.digitalBusinessCard.findUniqueOrThrow({ where: { id: cardId } });
    assert.equal(toGuestPublicPayload(deactivated).presentationMode, "unavailable");
    assert.equal(deactivated.slug, granted.slug);
  });

  it("keeps the public slug and QR token when staff edit the display name, and records owner analytics", async () => {
    const admin = await makeUser({
      email: `celecard.admin.edit.${stamp}@local.test`,
      name: "Admin Editor",
      role: "ADMIN",
    });
    const customer = await makeUser({
      email: `celecard.owner.edit.${stamp}@local.test`,
      name: "Kojo Mensah",
    });
    const created = await createAssistedCeleCard(
      { id: admin.id, role: admin.role },
      {
        displayName: "Kojo Mensah",
        ownerUserId: customer.id,
        activation: { kind: "draft" },
      }
    );
    const before = await prisma.digitalBusinessCard.findUniqueOrThrow({ where: { id: created.card.id } });
    const edited = await updateAssistedCeleCard(
      { id: admin.id, role: admin.role },
      created.card.id,
      { displayName: "Kojo K. Mensah", title: "Product Lead" }
    );
    assert.equal(edited.slug, before.slug);
    assert.equal(edited.publicToken, before.publicToken);
    assert.equal(edited.displayName, "Kojo K. Mensah");
    await recordSmartCardInteraction(created.card.id, "qr_open");
    await recordSmartCardInteraction(created.card.id, "nfc_tap");
    const analytics = await getDigitalCardAnalyticsForUser(customer.id, created.card.id);
    assert.ok(analytics);
    assert.equal(analytics?.qrOpens, 1);
    assert.equal(analytics?.nfcTaps, 1);
    const stranger = await getDigitalCardAnalyticsForUser(admin.id, created.card.id);
    assert.equal(stranger, null);
  });
});
