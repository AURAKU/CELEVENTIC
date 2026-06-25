import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface InvitationMediaLimits {
  minPhotos: number;
  maxPhotos: number;
  minVideos: number;
  maxVideos: number;
  maxImageBytes: number;
  maxVideoBytes: number;
  allowVideoBackground: boolean;
  allowSlideshowVideo: boolean;
}

const DEFAULT_LIMITS: InvitationMediaLimits = {
  minPhotos: 5,
  maxPhotos: 7,
  minVideos: 3,
  maxVideos: 5,
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 50 * 1024 * 1024,
  allowVideoBackground: true,
  allowSlideshowVideo: true,
};

const LIMITS_KEY = "invitation.media.limits";

async function loadLimits(): Promise<InvitationMediaLimits> {
  const row = await prisma.adminSetting.findUnique({ where: { key: LIMITS_KEY } });
  if (!row?.value || typeof row.value !== "object") return DEFAULT_LIMITS;
  return { ...DEFAULT_LIMITS, ...(row.value as Partial<InvitationMediaLimits>) };
}

export const getInvitationMediaLimits = unstable_cache(loadLimits, ["invitation-media-limits"], {
  revalidate: 120,
  tags: ["invitation-media-limits"],
});

export async function saveInvitationMediaLimits(limits: Partial<InvitationMediaLimits>) {
  const merged = { ...DEFAULT_LIMITS, ...limits };
  await prisma.adminSetting.upsert({
    where: { key: LIMITS_KEY },
    update: { value: merged, category: "invitations" },
    create: { key: LIMITS_KEY, value: merged, category: "invitations" },
  });
  return merged;
}

export { DEFAULT_LIMITS as DEFAULT_INVITATION_MEDIA_LIMITS };
