import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildImportTemplateCsv, TEMPLATE_FILENAME } from "@/lib/guest-import/template";

/**
 * Downloadable import template.
 *
 * Values are escaped through the same CSV-injection guard as every other
 * export, so the file we hand out could never itself be the attack.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(buildImportTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${TEMPLATE_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
