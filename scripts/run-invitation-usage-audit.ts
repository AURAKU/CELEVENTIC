/**
 * Read-only invitation template usage audit runner.
 *
 * SAFETY:
 * - Does NOT run unless CELEVENTIC_USAGE_AUDIT_AUTHORIZED=YES
 * - Opens SQLite with query_only when possible
 * - Prints aggregates only (templateSlug / layout / status counts)
 * - Never writes, never prints guest PII
 *
 * Usage (authorized operator only):
 *   CELEVENTIC_USAGE_AUDIT_AUTHORIZED=YES DATABASE_URL="file:./prisma/dev.db" \
 *     npx tsx scripts/run-invitation-usage-audit.ts
 *
 * Production: point DATABASE_URL at the production SQLite file over an approved
 * read-only channel. Do not bypass authorization.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function assertAuthorized() {
  if (process.env.CELEVENTIC_USAGE_AUDIT_AUTHORIZED !== "YES") {
    console.error(
      [
        "BLOCKED: production/usage audit is not authorized.",
        "Set CELEVENTIC_USAGE_AUDIT_AUTHORIZED=YES only after explicit approval.",
        "See docs/invitations/studio-3/phase-2/production-audit-authorization.md",
      ].join("\n")
    );
    process.exit(2);
  }
}

function layoutFromDesignConfig(designConfig: unknown): string {
  if (!designConfig || typeof designConfig !== "object") return "(null)";
  const layout = (designConfig as { layout?: unknown }).layout;
  return typeof layout === "string" && layout.trim() ? layout : "(null)";
}

function layoutVersionFromDesignConfig(designConfig: unknown): string {
  if (!designConfig || typeof designConfig !== "object") return "(null)";
  const version = (designConfig as { layoutVersion?: unknown }).layoutVersion;
  if (typeof version !== "number" || !Number.isFinite(version)) return "(null)";
  return String(Math.trunc(version));
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

async function main() {
  assertAuthorized();

  const sqlPath = path.join(
    process.cwd(),
    "docs/invitations/studio-3/phase-2/production-usage-audit.sql"
  );
  // Keep the SQL pack discoverable for sqlite3 CLI operators.
  readFileSync(sqlPath, "utf8");

  const prisma = new PrismaClient({
    log: ["error"],
  });

  try {
    // Best-effort SQLite read-only pragma (ignored on non-sqlite).
    await prisma.$executeRawUnsafe("PRAGMA query_only = ON").catch(() => undefined);

    const orders = await prisma.invitationOrder.findMany({
      select: {
        templateSlug: true,
        designConfig: true,
        archivedAt: true,
        invitationId: true,
        eventId: true,
      },
    });

    const invitations = await prisma.invitation.findMany({
      select: {
        status: true,
        designConfig: true,
        archivedAt: true,
        id: true,
      },
    });

    const ordersBySku = new Map<string, number>();
    const ordersByLayout = new Map<string, number>();
    const orderLayoutVersions = new Map<string, number>();
    for (const order of orders) {
      bump(ordersBySku, order.templateSlug);
      bump(ordersByLayout, layoutFromDesignConfig(order.designConfig));
      bump(orderLayoutVersions, layoutVersionFromDesignConfig(order.designConfig));
    }

    const invitesByLayoutStatus = new Map<string, number>();
    const inviteLayoutVersions = new Map<string, number>();
    for (const invite of invitations) {
      const layout = layoutFromDesignConfig(invite.designConfig);
      bump(invitesByLayoutStatus, `${layout}::${invite.status}`);
      bump(inviteLayoutVersions, layoutVersionFromDesignConfig(invite.designConfig));
    }

    const report = {
      generatedAt: new Date().toISOString(),
      mode: "read-only-aggregates",
      authorized: true,
      totals: {
        invitationOrders: orders.length,
        invitations: invitations.length,
      },
      ordersBySku: Object.fromEntries([...ordersBySku.entries()].sort((a, b) => b[1] - a[1])),
      ordersByLayout: Object.fromEntries([...ordersByLayout.entries()].sort((a, b) => b[1] - a[1])),
      orderLayoutVersions: Object.fromEntries(orderLayoutVersions),
      invitesByLayoutStatus: Object.fromEntries(
        [...invitesByLayoutStatus.entries()].sort((a, b) => b[1] - a[1])
      ),
      inviteLayoutVersions: Object.fromEntries(inviteLayoutVersions),
      classificationNote:
        "Do not mark catalogue SKUs ELIGIBLE from a single dataset. Require orders + invitations + guest/pass/analytics coverage on production.",
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
