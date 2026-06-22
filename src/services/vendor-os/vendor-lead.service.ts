import { prisma } from "@/lib/prisma";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";
import { notificationService } from "@/services/notifications/notification.service";
import { messageService } from "@/services/messages/message.service";

export interface CreateLeadInput {
  vendorId: string;
  organizerId: string;
  eventId?: string;
  eventType?: string;
  eventDate?: string;
  guestCount?: number;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  message?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export class VendorLeadService {
  async createLead(input: CreateLeadInput) {
    const lead = await prisma.vendorLead.create({
      data: {
        vendorId: input.vendorId,
        organizerId: input.organizerId,
        eventId: input.eventId,
        eventType: input.eventType,
        eventDate: input.eventDate ? new Date(input.eventDate) : undefined,
        guestCount: input.guestCount,
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        location: input.location,
        message: input.message,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        status: "NEW",
      },
    });

    await vendorProfileService.trackEvent(input.vendorId, "LEAD_SUBMIT", { leadId: lead.id });

    const vendor = await prisma.vendor.findUnique({
      where: { id: input.vendorId },
      select: { userId: true, businessName: true },
    });

    if (vendor) {
      if (input.message?.trim()) {
        await messageService.send({
          senderId: input.organizerId,
          recipientId: vendor.userId,
          body: input.message.trim(),
          leadId: lead.id,
          threadId: `lead:${lead.id}`,
          subject: `Enquiry for ${vendor.businessName}`,
        });
      } else {
        await notificationService.notify(vendor.userId, {
          title: "New vendor enquiry",
          message: input.contactName
            ? `${input.contactName} sent an enquiry about your services`
            : "A new organizer enquiry was received",
          type: "vendor_lead",
          link: `/dashboard/vendor-portal?lead=${lead.id}`,
        });
      }
    }

    return lead;
  }

  async getVendorLeads(vendorId: string, status?: string) {
    return prisma.vendorLead.findMany({
      where: { vendorId, ...(status ? { status: status as never } : {}) },
      include: { organizer: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateLeadStatus(leadId: string, vendorId: string, status: string) {
    return prisma.vendorLead.updateMany({
      where: { id: leadId, vendorId },
      data: { status: status as never },
    });
  }

  async getOrganizerLeads(organizerId: string) {
    return prisma.vendorLead.findMany({
      where: { organizerId },
      include: { vendor: { select: { businessName: true, slug: true, profileImage: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const vendorLeadService = new VendorLeadService();
