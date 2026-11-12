import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import {
  applyConciergeAdminAction,
  CeleCardAdminError,
  createConciergeOrder,
  markConciergePaid,
} from "../concierge.service";
import { isDigitalCardLive } from "../digital-business-card.service";

const stamp = Date.now();
const ids: string[] = [];

async function makeUser(input: { email: string; name: string; role?: "SUPER_ADMIN" | "ADMIN" | "ORGANIZER" }) {
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role ?? "ORGANIZER",
      status: "ACTIVE",
      passwordHash: await hashPassword("ConciergeTest9!"),
    },
  });
  ids.push(user.id);
  return user;
}

describe("CeleYou concierge orders", () => {
  after(async () => {
    await prisma.smartCardConciergeOrder.deleteMany({
      where: { customerEmail: { contains: `celecard.concierge.${stamp}` } },
    }).catch(() => undefined);
    for (const id of ids.reverse()) {
      await prisma.digitalBusinessCard.deleteMany({ where: { userId: id } }).catch(() => undefined);
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
  });

  it("takes intake, refuses a mismatched payment, then fulfills a verified payment without a second Payment row", async () => {
    const admin = await makeUser({
      email: `celecard.concierge.admin.${stamp}@local.test`,
      name: "Concierge Admin",
      role: "ADMIN",
    });
    const superAdmin = await makeUser({
      email: `celecard.concierge.super.${stamp}@local.test`,
      name: "Concierge Super",
      role: "SUPER_ADMIN",
    });
    const customer = await makeUser({
      email: `celecard.concierge.${stamp}@local.test`,
      name: "Ama Serwaa",
    });

    const order = await createConciergeOrder({
      customerUserId: customer.id,
      customerEmail: customer.email!,
      customerName: "Ama Serwaa",
      displayName: "Ama Serwaa",
      title: "Creative Director",
      brief: "Please design a founder CeleYou with gold folio energy and booking plus MoMo.",
      includeSubscription: true,
      planId: "yearly",
    });
    assert.equal(order.status, "INTAKE");
    assert.equal(order.totalGhs, order.designFeeGhs + order.subscriptionFeeGhs);
    assert.equal(order.paymentId, null);

    await assert.rejects(
      () =>
        applyConciergeAdminAction(
          { id: customer.id, role: "ORGANIZER" },
          { orderId: order.id, action: "waive", reason: "partner courtesy for this launch" }
        ),
      (error: unknown) => error instanceof CeleCardAdminError && error.status === 403
    );

    const mismatch = await markConciergePaid({
      orderId: order.id,
      paymentId: `pay_mismatch_${stamp}`,
      amountGhs: 1,
    });
    assert.equal(mismatch, null);

    const paymentsBefore = await prisma.payment.count({ where: { userId: customer.id } });
    const paid = await markConciergePaid({
      orderId: order.id,
      paymentId: `pay_concierge_${stamp}`,
      amountGhs: order.totalGhs,
    });
    assert.equal(paid?.status, "PAID");
    assert.equal(paid?.paymentId, `pay_concierge_${stamp}`);

    const fulfilled = await applyConciergeAdminAction(
      { id: admin.id, role: admin.role },
      { orderId: order.id, action: "fulfill" }
    );
    const cardId = (fulfilled as { card?: { id: string } }).card?.id;
    assert.ok(cardId);
    const card = await prisma.digitalBusinessCard.findUniqueOrThrow({ where: { id: cardId } });
    assert.equal(card.entitlementKind, "PAID_CONCIERGE");
    assert.equal(card.lastActivationPaymentId, `pay_concierge_${stamp}`);
    assert.equal(isDigitalCardLive(card), true);
    const paymentsAfter = await prisma.payment.count({ where: { userId: customer.id } });
    assert.equal(paymentsAfter, paymentsBefore);

    await applyConciergeAdminAction(
      { id: superAdmin.id, role: superAdmin.role },
      { orderId: order.id, action: "deliver" }
    );
    const delivered = await prisma.smartCardConciergeOrder.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(delivered.status, "DELIVERED");
  });

  it("records a design-only concierge payment without granting a live hosting term", async () => {
    const admin = await makeUser({
      email: `celecard.concierge.designadmin.${stamp}@local.test`,
      name: "Design Admin",
      role: "ADMIN",
    });
    const customer = await makeUser({
      email: `celecard.concierge.design.${stamp}@local.test`,
      name: "Yaa Asantewaa",
    });
    const order = await createConciergeOrder({
      customerUserId: customer.id,
      customerEmail: customer.email!,
      customerName: "Yaa Asantewaa",
      displayName: "Yaa Asantewaa",
      title: "Founder",
      brief: "Please design a founder CeleYou with gold folio energy and booking plus MoMo.",
      includeSubscription: false,
    });
    assert.equal(order.includeSubscription, false);
    assert.equal(order.subscriptionFeeGhs, 0);
    assert.equal(order.totalGhs, order.designFeeGhs);
    assert.equal(order.planId, null);

    const paid = await markConciergePaid({
      orderId: order.id,
      paymentId: `pay_design_only_${stamp}`,
      amountGhs: order.totalGhs,
    });
    assert.equal(paid?.status, "PAID");

    const fulfilled = await applyConciergeAdminAction(
      { id: admin.id, role: admin.role },
      { orderId: order.id, action: "fulfill" }
    );
    const cardId = (fulfilled as { card?: { id: string } }).card?.id;
    assert.ok(cardId);
    const card = await prisma.digitalBusinessCard.findUniqueOrThrow({ where: { id: cardId } });
    assert.equal(isDigitalCardLive(card), false);
    assert.notEqual(card.entitlementKind, "PAID_CONCIERGE");
    assert.equal(card.lastActivationPaymentId, null);
  });
});
