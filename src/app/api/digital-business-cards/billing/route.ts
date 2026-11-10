import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSmartCardBilling } from "@/services/digital-business-card/smartcard-billing.service";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const data = await getSmartCardBilling(session.user.id, {
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[celecard.billing]", error);
    return NextResponse.json({ error: "Could not load billing" }, { status: 500 });
  }
}
