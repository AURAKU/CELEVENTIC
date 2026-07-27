import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { admitByPass, getEventAdmissionSettings } from "@/services/admission/guest-pass.service";
import { normalizeAdmissionCode } from "@/lib/admission/pass-code";
import { clientIp, deviceInfo, isFailure, limit, requireActor, requireGate } from "../_guard";

export const dynamic = "force-dynamic";

const admitSchema = z
  .object({
    eventId: z.string().min(1),
    token: z.string().min(1).max(200).optional(),
    code: z.string().min(1).max(20).optional(),
    quantity: z.number().int().positive().max(200).optional(),
    guestIds: z.array(z.string().min(1)).max(200).optional(),
    gate: z.string().max(80).optional(),
    /** Evaluate without writing — powers the confirm-before-admit flow. */
    dryRun: z.boolean().optional(),
    /** The operator answered the "how many now?" prompt. */
    quantityConfirmed: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.token || v.code), {
    message: "A pass QR or admission code is required",
  });

/**
 * The gate endpoint: scan a Guest Entry Pass QR or type its admission code.
 *
 * Manual codes get their own tight rate limit (they are the only guessable
 * surface), and every attempt — successful or not — lands in the scan ledger.
 */
export async function POST(req: Request) {
  const actor = await requireActor();
  if (isFailure(actor)) {
    return NextResponse.json({ success: false, error: actor.error }, { status: actor.status });
  }

  let data: z.infer<typeof admitSchema>;
  try {
    data = admitSchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0].message : "Invalid request";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const gateDenied = await requireGate(data.eventId, actor);
  if (gateDenied) {
    return NextResponse.json({ success: false, error: gateDenied.error }, { status: gateDenied.status });
  }

  const settings = await getEventAdmissionSettings(data.eventId);

  const throttled = data.code
    ? await limit(
        `admission-code:${data.eventId}:${actor.userId}:${clientIp(req)}`,
        settings.manualCodeAttemptLimit,
        settings.manualCodeAttemptWindowSeconds
      )
    : await limit(`admission-scan:${actor.userId}:${clientIp(req)}`, 300, 60);
  if (throttled) {
    await createAuditLog({
      userId: actor.userId,
      action: "QR_SCAN",
      entity: "admission",
      entityId: data.eventId,
      details: { kind: "rate_limited", channel: data.code ? "manual_code" : "qr" },
    });
    return NextResponse.json({ success: false, error: throttled.error }, { status: throttled.status });
  }

  const result = await admitByPass({
    eventId: data.eventId,
    token: data.token,
    code: data.code ? normalizeAdmissionCode(data.code) : undefined,
    quantity: data.quantity,
    guestIds: data.guestIds,
    scannerUserId: actor.userId,
    gate: data.gate ?? null,
    deviceInfo: deviceInfo(req),
    dryRun: data.dryRun,
    quantityConfirmed: data.quantityConfirmed,
  });

  await createAuditLog({
    userId: actor.userId,
    action: "QR_SCAN",
    entity: "guest_pass",
    entityId: result.pass?.id,
    details: {
      kind: data.dryRun ? "pass_preview" : "pass_admit",
      channel: data.code ? "manual_code" : "qr",
      eventId: data.eventId,
      outcome: result.decision.outcome,
      reason: result.decision.reason,
      quantity: result.decision.admitQuantity,
    },
  });

  return NextResponse.json({
    success: result.decision.tone !== "red",
    data: {
      decision: result.decision,
      pass: result.pass
        ? {
            code: result.pass.code,
            displayName: result.pass.displayName,
            partySize: result.pass.partySize,
            admittedCount: result.pass.admittedCount,
            status: result.pass.status,
            revision: result.pass.revision,
          }
        : null,
      party: result.party,
      seating: result.seating,
      seatingContinuity: result.seatingContinuity,
      eventTitle: result.eventTitle,
    },
  });
}
