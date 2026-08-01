import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveEventAccess } from "@/lib/workspace/event-access";
import type { EventAccessContext } from "@/lib/workspace/event-access";

export type QrHubGuardFailure = { ok: false; status: number; error: string };
export type QrHubGuardSuccess = {
  ok: true;
  userId: string;
  eventId: string;
  access: EventAccessContext;
  canManage: boolean;
  canDownload: boolean;
  canManageVendor: boolean;
  canViewScans: boolean;
};
export type QrHubGuardResult = QrHubGuardSuccess | QrHubGuardFailure;

export async function requireQrHubAccess(
  eventId: string | null,
  options: { downloadOnly?: boolean } = {}
): Promise<QrHubGuardResult> {
  if (!eventId) return { ok: false, status: 400, error: "eventId is required" };

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Sign in to manage event QR assets" };
  }

  const access = await resolveEventAccess(eventId, session.user.id, session.user.role);
  if (!access) return { ok: false, status: 404, error: "Event not found" };

  const canManage =
    access.permissions.has("MANAGE_EVENT_QR_ASSETS") ||
    access.permissions.has("MANAGE_GUESTS") ||
    access.isOwner;
  const canDownload =
    canManage ||
    access.permissions.has("DOWNLOAD_EVENT_QR_ASSETS") ||
    access.permissions.has("SCAN_QR");
  const canManageVendor =
    access.permissions.has("MANAGE_VENDOR_ACCESS") || canManage;
  const canViewScans =
    access.permissions.has("VIEW_QR_SCAN_HISTORY") ||
    access.permissions.has("SCAN_QR") ||
    canManage;

  if (options.downloadOnly) {
    if (!canDownload) {
      return { ok: false, status: 403, error: "You do not have permission to download QR assets" };
    }
  } else if (!canManage && !canDownload) {
    return { ok: false, status: 403, error: "You do not have access to the Event QR Hub" };
  }

  return {
    ok: true,
    userId: session.user.id,
    eventId,
    access,
    canManage,
    canDownload,
    canManageVendor,
    canViewScans,
  };
}
