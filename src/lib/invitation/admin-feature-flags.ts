import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface InvitationFeatureFlags {
  audioUpload: boolean;
  audioLibrary: boolean;
  videoUpload: boolean;
  slideshow: boolean;
  seating: boolean;
  qr: boolean;
  memoryVault: boolean;
  thankYouPage: boolean;
  rsvp: boolean;
  ticketing: boolean;
  contributions: boolean;
  vendorAccess: boolean;
  organizationAccess: boolean;
  templateMarketplace: boolean;
  userCreatedTemplates: boolean;
}

export const DEFAULT_INVITATION_FEATURE_FLAGS: InvitationFeatureFlags = {
  audioUpload: true,
  audioLibrary: true,
  videoUpload: true,
  slideshow: true,
  seating: true,
  qr: true,
  memoryVault: true,
  thankYouPage: true,
  rsvp: true,
  ticketing: true,
  contributions: true,
  vendorAccess: true,
  organizationAccess: true,
  templateMarketplace: true,
  userCreatedTemplates: true,
};

const FLAGS_KEY = "invitation.feature.flags";

async function loadFlags(): Promise<InvitationFeatureFlags> {
  const row = await prisma.adminSetting.findUnique({ where: { key: FLAGS_KEY } });
  if (!row?.value || typeof row.value !== "object") return DEFAULT_INVITATION_FEATURE_FLAGS;
  return { ...DEFAULT_INVITATION_FEATURE_FLAGS, ...(row.value as Partial<InvitationFeatureFlags>) };
}

export const getInvitationFeatureFlags = unstable_cache(loadFlags, ["invitation-feature-flags"], {
  revalidate: 60,
  tags: ["invitation-feature-flags"],
});

export async function saveInvitationFeatureFlags(flags: Partial<InvitationFeatureFlags>) {
  const merged = { ...DEFAULT_INVITATION_FEATURE_FLAGS, ...flags };
  await prisma.adminSetting.upsert({
    where: { key: FLAGS_KEY },
    update: { value: merged, category: "invitations" },
    create: { key: FLAGS_KEY, value: merged, category: "invitations" },
  });
  return merged;
}

export function isInvitationFeatureEnabled(
  flags: InvitationFeatureFlags,
  key: keyof InvitationFeatureFlags
): boolean {
  return flags[key] !== false;
}
