import { prisma } from "@/lib/prisma";

/** Free / starter defaults when an event has no package attached. */
export const FREE_PLAN_GUEST_LIMIT = 5;
export const FREE_PLAN_INVITATION_LIMIT = 5;

export type PackageQuota = {
  guestLimit: number;
  invitationLimit: number;
  packageName: string;
  packageSlug: string;
  isFree: boolean;
};

export class PackageQuotaError extends Error {
  readonly code = "PACKAGE_QUOTA";
  readonly upgradeHint = true;

  constructor(message: string) {
    super(message);
    this.name = "PackageQuotaError";
  }
}

/**
 * Resolve guest/invitation caps for an event from its EventPackage,
 * falling back to the free starter package, then hardcoded free limits.
 */
export async function resolveEventPackageQuota(eventId: string): Promise<PackageQuota> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      package: {
        select: {
          name: true,
          slug: true,
          price: true,
          guestLimit: true,
          invitationLimit: true,
        },
      },
    },
  });

  if (event?.package) {
    return {
      guestLimit: event.package.guestLimit,
      invitationLimit: event.package.invitationLimit,
      packageName: event.package.name,
      packageSlug: event.package.slug,
      isFree: Number(event.package.price) === 0,
    };
  }

  const starter = await prisma.eventPackage.findFirst({
    where: { OR: [{ slug: "starter" }, { price: 0 }], isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      name: true,
      slug: true,
      price: true,
      guestLimit: true,
      invitationLimit: true,
    },
  });

  if (starter) {
    return {
      guestLimit: starter.guestLimit,
      invitationLimit: starter.invitationLimit,
      packageName: starter.name,
      packageSlug: starter.slug,
      isFree: Number(starter.price) === 0,
    };
  }

  return {
    guestLimit: FREE_PLAN_GUEST_LIMIT,
    invitationLimit: FREE_PLAN_INVITATION_LIMIT,
    packageName: "Free",
    packageSlug: "starter",
    isFree: true,
  };
}

export async function assertInvitationQuota(eventId: string, adding = 1): Promise<void> {
  const quota = await resolveEventPackageQuota(eventId);
  const current = await prisma.invitation.count({ where: { eventId } });
  if (current + adding > quota.invitationLimit) {
    throw new PackageQuotaError(
      `Your ${quota.packageName} plan allows ${quota.invitationLimit} invitation${
        quota.invitationLimit === 1 ? "" : "s"
      }. You have ${current}. Upgrade to a paid plan to create more.`
    );
  }
}

export async function assertGuestQuota(
  eventId: string,
  adding = 1,
  plusOnes = 0
): Promise<void> {
  const quota = await resolveEventPackageQuota(eventId);
  const current = await prisma.guest.count({
    where: { eventId, archivedAt: null },
  });
  // Count the new guest plus any plus-ones against the plan seat budget.
  const seatsNeeded = adding + Math.max(0, plusOnes);
  if (current + seatsNeeded > quota.guestLimit) {
    throw new PackageQuotaError(
      `Your ${quota.packageName} plan allows up to ${quota.guestLimit} guests. You have ${current}. Upgrade to a paid plan to invite more.`
    );
  }
}
