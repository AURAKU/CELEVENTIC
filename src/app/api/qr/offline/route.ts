import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { offlineQrService } from "@/services/qr/offline-qr.service";
import { verifyEventAccess } from "@/lib/event-access";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const data = await offlineQrService.syncEventData(eventId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied" },
      { status: 403 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (body.action === "register") {
      const schema = z.object({ eventId: z.string(), deviceName: z.string() });
      const data = schema.parse(body);
      await verifyEventAccess(data.eventId, session.user.id, session.user.role);
      const device = await offlineQrService.registerDevice(data.eventId, session.user.id, data.deviceName);
      return NextResponse.json({ success: true, data: device }, { status: 201 });
    }

    if (body.action === "sync") {
      const schema = z.object({ deviceId: z.string() });
      const data = schema.parse(body);
      await offlineQrService.verifyDeviceAccess(data.deviceId, session.user.id);
      const result = await offlineQrService.syncCheckins(data.deviceId);
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "bulk_checkin") {
      const schema = z.object({
        deviceId: z.string(),
        checkins: z.array(
          z.object({
            qrToken: z.string(),
            result: z.enum(["VALID", "INVALID", "ALREADY_USED", "EXPIRED", "WRONG_EVENT"]),
            guestId: z.string().optional(),
            ticketId: z.string().optional(),
          })
        ),
      });
      const data = schema.parse(body);
      await offlineQrService.verifyDeviceAccess(data.deviceId, session.user.id);
      const created = await offlineQrService.bulkRecordCheckins(data.deviceId, data.checkins);
      const result = await offlineQrService.syncCheckins(data.deviceId);
      return NextResponse.json({ success: true, data: { created: created.length, ...result } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Offline QR operation failed" }, { status: 500 });
  }
}
