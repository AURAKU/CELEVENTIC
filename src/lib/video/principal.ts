import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyEventAccess } from "@/lib/event-access";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { canAccessAdminPanel } from "@/lib/rbac";
import type { VideoCategory } from "@/lib/video/constants";
import type { VideoAsset, VideoOwnerType } from "@prisma/client";

export interface UploadPrincipal {
  ownerType: VideoOwnerType;
  /** Signed-in user id, or the eventId for guest-token uploads (used for quota grouping). */
  ownerId: string;
  eventId: string | null;
  vendorId: string | null;
  /** Extra context persisted on the VideoAsset (guest name, upload token, role, etc). */
  context: Record<string, unknown>;
}

export class UploadAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "UploadAuthError";
    this.status = status;
  }
}

export interface ResolvePrincipalInput {
  category: VideoCategory;
  eventId?: string | null;
  vendorId?: string | null;
  orderId?: string | null;
  /** Guestbook uploads authenticate via a short-lived event upload token instead of a session. */
  guestToken?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
}

/**
 * Resolve who is allowed to upload for a given category, enforcing category-specific
 * auth + ownership rules. Never trust a client-supplied ownerId/eventId/vendorId without
 * verifying the caller actually has access to it.
 */
export async function resolveUploadPrincipal(input: ResolvePrincipalInput): Promise<UploadPrincipal> {
  switch (input.category) {
    case "GUESTBOOK": {
      if (!input.guestToken) throw new UploadAuthError("Upload token required for guestbook videos.", 401);
      const record = await eventMemoryTokenService.resolveToken(input.guestToken);
      if (!record || record.type !== "UPLOAD") {
        throw new UploadAuthError("Invalid or expired upload token.", 403);
      }
      return {
        ownerType: "GUEST_TOKEN",
        ownerId: record.eventId,
        eventId: record.eventId,
        vendorId: null,
        context: {
          guestToken: input.guestToken,
          guestName: input.guestName ?? null,
          guestPhone: input.guestPhone ?? null,
        },
      };
    }

    case "VENDOR_PORTFOLIO": {
      const session = await getSession();
      if (!session?.user?.id) throw new UploadAuthError("Sign in required.");
      const vendor = await vendorProfileService.getByUserId(session.user.id);
      if (!vendor) throw new UploadAuthError("A vendor profile is required to upload portfolio videos.", 403);
      return {
        ownerType: "USER",
        ownerId: session.user.id,
        eventId: null,
        vendorId: vendor.id,
        context: {},
      };
    }

    case "EVENT_SHORT": {
      const session = await getSession();
      if (!session?.user?.id) throw new UploadAuthError("Sign in required.");
      if (!input.eventId) throw new UploadAuthError("eventId is required for event videos.", 400);
      await verifyEventAccess(input.eventId, session.user.id, session.user.role);
      return {
        ownerType: "USER",
        ownerId: session.user.id,
        eventId: input.eventId,
        vendorId: null,
        context: {},
      };
    }

    case "ADMIN": {
      const session = await getSession();
      if (!session?.user?.id || !canAccessAdminPanel(session.user.role)) {
        throw new UploadAuthError("Admin access required.", 403);
      }
      return {
        ownerType: "USER",
        ownerId: session.user.id,
        eventId: input.eventId ?? null,
        vendorId: null,
        context: {},
      };
    }

    case "INVITATION_BACKGROUND":
    case "PREMIUM":
    default: {
      const session = await getSession();
      if (!session?.user?.id) throw new UploadAuthError("Sign in required.");
      if (input.orderId) {
        const order = await prisma.invitationOrder.findUnique({
          where: { id: input.orderId },
          select: { userId: true },
        });
        if (!order || order.userId !== session.user.id) {
          throw new UploadAuthError("You do not have access to this invitation order.", 403);
        }
      }
      return {
        ownerType: "USER",
        ownerId: session.user.id,
        eventId: input.eventId ?? null,
        vendorId: null,
        context: input.orderId ? { orderId: input.orderId } : {},
      };
    }
  }
}

/**
 * Re-verifies caller identity for every follow-up call on an existing asset (multipart
 * create/part/complete, complete, cancel, status). Session-owned assets require a matching
 * session; guest-token (guestbook) assets require re-presenting a still-valid UPLOAD token
 * for the same event — there is no session to check.
 */
export async function assertAssetAccess(
  asset: VideoAsset,
  opts: { guestToken?: string | null }
): Promise<void> {
  if (asset.ownerType === "GUEST_TOKEN") {
    if (!opts.guestToken) throw new UploadAuthError("Upload token required.", 401);
    const record = await eventMemoryTokenService.resolveToken(opts.guestToken);
    if (!record || record.type !== "UPLOAD" || record.eventId !== asset.eventId) {
      throw new UploadAuthError("Invalid or expired upload token.", 403);
    }
    return;
  }

  const session = await getSession();
  if (!session?.user?.id || session.user.id !== asset.ownerId) {
    throw new UploadAuthError("You do not have access to this upload.", 403);
  }
}
