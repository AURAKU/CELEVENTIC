import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePackageFeatureKeys } from "@/lib/packages/feature-catalog";
import {
  eventPackageSpecForInvitation,
  FLYER_EVENT_PACKAGE_SPECS,
  isUpgrade,
  type EventPackageSpec,
} from "@/lib/packages/invitation-entitlements";
import { entitlementService } from "@/services/entitlements/entitlement.service";
import {
  customisationThreadId,
  isCustomisationInvitationPackage,
} from "@/lib/invitation-mvp/packages";
import { messageService } from "@/services/messages/message.service";
import { notificationService } from "@/services/notifications/notification.service";
import { workspaceProvisionService } from "@/services/entitlements/workspace-provision.service";

async function upsertEventPackage(spec: EventPackageSpec) {
  const featuresJson = spec.features as Prisma.InputJsonValue;
  const row = await prisma.eventPackage.upsert({
    where: { slug: spec.slug },
    update: {
      name: spec.name,
      description: spec.description,
      price: spec.price,
      guestLimit: spec.guestLimit,
      invitationLimit: spec.invitationLimit,
      ticketLimit: spec.ticketLimit,
      smsCredits: spec.smsCredits,
      emailCredits: spec.emailCredits,
      whatsappCredits: spec.whatsappCredits,
      sortOrder: spec.sortOrder,
      features: featuresJson,
      isActive: true,
    },
    create: {
      slug: spec.slug,
      name: spec.name,
      description: spec.description,
      price: spec.price,
      guestLimit: spec.guestLimit,
      invitationLimit: spec.invitationLimit,
      ticketLimit: spec.ticketLimit,
      smsCredits: spec.smsCredits,
      emailCredits: spec.emailCredits,
      whatsappCredits: spec.whatsappCredits,
      sortOrder: spec.sortOrder,
      features: featuresJson,
      isActive: true,
    },
  });

  const keys = normalizePackageFeatureKeys(spec.features);
  await prisma.eventPackageFeature.deleteMany({ where: { packageId: row.id } });
  if (keys.length > 0) {
    await prisma.eventPackageFeature.createMany({
      data: keys.map((featureKey) => ({
        packageId: row.id,
        featureKey,
        isIncluded: true,
      })),
    });
  }
  return row;
}

export async function ensureFlyerEventPackages() {
  for (const spec of FLYER_EVENT_PACKAGE_SPECS) {
    await upsertEventPackage(spec);
  }
}

async function resolveCeleventicTeamUserId(): Promise<string | null> {
  const byEmail = await prisma.user.findFirst({
    where: { email: "admin@celeventic.com" },
    select: { id: true },
  });
  if (byEmail) return byEmail.id;
  const superAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return superAdmin?.id ?? null;
}

async function refreshEventFeatures(eventId: string, packageName: string, unlockAll: boolean) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { eventType: true },
  });
  if (!event) return;
  const states = entitlementService.resolveFeatureStates(event.eventType, packageName, undefined, {
    unlockAll,
  });
  for (const [i, state] of states.entries()) {
    await prisma.eventEnabledFeature.upsert({
      where: { eventId_featureKey: { eventId, featureKey: state.featureKey } },
      update: {
        isEnabled: state.isEnabled,
        isLocked: state.isLocked,
        requiredPlan: state.requiredPlan ?? null,
        sortOrder: i,
      },
      create: {
        eventId,
        featureKey: state.featureKey,
        isEnabled: state.isEnabled,
        isLocked: state.isLocked,
        requiredPlan: state.requiredPlan ?? null,
        sortOrder: i,
      },
    });
  }
}

async function upgradeOrganizationPlan(userId: string, planSlug: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true, organization: { select: { plan: true } } },
  });
  const org =
    membership?.organizationId
      ? { id: membership.organizationId, plan: membership.organization.plan }
      : await prisma.organization.findFirst({
          where: { users: { some: { id: userId } } },
          select: { id: true, plan: true },
        });
  if (!org) return;
  if (!isUpgrade(org.plan, planSlug)) return;
  await prisma.organization.update({
    where: { id: org.id },
    data: { plan: planSlug },
  });
}

