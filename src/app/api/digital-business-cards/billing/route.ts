import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSmartCardBilling } from "@/services/digital-business-card/smartcard-billing.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getSmartCardBilling(session.user.id);
  return NextResponse.json({ success: true, data });
}
