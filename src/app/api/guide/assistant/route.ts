import { NextResponse } from "next/server";
import { answerGuideQuestion } from "@/services/celeventic-guide/guide-assistant.service";
import { rateLimit } from "@/lib/rate-limit";

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit(`guide-assistant:${ip}`, 30, 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many questions. Please wait a moment, or WhatsApp 0595968686 for help." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message =
    typeof body === "object" && body && "message" in body
      ? String((body as { message?: unknown }).message ?? "")
      : "";
  const historyRaw =
    typeof body === "object" && body && "history" in body
      ? (body as { history?: unknown }).history
      : [];
  const history = Array.isArray(historyRaw)
    ? historyRaw
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            !!m &&
            typeof m === "object" &&
            ((m as { role?: string }).role === "user" ||
              (m as { role?: string }).role === "assistant") &&
            typeof (m as { content?: unknown }).content === "string"
        )
        .slice(-8)
    : [];

  if (!message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const result = await answerGuideQuestion({ message, history });
  return NextResponse.json({ success: true, data: result });
}
