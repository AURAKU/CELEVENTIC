import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import {
  buildOfflinePackage,
  reconcileOfflineAdmissions,
} from "@/services/admission/offline-admission.service";
import { clientIp, isFailure, limit, requireActor, requireGate } from "../_guard";

export const dynamic = "force-dynamic";

/**
 * Offline gate support.
 *
 * GET  → download the signed-hash admission package for a device.
 * POST → register a device, or replay the admissions it captured offline.
 */
export async function GET(req: Request) {
  const actor = await requireActor();
  if (isFailure(actor)) {
    return NextResponse.json({ success: false, error: actor.error }, { status: actor.status });
  }

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
  }

  const denied = await requireGate(eventId, actor);
  if (denied) {
    return NextResponse.json({ success: false, error: denied.error }, { status: denied.status });
  }

  const throttled = await limit(`admission-offline-pkg:${actor.userId}`, 20, 300);
  if (throttled) {
    return NextResponse.json({ success: false, error: throttled.error }, { status: throttled.status });
  }

  try {
    const pkg = await buildOfflinePackage(eventId);
    return NextResponse.json(
      { success: true, data: pkg },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build offline package";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

const registerSchema = z.object({
  action: z.literal("register"),
  eventId: z.string().min(1),
  deviceName: z.string().trim().min(1).max(80),
});

const syncSchema = z.object({
  action: z.literal("sync"),
  eventId: z.string().min(1),
  deviceId: z.string().min(1),
  records: z
    .array(
      z.object({
        clientRecordId: z.string().min(8).max(100),
        tokenHash: z.string().length(64).optional().nullable(),
        code: z.string().max(20).optional().nullable(),
        quantity: z.number().int().positive().max(200),
        guestIds: z.array(z.string().min(1)).max(200).optional(),
        capturedAt: z.string().datetime(),
        usedManualCode: z.boolean().optional(),
      })
    )
    .max(500),
});

const bodySchema = z.discriminatedUnion("action", [registerSchema, syncSchema]);

export async function POST(req: Request) {
  const actor = await requireActor();
  if (isFailure(actor)) {
    return NextResponse.json({ success: false, error: actor.error }, { status: actor.status });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await req.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0].message : "Invalid request";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const denied = await requireGate(payload.eventId, actor);
  if (denied) {
    return NextResponse.json({ success: false, error: denied.error }, { status: denied.status });
  }

  const throttled = await limit(`admission-offline:${actor.userId}:${clientIp(req)}`, 60, 60);
  if (throttled) {
    return NextResponse.json({ success: false, error: throttled.error }, { status: throttled.status });
  }

  try {
    if (payload.action === "register") {
      // One row per (user, device name, event) so re-registering the same phone
      // resumes its identity instead of orphaning its pending records.
      const existing = await prisma.offlineDevice.findFirst({
        where: { eventId: payload.eventId, userId: actor.userId, deviceName: payload.deviceName },
      });
      const device =
        existing ??
        (await prisma.offlineDevice.create({
          data: {
            eventId: payload.eventId,
            userId: actor.userId,
            deviceName: payload.deviceName,
            deviceToken: generateToken(32),
            isAuthorized: true,
          },
        }));

      if (!device.isAuthorized) {
        return NextResponse.json(
          { success: false, error: "This device has been de-authorised by an organiser" },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { deviceId: device.id, deviceName: device.deviceName },
      });
    }

    const result = await reconcileOfflineAdmissions(
      payload.deviceId,
      payload.eventId,
      payload.records,
      actor.userId
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Offline operation failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