export async function openCustomisationTeamChat(input: {
  orderId: string;
  userId: string;
  packageName: string;
  eventTitle?: string | null;
  templateSlug?: string | null;
}): Promise<string | null> {
  const teamId = await resolveCeleventicTeamUserId();
  if (!teamId || teamId === input.userId) return null;

  const threadId = customisationThreadId(input.orderId);
  const existing = await prisma.userMessage.findFirst({
    where: { threadId },
    select: { id: true },
  });
  if (existing) return threadId;

  const eventLabel = input.eventTitle?.trim() || "your celebration";
  const templateBit = input.templateSlug ? ` (starting from ${input.templateSlug})` : "";
  const body = [
    `Welcome. Your ${input.packageName} package is unlocked.`,
    `We're the Celeventic team, and we'll custom-build the invitation for ${eventLabel}${templateBit}.`,
    `Reply here with your brief: names, colours, photos, ceremony flow, and anything the template must include.`,
    `Studio is already open so you can watch the design come to life while we work.`,
  ].join("\n\n");

  await messageService.send({
    senderId: teamId,
    recipientId: input.userId,
    threadId,
    subject: `${input.packageName} · Celeventic team`,
    body,
  });

  await notificationService.notify(input.userId, {
    title: "Celeventic team is ready",
    message: `Chat with us about your ${input.packageName} package.`,
    type: "message",
    link: `/dashboard/messages?thread=${encodeURIComponent(threadId)}`,
  });

  await notificationService.notify(teamId, {
    title: "New Customisation brief",
    message: `A host paid for ${input.packageName} and is waiting in chat.`,
    type: "message",
    link: `/dashboard/messages?thread=${encodeURIComponent(threadId)}`,
  });

  return threadId;
}

export type UnlockResult = {
  eventPackageSlug: string | null;
  threadId: string | null;
  nextPath: string;
};

/**
 * After a successful invitation-package payment: attach EventPackage entitlements
 * so the host can actually build the event, upgrade the org plan, and (for
 * Customisation) open an in-platform team chat.
 */
export async function unlockPaidInvitationPackage(orderId: string): Promise<UnlockResult> {
  await ensureFlyerEventPackages();

  const order = await prisma.invitationOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      packageSlug: true,
      eventId: true,
      eventTitle: true,
      templateSlug: true,
      package: { select: { name: true } },
    },
  });
  if (!order) {
    return { eventPackageSlug: null, threadId: null, nextPath: `/invitations/create/${orderId}/studio` };
  }

  const spec = eventPackageSpecForInvitation(order.packageSlug);
  let eventPackageSlug: string | null = spec?.slug ?? null;

  if (spec) {
    const pkg = await upsertEventPackage(spec);
    eventPackageSlug = pkg.slug;
    if (order.eventId) {
      await prisma.event.update({
        where: { id: order.eventId },
        data: { packageId: pkg.id },
      });
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { role: true },
      });
      if (user?.role) {
        await workspaceProvisionService.provisionForEvent(order.eventId, order.userId, user.role);
      }
      await refreshEventFeatures(
        order.eventId,
        pkg.name,
        isCustomisationInvitationPackage(order.packageSlug)
      );
    }
    await upgradeOrganizationPlan(order.userId, pkg.slug);
  }

  let threadId: string | null = null;
  if (isCustomisationInvitationPackage(order.packageSlug)) {
    threadId = await openCustomisationTeamChat({
      orderId: order.id,
      userId: order.userId,
      packageName: order.package?.name ?? "Customisation",
      eventTitle: order.eventTitle,
      templateSlug: order.templateSlug,
    });
  }

  const nextPath = threadId
    ? `/dashboard/messages?thread=${encodeURIComponent(threadId)}`
    : `/invitations/create/${orderId}/studio`;

  return { eventPackageSlug, threadId, nextPath };
}
