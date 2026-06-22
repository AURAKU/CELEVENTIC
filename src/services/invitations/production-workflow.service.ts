import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { paymentService } from "@/services/payments/payment.service";
import { productionNotificationService } from "@/services/invitations/production-notification.service";
import {
  categoryToRevisionType,
  DEFAULT_EXTRA_REVISION_PRICE,
} from "@/lib/invitation-production/constants";
import type {
  InvitationWorkflowStage,
  InvitationWorkflowType,
  RevisionChangeCategory,
  Prisma,
} from "@prisma/client";

export class ProductionWorkflowService {
  inferWorkflowType(packageSlug: string, addonSlugs: string[] = []): InvitationWorkflowType {
    if (packageSlug === "bespoke") return "BESPOKE";
    if (addonSlugs.some((s) => s.includes("ai"))) return "AI_ASSISTED";
    if (["signature", "prestige"].includes(packageSlug)) return "DESIGNER_ASSISTED";
    return "SELF_SERVICE";
  }

  async setWorkflowStage(orderId: string, stage: InvitationWorkflowStage) {
    return prisma.invitationOrder.update({
      where: { id: orderId },
      data: { workflowStage: stage },
    });
  }

  async getProductionSummary(orderId: string) {
    const order = await prisma.invitationOrder.findUnique({
      where: { id: orderId },
      include: {
        package: true,
        assignedDesigner: { select: { id: true, name: true, email: true } },
        revisions: {
          orderBy: { revisionNumber: "desc" },
          include: {
            comments: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } },
            payments: true,
          },
        },
        productionAssignments: {
          orderBy: { assignedAt: "desc" },
          include: { designer: { select: { name: true, email: true } } },
        },
        approvals: { orderBy: { approvedAt: "desc" } },
        payment: true,
      },
    });
    if (!order) throw new Error("Order not found");

    const included = order.package.revisions;
    const used = order.revisionsUsed;
    const remaining = Math.max(0, included - used);

    return {
      order,
      workflowType: order.workflowType,
      workflowStage: order.workflowStage,
      includedRevisions: included,
      usedRevisions: used,
      remainingRevisions: remaining,
      extraRevisionPrice: Number(order.extraRevisionPriceGhs ?? DEFAULT_EXTRA_REVISION_PRICE),
      previewUrl: order.previewUrl,
      previewVideoUrl: order.previewVideoUrl,
      missingInfoRequest: order.missingInfoRequest,
      adminNotes: order.adminNotes,
    };
  }

  async onPackageSelected(orderId: string, packageSlug: string) {
    const addonSlugs = [] as string[];
    const workflowType = this.inferWorkflowType(packageSlug, addonSlugs);
    return prisma.invitationOrder.update({
      where: { id: orderId },
      data: { workflowType, workflowStage: "PACKAGE_SELECTED" },
    });
  }

  async onAddonsSelected(orderId: string, addonSlugs: string[]) {
    const order = await prisma.invitationOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    const workflowType = this.inferWorkflowType(order.packageSlug, addonSlugs);
    return prisma.invitationOrder.update({
      where: { id: orderId },
      data: { workflowType, workflowStage: "ADDONS_SELECTED" },
    });
  }

  async onPaymentPending(orderId: string) {
    return this.setWorkflowStage(orderId, "PAYMENT_PENDING");
  }

  async onPaymentSuccessful(orderId: string, userId: string) {
    const order = await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        workflowStage: "PAYMENT_SUCCESSFUL",
        status: "PAID",
      },
      include: { package: true },
    });

    const needsInfo = !order.eventTitle || !order.eventDate;
    if (needsInfo) {
      await this.setWorkflowStage(orderId, "INFORMATION_PENDING");
    } else if (order.package.designerAssist || order.workflowType !== "SELF_SERVICE") {
      await prisma.invitationOrder.update({
        where: { id: orderId },
        data: {
          workflowStage: "PRODUCTION_STARTED",
          status: "IN_PRODUCTION",
          productionStatus: "ASSIGNED",
        },
      });
    }

    await productionNotificationService.notify(userId, "PAYMENT_SUCCESSFUL", { orderId });
    await productionNotificationService.notify(userId, "ORDER_RECEIVED", { orderId });
    return order;
  }

  async assignDesigner(orderId: string, designerId: string, adminUserId: string, notes?: string) {
    const assignment = await prisma.$transaction(async (tx) => {
      await tx.productionAssignment.updateMany({
        where: { orderId, status: "ACTIVE" },
        data: { status: "REASSIGNED", completedAt: new Date() },
      });

      const assignment = await tx.productionAssignment.create({
        data: { orderId, designerId, assignedBy: adminUserId, notes },
      });

      await tx.invitationOrder.update({
        where: { id: orderId },
        data: {
          assignedDesignerId: designerId,
          productionStatus: "ASSIGNED",
          workflowStage: "PRODUCTION_STARTED",
          status: "IN_PRODUCTION",
        },
      });

      return assignment;
    });

    await createAuditLog({
      userId: adminUserId,
      action: "UPDATE",
      entity: "production_assignment",
      entityId: orderId,
      details: { designerId },
    });

    return assignment;
  }

  async requestMissingInfo(orderId: string, message: string, adminUserId: string) {
    const order = await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        missingInfoRequest: message,
        productionStatus: "AWAITING_CUSTOMER_INFO",
        workflowStage: "INFORMATION_PENDING",
      },
      include: { user: true },
    });

    await productionNotificationService.notify(order.userId, "MISSING_INFO", {
      orderId,
      customMessage: message,
    });

    await createAuditLog({
      userId: adminUserId,
      action: "UPDATE",
      entity: "invitation_order",
      entityId: orderId,
      details: { missingInfoRequest: message },
    });

    return order;
  }

  async uploadPreview(orderId: string, previewUrl: string, previewVideoUrl?: string) {
    const order = await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        previewUrl,
        previewVideoUrl,
        productionStatus: "DESIGNING",
        workflowStage: "DESIGN_READY",
      },
      include: { user: true },
    });

    await productionNotificationService.notify(order.userId, "DESIGN_READY", { orderId });
    return order;
  }

  async sendForApproval(orderId: string, adminUserId: string) {
    const order = await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        productionStatus: "AWAITING_APPROVAL",
        workflowStage: "CUSTOMER_REVIEWING",
      },
      include: { user: true },
    });

    await productionNotificationService.notify(order.userId, "DESIGN_READY", {
      orderId,
      customMessage: "Your design is ready for review. Please approve or request revisions.",
    });

    await createAuditLog({
      userId: adminUserId,
      action: "UPDATE",
      entity: "invitation_order",
      entityId: orderId,
      details: { action: "send_for_approval" },
    });

    return order;
  }

  async requestRevision(
    orderId: string,
    userId: string,
    data: { changeCategory: RevisionChangeCategory; notes: string }
  ) {
    const order = await prisma.invitationOrder.findUnique({
      where: { id: orderId },
      include: { package: true },
    });
    if (!order || order.userId !== userId) throw new Error("Order not found");

    const revisionType = categoryToRevisionType(data.changeCategory);
    const nextNum = order.revisionsUsed + 1;
    const included = order.package.revisions;
    const isMajor = revisionType === "MAJOR";
    const needsPayment = isMajor && nextNum > included;

    const amount = needsPayment ? Number(order.extraRevisionPriceGhs ?? DEFAULT_EXTRA_REVISION_PRICE) : null;

    const revision = await prisma.invitationRevision.create({
      data: {
        invitationOrderId: orderId,
        revisionNumber: nextNum,
        revisionType,
        changeCategory: data.changeCategory,
        notes: data.notes,
        isExtraPaid: needsPayment,
        amountGhs: amount ?? undefined,
        status: needsPayment ? "AWAITING_PAYMENT" : "REQUESTED",
      },
    });

    if (needsPayment && amount) {
      await prisma.revisionPayment.create({
        data: { revisionId: revision.id, amountGhs: amount, status: "PENDING" },
      });
    }

    await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        revisionsUsed: nextNum,
        productionStatus: "REVISION",
        workflowStage: needsPayment ? "REVISION_REQUESTED" : "REVISION_IN_PROGRESS",
        status: "REVISION_REQUESTED",
      },
    });

    await productionNotificationService.notify(userId, "REVISION_RECEIVED", { orderId });

    return revision;
  }

  async addComment(revisionId: string, userId: string, content: string, isAdmin = false) {
    return prisma.revisionComment.create({
      data: { revisionId, userId, content, isAdmin },
      include: { user: { select: { name: true } } },
    });
  }

  async approveDesign(orderId: string, userId: string, notes?: string, revisionId?: string) {
    const order = await prisma.invitationOrder.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new Error("Order not found");

    const approval = await prisma.$transaction(async (tx) => {
      const approval = await tx.invitationApproval.create({
        data: { orderId, revisionId, approvedBy: userId, notes },
      });

      if (revisionId) {
        await tx.invitationRevision.update({
          where: { id: revisionId },
          data: {
            customerApproved: true,
            customerApprovedAt: new Date(),
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      }

      await tx.invitationOrder.update({
        where: { id: orderId },
        data: {
          productionStatus: "APPROVED",
          workflowStage: "APPROVED",
          status: "APPROVED",
        },
      });

      return approval;
    });

    await productionNotificationService.notify(userId, "INVITATION_APPROVED", { orderId });
    return approval;
  }

  async adminUpdateRevision(
    revisionId: string,
    adminUserId: string,
    data: {
      status?: string;
      adminNotes?: string;
      adminResponse?: string;
      chargeAmount?: number;
    }
  ) {
    const revision = await prisma.invitationRevision.update({
      where: { id: revisionId },
      data: {
        status: data.status as never,
        adminNotes: data.adminNotes,
        adminResponse: data.adminResponse,
        ...(data.chargeAmount !== undefined
          ? { amountGhs: data.chargeAmount, isExtraPaid: true }
          : {}),
        completedAt: data.status === "COMPLETED" ? new Date() : undefined,
      },
      include: { invitationOrder: true },
    });

    if (data.status === "IN_PROGRESS") {
      await prisma.invitationOrder.update({
        where: { id: revision.invitationOrderId },
        data: { workflowStage: "REVISION_IN_PROGRESS", productionStatus: "REVISION" },
      });
    }
    if (data.status === "AWAITING_APPROVAL") {
      await this.sendForApproval(revision.invitationOrderId, adminUserId);
    }
    if (data.status === "COMPLETED") {
      await prisma.invitationOrder.update({
        where: { id: revision.invitationOrderId },
        data: { productionStatus: "APPROVED", workflowStage: "APPROVED" },
      });
    }

    if (data.chargeAmount && data.chargeAmount > 0) {
      const existing = await prisma.revisionPayment.findFirst({ where: { revisionId } });
      if (!existing) {
        await prisma.revisionPayment.create({
          data: { revisionId, amountGhs: data.chargeAmount, status: "PENDING" },
        });
        await prisma.invitationRevision.update({
          where: { id: revisionId },
          data: { status: "AWAITING_PAYMENT" },
        });
      }
    }

    return revision;
  }

  async initializeRevisionPayment(revisionId: string, userId: string) {
    const revision = await prisma.invitationRevision.findUnique({
      where: { id: revisionId },
      include: {
        invitationOrder: { include: { user: true, payment: true } },
        payments: { where: { status: "PENDING" }, take: 1 },
      },
    });
    if (!revision || revision.invitationOrder.userId !== userId) {
      throw new Error("Revision not found");
    }

    const revPayment = revision.payments[0];
    const amount = Number(revPayment?.amountGhs ?? revision.amountGhs ?? DEFAULT_EXTRA_REVISION_PRICE);
    const email = revision.invitationOrder.contactEmail ?? revision.invitationOrder.user.email ?? "guest@celeventic.com";

    const payment = await paymentService.initializePayment(
      userId,
      "PAYSTACK",
      "INVITATION_REVISION",
      {
        email,
        amount,
        currency: "GHS",
        purpose: "INVITATION_REVISION",
        metadata: { revisionId, invitationOrderId: revision.invitationOrderId },
      },
      {
        invitationOrderId: revision.invitationOrderId,
        idempotencyKey: `revision-${revisionId}`,
      }
    );

    if (revPayment) {
      await prisma.revisionPayment.update({
        where: { id: revPayment.id },
        data: { paymentId: payment.payment.id },
      });
    }

    return payment;
  }

  async onRevisionPaymentSuccess(revisionId: string) {
    const revision = await prisma.invitationRevision.findUnique({
      where: { id: revisionId },
      include: { invitationOrder: true },
    });
    if (!revision) return;

    await prisma.revisionPayment.updateMany({
      where: { revisionId, status: "PENDING" },
      data: { status: "PAID" },
    });

    await prisma.invitationRevision.update({
      where: { id: revisionId },
      data: { status: "IN_PROGRESS", isExtraPaid: true },
    });

    await prisma.invitationOrder.update({
      where: { id: revision.invitationOrderId },
      data: { workflowStage: "REVISION_IN_PROGRESS", productionStatus: "REVISION" },
    });
  }

  async deliverOrder(orderId: string, adminUserId: string, shareUrl?: string) {
    const order = await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        productionStatus: "DELIVERED",
        workflowStage: "DELIVERED",
        status: "APPROVED",
        ...(shareUrl ? { shareUrl } : {}),
      },
      include: { user: true },
    });

    await prisma.productionAssignment.updateMany({
      where: { orderId, status: "ACTIVE" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await productionNotificationService.notify(order.userId, "INVITATION_PUBLISHED", {
      orderId,
      link: order.shareUrl ?? undefined,
      customMessage: "Your final invitation has been delivered.",
    });

    await createAuditLog({
      userId: adminUserId,
      action: "UPDATE",
      entity: "invitation_order",
      entityId: orderId,
      details: { action: "delivered" },
    });

    return order;
  }

  async publishOrder(orderId: string) {
    const order = await prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        workflowStage: "PUBLISHED",
        status: "PUBLISHED",
        productionStatus: "DELIVERED",
      },
      include: { user: true },
    });

    await productionNotificationService.notify(order.userId, "INVITATION_PUBLISHED", {
      orderId,
      link: order.shareUrl ?? undefined,
    });

    return order;
  }

  async archiveOrder(orderId: string) {
    return prisma.invitationOrder.update({
      where: { id: orderId },
      data: {
        workflowStage: "ARCHIVED",
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
    });
  }
}

export const productionWorkflowService = new ProductionWorkflowService();
