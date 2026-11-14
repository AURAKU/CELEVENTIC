import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { generateToken, slugify } from "@/lib/utils";
import type { AccountType, EventCollaboratorRole, UserRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { complianceService } from "@/services/legal/compliance.service";
import {
  celeCardOwnerStartPath,
  isCeleCardProductIntent,
} from "@/lib/digital-business-card/access";
import { parseCeleYouUsername } from "@/lib/digital-business-card/username";
import { claimCeleYouUsername } from "@/services/digital-business-card/username.service";

const ACCOUNT_ROLE_MAP: Record<AccountType, UserRole> = {
  ORGANIZER: "ORGANIZER",
  EVENT_OWNER: "ORGANIZER",
  VENDOR: "VENDOR",
  ORGANIZATION: "ORGANIZER",
};

export interface OnboardingInput {
  accountType: AccountType;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  username?: string;
  companyName?: string;
  city?: string;
  region?: string;
  country?: string;
  vendorCategory?: string;
  organizationName?: string;
  joinIntent?: boolean;
  /** CeleYou-first signup. Same User row, skips event getting-started. */
  productIntent?: string | null;
}

export class OnboardingService {
  mapAccountTypeToRole(accountType: AccountType): UserRole {
    return ACCOUNT_ROLE_MAP[accountType];
  }

  getPostSignupRedirect(
    accountType: AccountType,
    onboardingCompletedAt?: Date | null,
    joinIntent?: boolean,
    options?: { vendorCategory?: string; productIntent?: string | null }
  ) {
    if (isCeleCardProductIntent(options?.productIntent)) {
      return celeCardOwnerStartPath();
    }
    if (accountType === "VENDOR") {
      const category = options?.vendorCategory?.trim();
      if (category) {
        return `/vendor/onboarding?category=${encodeURIComponent(category)}`;
      }
      return "/vendor/onboarding";
    }
    if (!onboardingCompletedAt) {
      const base = "/dashboard/getting-started";
      if (joinIntent) return `${base}?intent=join`;
      return base;
    }
    return "/dashboard";
  }

  async register(input: OnboardingInput) {
    const role = this.mapAccountTypeToRole(input.accountType);
    const username = input.username?.trim().toLowerCase();

    const requestedUsername = username || undefined;

    if (input.email) {
      const email = input.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new Error("Email already registered");
      input.email = email;
    }

    if (input.phone) {
      const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
      if (existing) throw new Error("Phone already registered");
    }

    let organizationId: string | undefined;

    if (input.accountType === "ORGANIZATION" && input.organizationName) {
      const org = await prisma.organization.create({
        data: {
          name: input.organizationName,
          slug: `${slugify(input.organizationName)}-${generateToken(4)}`,
          country: input.country ?? "GH",
        },
      });
      organizationId = org.id;
    }

    const celeCardFirst = isCeleCardProductIntent(input.productIntent);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: input.passwordHash,
        role,
        accountType: input.accountType,
        username: undefined,
        companyName: input.companyName,
        organizationId,
        onboardingCompletedAt: celeCardFirst ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        accountType: true,
        onboardingCompletedAt: true,
      },
    });

    if (organizationId) {
      await prisma.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          role: "OWNER",
        },
      });
    }

    if (input.accountType === "ORGANIZER" || input.accountType === "ORGANIZATION") {
      const slug = requestedUsername ?? `${slugify(input.name)}-${generateToken(4)}`;
      await prisma.organizerProfile.create({
        data: {
          userId: user.id,
          slug,
          city: input.city,
          region: input.region,
          country: input.country ?? "GH",
          isPublic: input.accountType === "ORGANIZER" || input.accountType === "ORGANIZATION",
        },
      });
    }

    if (requestedUsername) {
      const parsed = parseCeleYouUsername(requestedUsername);
      if (!parsed.ok) throw new Error(parsed.message);
      await claimCeleYouUsername({
        userId: user.id,
        username: parsed.username,
        actorId: user.id,
        seed: { displayName: input.name, company: input.companyName },
      }).catch(() => {
        throw new Error("Username already taken");
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      details: { accountType: input.accountType },
    });

    try {
      await complianceService.recordLegalAcceptance(user.id);
    } catch (error) {
      console.warn("[onboarding] legal acceptance skipped", error);
    }

    return {
      user,
      redirect: this.getPostSignupRedirect(
        input.accountType,
        user.onboardingCompletedAt,
        input.joinIntent,
        { vendorCategory: input.vendorCategory, productIntent: input.productIntent }
      ),
    };
  }

  async completeOnboarding(userId: string, accountType: AccountType) {
    return prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date(), accountType },
    });
  }
}

export const onboardingService = new OnboardingService();

export async function searchUsers(
  query: string,
  pagination?: { page?: number; limit?: number }
) {
  const { page, limit, skip } = parsePaginationInput(pagination);
  const q = query.trim();
  if (!q) return paginatedResult([], 0, page, limit);

  const where = {
    OR: [
      { name: { contains: q } },
      { email: { contains: q.toLowerCase() } },
      { phone: { contains: q } },
      { username: { contains: q.toLowerCase() } },
      ...(q.length >= 8 ? [{ id: q }] : []),
    ],
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        username: true,
        avatarUrl: true,
        role: true,
        accountType: true,
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return paginatedResult(items, total, page, limit);
}
