import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import type { EventStatus, Prisma, UserRole, UserStatus } from "@prisma/client";

export class AdminService {
  async getStats() {
    const [users, events, invitations, tickets, revenue, messages, qrScans] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.invitation.count(),
      prisma.ticket.aggregate({ _sum: { soldCount: true } }),
      prisma.payment.aggregate({
        where: { status: "SUCCESSFUL" },
        _sum: { amount: true },
      }),
      prisma.campaignMessage.count({ where: { status: "SENT" } }),
      prisma.qrScan.count({ where: { result: "VALID" } }),
    ]);

    return {
      totalUsers: users,
      totalEvents: events,
      totalInvitations: invitations,
      totalTicketsSold: tickets._sum.soldCount ?? 0,
      totalRevenue: Number(revenue._sum.amount ?? 0),
      totalMessagesSent: messages,
      totalQrScans: qrScans,
    };
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          isVerified: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { events: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
  }) {
    const passwordHash = await hashPassword(data.password);
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        passwordHash,
        role: data.role,
        status: "ACTIVE",
        isVerified: true,
      },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
  }

  async resetUserPassword(userId: string, password: string) {
    const passwordHash = await hashPassword(password);
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash, sessionInvalidatedAt: new Date() },
      select: { id: true, email: true },
    });
  }

  async updateUser(
    userId: string,
    data: Partial<{ name: string; email: string; phone: string; role: UserRole; status: UserStatus }>
  ) {
    if (data.role && data.role !== "SUPER_ADMIN") {
      const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (target?.role === "SUPER_ADMIN") {
        const superAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
        if (superAdmins <= 1) {
          throw new Error("Cannot remove the last Super Admin");
        }
      }
    }

    const payload = {
      ...data,
      ...(data.email ? { email: data.email.toLowerCase() } : {}),
    };

    return prisma.user.update({
      where: { id: userId },
      data: payload,
      select: { id: true, name: true, email: true, role: true, status: true },
    });
  }

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { events: true } } },
    });
    if (!user) throw new Error("User not found");
    if (user.role === "SUPER_ADMIN") {
      const superAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      if (superAdmins <= 1) throw new Error("Cannot delete the last super admin");
    }
    if (user._count.events > 0) {
      return prisma.user.update({
        where: { id: userId },
        data: { status: "SUSPENDED" },
      });
    }
    return prisma.user.delete({ where: { id: userId } });
  }

  async getPayments(page = 1, limit = 20, status?: string) {
    const where = status ? { status: status as "PENDING" | "SUCCESSFUL" | "FAILED" } : {};

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total, page, limit };
  }

  async getAuditLogs(page = 1, limit = 50, action?: string) {
    const where = action ? { action: action as never } : {};
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  async getSettings() {
    return prisma.adminSetting.findMany({ orderBy: { category: "asc" } });
  }

  async updateSetting(key: string, value: Record<string, unknown>) {
    const jsonValue = value as Prisma.InputJsonValue;
    return prisma.adminSetting.upsert({
      where: { key },
      update: { value: jsonValue },
      create: { key, value: jsonValue, category: key.split(".")[0] },
    });
  }

  async deleteSetting(key: string) {
    return prisma.adminSetting.delete({ where: { key } });
  }

  async getPackages() {
    return prisma.eventPackage.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async createPackage(data: {
    name: string;
    slug?: string;
    description?: string;
    price: number;
    guestLimit?: number;
    invitationLimit?: number;
    ticketLimit?: number;
    smsCredits?: number;
    whatsappCredits?: number;
    emailCredits?: number;
    features?: string[];
    sortOrder?: number;
  }) {
    const slug = data.slug ?? data.name.toLowerCase().replace(/\s+/g, "-");
    return prisma.eventPackage.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        price: data.price,
        guestLimit: data.guestLimit ?? 100,
        invitationLimit: data.invitationLimit ?? 50,
        ticketLimit: data.ticketLimit ?? 500,
        smsCredits: data.smsCredits ?? 0,
        whatsappCredits: data.whatsappCredits ?? 0,
        emailCredits: data.emailCredits ?? 0,
        features: data.features as Prisma.InputJsonValue,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updatePackage(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      price: number;
      guestLimit: number;
      invitationLimit: number;
      ticketLimit: number;
      smsCredits: number;
      whatsappCredits: number;
      emailCredits: number;
      features: string[];
      isActive: boolean;
      sortOrder: number;
    }>
  ) {
    return prisma.eventPackage.update({
      where: { id },
      data: {
        ...data,
        features: data.features as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deletePackage(id: string) {
    const linked = await prisma.event.count({ where: { packageId: id } });
    if (linked > 0) {
      return prisma.eventPackage.update({ where: { id }, data: { isActive: false } });
    }
    return prisma.eventPackage.delete({ where: { id } });
  }

  async getEvents(page = 1, limit = 20, search?: string, status?: string) {
    const where: Prisma.EventWhereInput = {
      ...(status ? { status: status as EventStatus } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { hostName: { contains: search } },
              { slug: { contains: search } },
            ],
          }
        : {}),
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          organizer: { select: { id: true, name: true, email: true } },
          package: { select: { name: true } },
          _count: { select: { guests: true, tickets: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return { events, total, page, limit };
  }

  async updateEvent(
    id: string,
    data: Partial<{
      title: string;
      status: EventStatus;
      isPublic: boolean;
      isFeatured: boolean;
      hostName: string;
    }>
  ) {
    return prisma.event.update({ where: { id }, data });
  }

  async deleteEvent(id: string) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new Error("Event not found");
    if (["LIVE", "PUBLISHED"].includes(event.status)) {
      return prisma.event.update({ where: { id }, data: { status: "CANCELLED" } });
    }
    return prisma.event.delete({ where: { id } });
  }

  async getTemplates() {
    return prisma.eventTemplate.findMany({ orderBy: { name: "asc" } });
  }

  async updateLegacyTemplate(id: string, data: { name?: string; isActive?: boolean; category?: string }) {
    return prisma.eventTemplate.update({ where: { id }, data });
  }

  async deleteLegacyTemplate(id: string) {
    return prisma.eventTemplate.update({ where: { id }, data: { isActive: false } });
  }

  slugify(text: string) {
    return `${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${generateToken(4)}`;
  }
}

export const adminService = new AdminService();
