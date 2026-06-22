import { prisma } from "@/lib/prisma";

type ProductionNotificationType =
  | "ORDER_RECEIVED"
  | "PAYMENT_SUCCESSFUL"
  | "MISSING_INFO"
  | "DESIGN_READY"
  | "REVISION_RECEIVED"
  | "INVITATION_APPROVED"
  | "INVITATION_PUBLISHED";

const TEMPLATES: Record<ProductionNotificationType, { title: string; message: string }> = {
  ORDER_RECEIVED: {
    title: "Invitation Order Received",
    message: "Your invitation order has been received and is being processed.",
  },
  PAYMENT_SUCCESSFUL: {
    title: "Payment Successful",
    message: "Your payment was successful. Production will begin shortly.",
  },
  MISSING_INFO: {
    title: "Information Needed",
    message: "We need additional information to continue your invitation design.",
  },
  DESIGN_READY: {
    title: "Design Ready for Review",
    message: "Your invitation design is ready for your review and approval.",
  },
  REVISION_RECEIVED: {
    title: "Revision Request Received",
    message: "Your revision request has been received by our design team.",
  },
  INVITATION_APPROVED: {
    title: "Design Approved",
    message: "Your invitation design has been approved. Final delivery is being prepared.",
  },
  INVITATION_PUBLISHED: {
    title: "Invitation Published",
    message: "Your invitation is live! Share your guest link with invitees.",
  },
};

export class ProductionNotificationService {
  async notify(
    userId: string,
    type: ProductionNotificationType,
    options?: { orderId?: string; link?: string; customMessage?: string }
  ) {
    const tpl = TEMPLATES[type];
    const link = options?.link ?? (options?.orderId ? `/dashboard/my-invitations/${options.orderId}` : undefined);

    return prisma.notification.create({
      data: {
        userId,
        type: `production_${type.toLowerCase()}`,
        title: tpl.title,
        message: options?.customMessage ?? tpl.message,
        link,
      },
    });
  }
}

export const productionNotificationService = new ProductionNotificationService();
