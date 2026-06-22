import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { productionWorkflowService } from "@/services/invitations/production-workflow.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const payment = await productionWorkflowService.initializeRevisionPayment(id, session.user.id);
    return NextResponse.json({
      success: true,
      data: {
        reference: payment.reference,
        authorizationUrl: payment.authorizationUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment init failed" },
      { status: 400 }
    );
  }
}
