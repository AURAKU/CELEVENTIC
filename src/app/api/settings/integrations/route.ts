import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { INTEGRATION_CATALOG } from "@/lib/integrations/integration-catalog";
import { isProviderEnabled } from "@/lib/integrations/integration-runtime";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = await Promise.all(
    INTEGRATION_CATALOG.map(async (entry) => ({
      provider: entry.provider,
      label: entry.label,
      category: entry.category,
      description: entry.description,
      docsUrl: entry.docsUrl,
      configured: await isProviderEnabled(entry.provider),
    }))
  );

  return NextResponse.json({ success: true, data: integrations });
}
