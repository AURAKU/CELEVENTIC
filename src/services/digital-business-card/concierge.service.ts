import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getAppUrlFromEnv } from "@/lib/app-url";
import { parsePaginationInput, paginatedResult, ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { Permission } from "@/lib/rbac/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { communicationService } from "@/services/communications/communication.service";
import {
  conciergeQuote,
  CELECARD_CONCIERGE_PAYMENT_KIND,
  getSmartCardPlanFromCatalog,
  pesewasMatch,
  SMARTCARD_CURRENCY,
  smartCardExpiryFromNow,
} from "@/lib/digital-business-card/plans";
import { getCeleCardCatalog } from "./catalog.service";
import {
  CeleCardAdminError,
  createAssistedCeleCard,
} from "./admin-command.service";

export { CeleCardAdminError };
import { recordCeleCardLifecycleEvent } from "./digital-business-card.service";
import type { UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";

type Actor = { id: string; role: UserRole };

export type ConciergeIntake = {
  customerUserId?: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | null;
  brief: string;
  displayName: string;
  title?: string | null;
  company?: string | null;
  themePreference?: string | null;
  includeSubscription?: boolean;
  planId?: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function quoteConciergeOrder(input: { includeSubscription?: boolean; planId?: string | null }) {
  const catalog = await getCeleCardCatalog();
  const planId = input.planId || catalog.conciergeBundledPlanId;
  const plan = getSmartCardPlanFromCatalog(planId, catalog.plans);
  return {
    currency: SMARTCARD_CURRENCY,
    catalog,
    quote: conciergeQuote({
      designFeeGhs: catalog.conciergePriceGhs,
      includeSubscription: input.includeSubscription !== false,
      plan,
    }),
  };
}

export async function createConciergeOrder(input: ConciergeIntake) {
  const email = normalizeEmail(input.customerEmail);
  if (!email.includes("@")) throw new CeleCardAdminError("A valid email is required.");
  const name = input.customerName.trim();
  const displayName = input.displayName.trim() || name;
  if (name.length < 2 || displayName.length < 2) throw new CeleCardAdminError("Name is required.");
  const brief = input.brief.trim();
  if (brief.length < 12) throw new CeleCardAdminError("Tell us what this CeleYou should say, in at least a short paragraph.");
  const quoted = await quoteConciergeOrder({
    includeSubscription: input.includeSubscription,
    planId: input.planId,
  });
  if (!prisma.smartCardConciergeOrder) {
    throw new CeleCardAdminError(
      "CeleYou concierge is not loaded in this server process. Restart the app after prisma generate.",
      503
    );
  }
  const order = await prisma.smartCardConciergeOrder.create({
    data: {
      status: "INTAKE",
      customerUserId: input.customerUserId || null,
      customerEmail: email,
      customerName: name,
      customerPhone: input.customerPhone?.trim() || null,
      brief,
      displayName,
      title: input.title?.trim() || null,
      company: input.company?.trim() || null,
      themePreference: input.themePreference || null,
      planId: quoted.quote.planId,
      includeSubscription: Boolean(quoted.quote.planId),
      designFeeGhs: quoted.quote.designFeeGhs,
      subscriptionFeeGhs: quoted.quote.subscriptionFeeGhs,
      totalGhs: quoted.quote.totalGhs,
    },
  });
  await createAuditLog({
    action: "CREATE",
    entity: "celecard_concierge",
    entityId: order.id,
    userId: input.customerUserId || undefined,
    details: { kind: "concierge_intake", totalGhs: order.totalGhs, paymentId: null },
  });
  return order;
}

export async function listConciergeOrders(input: {
  status?: string | null;
  search?: string | null;
  page?: number | string | null;
  limit?: number | string | null;
  customerUserId?: string | null;
}) {
  const { page, limit, skip } = parsePaginationInput(
    { page: input.page, limit: input.limit },
    { limit: ADMIN_TABLE_LIMIT }
  );
  const where: Prisma.SmartCardConciergeOrderWhereInput = {};
  if (input.customerUserId) where.customerUserId = input.customerUserId;
  if (input.status && input.status !== "all") where.status = input.status;
  const q = (input.search ?? "").trim();
  if (q) {
    where.OR = [
      { customerName: { contains: q } },
      { customerEmail: { contains: q } },
      { displayName: { contains: q } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.smartCardConciergeOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.smartCardConciergeOrder.count({ where }),
  ]);
  return paginatedResult(rows, total, page, limit);
}

export async function getConciergeOrder(id: string) {
  return prisma.smartCardConciergeOrder.findUnique({ where: { id } });
}

export async function markConciergePaid(input: {
  orderId: string;
  paymentId: string;
  paymentReference?: string | null;
  amountGhs: number;
}) {
  const order = await prisma.smartCardConciergeOrder.findUnique({ where: { id: input.orderId } });
  if (!order) return null;
  if (order.paymentId && order.paymentId === input.paymentId) return order;
  if (!pesewasMatch(order.totalGhs, Number(input.amountGhs))) {
    console.error("[celecard.concierge] amount mismatch", order.id, input.amountGhs, order.totalGhs);
    return null;
  }
  const updated = await prisma.smartCardConciergeOrder.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paymentId: input.paymentId,
      paymentReference: input.paymentReference || order.paymentReference,
    },
  });
  await createAuditLog({
    action: "PAYMENT",
    entity: "celecard_concierge",
    entityId: order.id,
    details: { kind: "concierge_paid", paymentId: input.paymentId, amountGhs: input.amountGhs },
  });
  return updated;
}

export async function applyConciergeAdminAction(
  actor: Actor,
  input: {
    orderId: string;
    action: "assign" | "start" | "fulfill" | "deliver" | "cancel" | "waive";
    reason?: string | null;
    notes?: string | null;
    cardId?: string | null;
  }
) {
  const order = await prisma.smartCardConciergeOrder.findUnique({ where: { id: input.orderId } });
  if (!order) throw new CeleCardAdminError("Order not found.", 404);
  if (!hasPermission({ role: actor.role }, Permission.CELECARD_CREATE)) {
    throw new CeleCardAdminError("You do not have permission to operate concierge orders.", 403);
  }

  if (input.action === "waive") {
    if (!hasPermission({ role: actor.role }, Permission.CELECARD_GRANT_COMPLIMENTARY)) {
      throw new CeleCardAdminError("Waiving a concierge fee requires complimentary permission.", 403);
    }
    const reason = (input.reason ?? "").trim();
    if (reason.length < 8) throw new CeleCardAdminError("A reason is required to waive the fee.");
    const updated = await prisma.smartCardConciergeOrder.update({
      where: { id: order.id },
      data: { status: order.status === "INTAKE" || order.status === "AWAITING_PAYMENT" ? "IN_PROGRESS" : order.status, notes: reason },
    });
    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entity: "celecard_concierge",
      entityId: order.id,
      details: { kind: "concierge_waive", reason, paymentId: null },
    });
    return updated;
  }

  if (input.action === "cancel") {
    const updated = await prisma.smartCardConciergeOrder.update({
      where: { id: order.id },
      data: { status: "CANCELLED", notes: input.reason || order.notes },
    });
    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entity: "celecard_concierge",
      entityId: order.id,
      details: { kind: "concierge_cancel" },
    });
    return updated;
  }

  if (input.action === "assign" || input.action === "start") {
    return prisma.smartCardConciergeOrder.update({
      where: { id: order.id },
      data: {
        assignedAdminId: actor.id,
        status: order.status === "PAID" || order.status === "INTAKE" || order.status === "AWAITING_PAYMENT" ? "IN_PROGRESS" : order.status,
        notes: input.notes || order.notes,
      },
    });
  }

  if (input.action === "fulfill") {
    if (order.status !== "PAID" && order.status !== "IN_PROGRESS") {
      throw new CeleCardAdminError("Fulfill only after the order is paid, in progress, or waived.", 409);
    }
    const paid = Boolean(order.paymentId);
    const created = await createAssistedCeleCard(actor, {
      ownerUserId: order.customerUserId,
      unclaimedEmail: order.customerUserId ? null : order.customerEmail,
      unclaimedPhone: order.customerPhone,
      displayName: order.displayName,
      title: order.title,
      company: order.company,
      bio: order.brief,
      email: order.customerEmail,
      phone: order.customerPhone,
      themeId: order.themePreference,
      isPublished: false,
      activation: { kind: "draft" },
    });
    if (paid && order.includeSubscription && order.planId) {
      const catalog = await getCeleCardCatalog();
      const plan = getSmartCardPlanFromCatalog(order.planId, catalog.plans);
      if (plan) {
        const expiresAt = smartCardExpiryFromNow(plan.months);
        await prisma.digitalBusinessCard.update({
          where: { id: created.card.id },
          data: {
            subscriptionStatus: "ACTIVE",
            subscriptionExpiresAt: expiresAt,
            isPublished: true,
            lastActivatedAt: new Date(),
            lastActivationPaymentId: order.paymentId,
            entitlementKind: "PAID_CONCIERGE",
            lastCourtesyAt: null,
          },
        });
        await prisma.smartCardEntitlementGrant.create({
          data: {
            cardId: created.card.id,
            kind: "PAID_CONCIERGE",
            planId: plan.id,
            months: plan.months,
            startsAt: new Date(),
            expiresAt,
            reason: `Verified concierge payment ${order.paymentId}`,
            grantedByUserId: actor.id,
            approvalRef: order.paymentId,
          },
        });
      }
    }
    await prisma.smartCardConciergeOrder.update({
      where: { id: order.id },
      data: {
        status: "READY",
        cardId: created.card.id,
        assignedAdminId: actor.id,
      },
    });
    await recordCeleCardLifecycleEvent({
      cardId: created.card.id,
      kind: "CardCreated",
      meta: { conciergeOrderId: order.id, paymentId: order.paymentId },
    });
    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entity: "celecard_concierge",
      entityId: order.id,
      details: { kind: "concierge_fulfill", cardId: created.card.id, paymentId: order.paymentId },
    });
    return { orderId: order.id, ...created };
  }

  if (input.action === "deliver") {
    const cardId = input.cardId || order.cardId;
    if (!cardId) throw new CeleCardAdminError("Create the card before delivering it.");
    const origin = getAppUrlFromEnv();
    const updated = await prisma.smartCardConciergeOrder.update({
      where: { id: order.id },
      data: { status: "DELIVERED", deliveredAt: new Date(), cardId },
    });
    await communicationService.trySendDirect({
      channel: "EMAIL",
      to: order.customerEmail,
      subject: "Your CeleYou is ready",
      body: `Your concierge CeleYou is ready. Open ${origin}/dashboard/business-card to manage it. This message does not include private access codes or payment details.`,
    });
    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entity: "celecard_concierge",
      entityId: order.id,
      details: { kind: "concierge_deliver", cardId },
    });
    return updated;
  }

  throw new CeleCardAdminError("Unknown concierge action.");
}

export { CELECARD_CONCIERGE_PAYMENT_KIND };
