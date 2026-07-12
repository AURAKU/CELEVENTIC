import { prisma } from "@/lib/prisma";
import type { EventType, Prisma } from "@prisma/client";
import { getBlueprint } from "@/lib/blueprints";
import { entitlementService } from "@/services/entitlements/entitlement.service";
import { buildWorkspaceNavigation } from "@/services/entitlements/navigation-builder";
import { chatService } from "@/services/workspace/chat.service";
import { slugify, generateToken } from "@/lib/utils";

export class WorkspaceProvisionService {
  async provisionForEvent(eventId: string, userId: string, role: import("@prisma/client").UserRole) {
    const existing = await prisma.eventWorkspace.findUnique({ where: { eventId } });
    if (existing) {
      return this.getWorkspaceContext(eventId, userId, role);
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { package: true },
    });
    if (!event) throw new Error("Event not found");

    const blueprint = getBlueprint(event.eventType);
    const featureStates = entitlementService.resolveFeatureStates(
      event.eventType,
      event.package?.name
    );

    await prisma.$transaction(async (tx) => {
      await tx.eventWorkspace.create({
        data: {
          eventId,
          eventType: event.eventType,
          stage: event.status,
          configuration: {
            defaultSections: blueprint.defaultSections,
            analyticsWidgets: blueprint.analyticsWidgets,
            templateCategories: blueprint.templateCategories,
            vendorCategories: blueprint.vendorCategories,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.eventEnabledFeature.createMany({
        data: featureStates.map((f, i) => ({
          eventId,
          featureKey: f.featureKey,
          isEnabled: f.isEnabled,
          isLocked: f.isLocked,
          requiredPlan: f.requiredPlan,
          source: "blueprint",
          sortOrder: i,
        })),
      });

      const walletExists = await tx.wallet.findUnique({ where: { eventId } });
      if (!walletExists) {
        await tx.wallet.create({
          data: { eventId, balance: 0, currency: "GHS" },
        });
      }
    });

    await chatService.ensureDefaultChannels(eventId);

    return this.getWorkspaceContext(eventId, userId, role);
  }

  async getWorkspaceContext(eventId: string, userId: string, role: import("@prisma/client").UserRole) {
    let workspace = await prisma.eventWorkspace.findUnique({
      where: { eventId },
      include: {
        features: { orderBy: { sortOrder: "asc" } },
        event: { include: { package: true } },
      },
    });

    if (!workspace) {
      await this.provisionForEvent(eventId, userId, role);
      workspace = await prisma.eventWorkspace.findUnique({
        where: { eventId },
        include: {
          features: { orderBy: { sortOrder: "asc" } },
          event: { include: { package: true } },
        },
      });
    }

    if (!workspace) throw new Error("Workspace not found");

    const blueprint = getBlueprint(workspace.eventType);
    const navigation = await buildWorkspaceNavigation({
      eventId,
      eventType: workspace.eventType,
      packageName: workspace.event.package?.name,
      eventStatus: workspace.event.status,
      userId,
      role,
      enabledFeatures: workspace.features,
    });

    await prisma.eventWorkspace.update({
      where: { eventId },
      data: { navigation: navigation as unknown as Prisma.InputJsonValue },
    });

    return {
      eventId,
      eventType: workspace.eventType,
      eventTitle: workspace.event.title,
      stage: workspace.stage,
      terminology: blueprint.terminology,
      navigation,
      features: workspace.features,
      templateCategories: blueprint.templateCategories,
      vendorCategories: blueprint.vendorCategories,
      analyticsWidgets: blueprint.analyticsWidgets,
      blueprint: {
        label: blueprint.label,
        defaultModules: blueprint.defaultModules,
        optionalModules: blueprint.optionalModules,
        hiddenModules: blueprint.hiddenModules,
      },
    };
  }

  async createEventWithWorkspace(input: {
    title: string;
    eventType: EventType;
    hostName: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    venueName?: string;
    landmark?: string;
    mapsLink?: string;
    contactPhone?: string;
    dressCode?: string;
    expectedGuests?: number;
    pricingType?: "FREE" | "PAID";
    coverImageUrl?: string;
    themeId?: string;
    packageId?: string;
    organizerId: string;
    typeSpecific?: Record<string, unknown>;
  }, userRole: import("@prisma/client").UserRole) {
    const blueprint = getBlueprint(input.eventType);

    const [packageId, themeId] = await Promise.all([
      input.packageId
        ? prisma.eventPackage.findFirst({ where: { OR: [{ id: input.packageId }, { slug: input.packageId }] } }).then((p) => p?.id)
        : undefined,
      input.themeId
        ? prisma.eventTemplate.findFirst({ where: { OR: [{ id: input.themeId }, { slug: input.themeId }] } }).then((t) => t?.id)
        : undefined,
    ]);

    const pkg = packageId
      ? await prisma.eventPackage.findUnique({ where: { id: packageId } })
      : null;

    return prisma.$transaction(async (tx) => {
      const slug = `${slugify(input.title)}-${generateToken(6)}`;

      const event = await tx.event.create({
        data: {
          title: input.title,
          eventType: input.eventType,
          hostName: input.hostName,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          venueName: input.venueName,
          landmark: input.landmark,
          mapsLink: input.mapsLink,
          contactPhone: input.contactPhone,
          dressCode: input.dressCode,
          expectedGuests: input.expectedGuests,
          pricingType: input.pricingType ?? "FREE",
          coverImageUrl: input.coverImageUrl,
          themeId,
          packageId,
          organizerId: input.organizerId,
          slug,
          status: "DRAFT",
        },
        include: { package: true },
      });

      const featureStates = entitlementService.resolveFeatureStates(
        input.eventType,
        pkg?.name ?? event.package?.name
      );

      await tx.eventWorkspace.create({
        data: {
          eventId: event.id,
          eventType: input.eventType,
          stage: "DRAFT",
          configuration: {
            defaultSections: blueprint.defaultSections,
            typeSpecific: input.typeSpecific,
            analyticsWidgets: blueprint.analyticsWidgets,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.eventEnabledFeature.createMany({
        data: featureStates.map((f, i) => ({
          eventId: event.id,
          featureKey: f.featureKey,
          isEnabled: f.isEnabled,
          isLocked: f.isLocked,
          requiredPlan: f.requiredPlan,
          source: "blueprint",
          sortOrder: i,
        })),
      });

      await tx.wallet.create({
        data: { eventId: event.id, balance: 0, currency: "GHS" },
      });

      return event;
    }).then(async (event) => {
      await chatService.ensureDefaultChannels(event.id);
      return event;
    });
  }
}

export const workspaceProvisionService = new WorkspaceProvisionService();
