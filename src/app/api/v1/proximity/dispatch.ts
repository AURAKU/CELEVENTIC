import { NextRequest } from "next/server";
import { POST as postSessionAction } from "@/app/api/digital-business-cards/proximity/sessions/[id]/route";

type SessionCtx = { params: Promise<{ id: string }> };

export function proximityV1Action(action: "request" | "approve" | "decline" | "cancel" | "complete") {
  return async function POST(req: NextRequest, ctx: SessionCtx) {
    const url = new URL(req.url);
    url.searchParams.set("action", action);
    return postSessionAction(new NextRequest(url, { method: "POST", headers: req.headers }), ctx);
  };
}
