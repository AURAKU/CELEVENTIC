import { adminService } from "@/services/admin/admin.service";
import { AdminAuditClient } from "./admin-audit-client";

export default async function AuditLogsPage() {
  const { logs, total } = await adminService.getAuditLogs(1, 100);
  return (
    <AdminAuditClient
      initial={logs.map((l) => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        details: l.details as Record<string, unknown> | null,
        createdAt: l.createdAt.toISOString(),
        user: l.user,
      }))}
      initialTotal={total}
    />
  );
}
