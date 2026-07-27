import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { resolveAdmissionSettings } from "@/lib/admission/admission-settings";
import { ensureEventPasses } from "@/services/admission/guest-pass.service";
import { LONG_CODE_LENGTH, SHORT_CODE_LENGTH } from "@/lib/admission/pass-code";
import { clientIp, isFailure, limit, requireActor, requireGate } from "@/app/api/admission/_guard";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  qrAdmissionEnabled: z.boolean().optional(),
  qrRequiredForEntry: z.boolean().optional(),
  manualCodeEnabled: z.boolean().optional(),
  manualCodeLength: z.union([z.literal(SHORT_CODE_LENGTH), z.literal(LONG_CODE_LENGTH)]).optional(),
  offlineAdmissionEnabled: z.boolean().optional(),

  displayPassOnInvitation: z.boolean().optional(),
  allowPassDownload: z.boolean().optional(),
  allowPassPrint: z.boolean().optional(),
  showPartySizeOnPass: z.boolean().optional(),
  showTableOnPass: z.boolean().optional(),
  showSeatOnPass: z.boolean().optional(),
  hideSeatingUntilAdmitted: z.boolean().optional(),
  passInstructions: z.string().trim().max(500).nullable().optional(),

  allowPartialArrival: z.boolean().optional(),
  allowSeparateArrival: z.boolean().optional(),
  allowReEntry: z.boolean().optional(),
  reEntryWindowMinutes: z.number().int().min(0).max(1440).nullable().optional(),

  requireScannerConfirmation: z.boolean().optional(),
  fastAdmissionMode: z.boolean().optional(),
  requireOperatorAuth: z.boolean().optional(),

  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  validityLeadHours: z.number().int().min(0).max(720).optional(),
  validityTrailHours: z.number().int().min(0).max(720).optional(),
  offlinePackageTtlMinutes: z.number().int().min(5).max(10080).optional(),

  manualCodeAttemptLimit: z.number().int().min(1).max(200).optional(),
  manualCodeAttemptWindowSeconds: z.number().int().min(10).max(3600).optional(),
  duplicatePolicy: z.enum(["BLOCK", "WARN", "ALLOW"]).optional(),
  portalUnlockPolicy: z.enum(["ON_FIRST_ADMISSION", "ON_FULL_ADMISSION", "MANUAL"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const actor = await requireActor();
  if (isFailure(actor)) {
    return NextResponse.json({ success: false, error: actor.error }, { status: actor.status });
  }

  const denied = await requireGate(eventId, actor, EventPermissionKey.VIEW_EVENT);
  if (denied) {
    return NextResponse.json({ success: false, error: denied.error }, { status: denied.status });
  }

  const [row, event] = await Promise.all([
    prisma.eventAdmissionSettings.findUnique({ where: { eventId } }),
    prisma.event.findUnique({ where: { id: eventId }, select: { startDate: true } }),
  ]);

  return NextResponse.json({
    success: true,
    data: resolveAdmissionSettings(row, event?.startDate ?? null),
  });
}

/**
 * Update the event's admission policy.
 *
 * Turning `qrAdmissionEnabled` on back-fills passes for every existing
 * invitation, so an organiser who enables QR the morning of the event does not
 * have to touch each invite.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const actor = await requireActor();
  if (isFailure(actor)) {
    return NextResponse.json({ success: false, error: actor.error }, { status: actor.status });
  }

  const denied = await requireGate(eventId, actor, EventPermissionKey.EDIT_EVENT);
  if (denied) {
    return NextResponse.json({ success: false, error: denied.error }, { status: denied.status });
  }

  const throttled = await limit(`admission-settings:${actor.userId}:${clientIp(req)}`, 40, 60);
  if (throttled) {
    return NextResponse.json({ success: false, error: throttled.error }, { status: throttled.status });
  }

  let patch: z.infer<typeof settingsSchema>;
  try {
    patch = settingsSchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0].message : "Invalid settings";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, startDate: true },
  });
  if (!event) {
    return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
  }

  const { validFrom, validUntil, ...rest } = patch;
  const data = {
    ...rest,
    ...(validFrom !== undefined ? { validFrom: validFrom ? new Date(validFrom) : null } : {}),
    ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
  };

  const saved = await prisma.eventAdmissionSettings.upsert({
    where: { eventId },
    create: { eventId, ...data },
    update: data,
  });

  let backfilled: { issued: number; total: number } | null = null;
  if (patch.qrAdmissionEnabled === true) {
    backfilled = await ensureEventPasses(eventId);
  }

  await createAuditLog({
    userId: actor.userId,
    action: "UPDATE",
    entity: "event_admission_settings",
    entityId: eventId,
    details: { kind: "settings_updated", changed: Object.keys(patch), backfilled },
  });

  return NextResponse.json({
    success: true,
    data: resolveAdmissionSettings(saved, event.startDate),
    backfilled,
  });
}
