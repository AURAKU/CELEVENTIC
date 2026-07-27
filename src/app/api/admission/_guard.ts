import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { rateLimit } from "@/lib/rate-limit";
import type { UserRole } from "@prisma/client";

/** Shared auth/rate-limit plumbing for every admission endpoint. */

export interface GateActor {
  userId: string;
  role: UserRole;
}

export type GuardFailure = { status: number; error: string };

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function deviceInfo(req: Request): string {
  return JSON.stringify({
    ua: req.headers.get("user-agent")?.slice(0, 200) ?? "unknown",
    ip: clientIp(req),
  });
}

export async function requireActor(): Promise<GateActor | GuardFailure> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { status: 401, error: "Unauthorized" };
  return { userId: session.user.id, role: session.user.role as UserRole };
}

export async function requireGate(
  eventId: string,
  actor: GateActor,
  permission: EventPermissionKey = EventPermissionKey.SCAN_QR
): Promise<GuardFailure | null> {
  try {
    await requireEventPermission(eventId, actor.userId, actor.role, permission);
    return null;
  } catch {
    return { status: 403, error: "You do not have permission to work this gate" };
  }
}

export async function limit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<GuardFailure | null> {
  const result = await rateLimit(key, max, windowSeconds);
  return result.success ? null : { status: 429, error: "Too many requests. Slow down and retry." };
}

export function isFailure(value: unknown): value is GuardFailure {
  return typeof value === "object" && value !== null && "status" in value && "error" in value;
}
