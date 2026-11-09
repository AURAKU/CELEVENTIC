import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supportTicketService } from "@/services/support/support-ticket.service";

const replySchema = z.object({
  body: z.string().min(1).max(8000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const data = replySchema.parse(await req.json());
    const message = await supportTicketService.reply({
      ticketId: id,
      authorId: session.user.id,
      body: data.body,
      isInternal: false,
      asAdmin: false,
    });
    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reply failed" },
      { status: 400 }
    );
  }
}
