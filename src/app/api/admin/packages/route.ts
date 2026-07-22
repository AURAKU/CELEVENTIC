import { NextResponse } from "next/server";
import { z } from "zod";
import { adminService } from "@/services/admin/admin.service";
import { requireAdminSession } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const packages = await adminService.getPackages();
  return NextResponse.json({ success: true, data: packages });
}

const createSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  price: z.number().min(0),
  currency: z.string().optional(),
  guestLimit: z.number().optional(),
  invitationLimit: z.number().optional(),
  ticketLimit: z.number().optional(),
  smsCredits: z.number().optional(),
  whatsappCredits: z.number().optional(),
  emailCredits: z.number().optional(),
  features: z.array(z.string()).optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial().extend({ id: z.string() });

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const data = createSchema.parse(await req.json());
    const pkg = await adminService.createPackage(data);
    await createAuditLog({ userId: session.user.id, action: "CREATE", entity: "package", entityId: pkg.id });
    return NextResponse.json({ success: true, data: pkg }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { id, ...rest } = updateSchema.parse(body);
    const pkg = await adminService.updatePackage(id, rest);
    await createAuditLog({ userId: session.user.id, action: "UPDATE", entity: "package", entityId: id, details: rest });
    return NextResponse.json({ success: true, data: pkg });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const result = await adminService.deletePackage(id);
  await createAuditLog({ userId: session.user.id, action: "DELETE", entity: "package", entityId: id });
  return NextResponse.json({ success: true, data: result });
}
