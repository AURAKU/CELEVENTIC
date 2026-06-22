import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { vendorLeadService } from "@/services/vendor-os/vendor-lead.service";
import { rateLimit } from "@/lib/rate-limit";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";

const leadSchema = z.object({
  vendorId: z.string(),
  eventId: z.string().optional(),
  eventType: z.string().optional(),
  eventDate: z.string().optional(),
  guestCount: z.number().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  location: z.string().optional(),
  message: z.string().optional(),
  contactName: z.string().min(2),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await vendorProfileService.getByUserId(session.user.id);
  if (vendor) {
    const leads = await vendorLeadService.getVendorLeads(vendor.id);
    return NextResponse.json({ success: true, data: leads });
  }
  const leads = await vendorLeadService.getOrganizerLeads(session.user.id);
  return NextResponse.json({ success: true, data: leads });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`vendor-lead:${session.user.id}`, 10, 3600);
  if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = leadSchema.parse(await req.json());
    const lead = await vendorLeadService.createLead({ ...body, organizerId: session.user.id });
    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Lead submission failed" }, { status: 500 });
  }
}
