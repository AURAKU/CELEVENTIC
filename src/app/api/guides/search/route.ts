import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPublicGuides, seedCeleventicGuides } from "@/services/celeventic-guide/guide.service";
import type { GuideRole } from "@/lib/celeventic-guide/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const role = url.searchParams.get("role") as GuideRole | null;
  const category = url.searchParams.get("category");
  const session = await getServerSession(authOptions);

  let guides = await listPublicGuides({
    q,
    role: role && role !== ("ALL" as GuideRole) ? role : null,
    category,
    viewerRole: session?.user?.role as string | undefined,
  });

  if (guides.length === 0 && !q) {
    await seedCeleventicGuides();
    guides = await listPublicGuides({
      q,
      role: role && role !== ("ALL" as GuideRole) ? role : null,
      category,
      viewerRole: session?.user?.role as string | undefined,
    });
  }

  return NextResponse.json({ guides });
}
