import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { designExportService } from "@/services/template-engine/design-export.service";

const schema = z.object({
  templateId: z.string().optional(),
  designId: z.string().optional(),
  eventId: z.string().optional(),
  format: z.enum(["PNG", "JPG", "PDF", "WEB", "TICKET_PDF", "QR_PASS"]),
  dimensionKey: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = schema.parse(await req.json());
    const result = await designExportService.createExport({
      userId: session.user.id,
      templateId: data.templateId,
      designId: data.designId,
      eventId: data.eventId,
      format: data.format,
      dimensionKey: data.dimensionKey as never,
      config: data.config as never,
    });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
