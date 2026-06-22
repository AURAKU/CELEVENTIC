import { adminService } from "@/services/admin/admin.service";
import { AdminPaymentsClient } from "./admin-payments-client";

export default async function AdminPaymentsPage() {
  const { payments, total } = await adminService.getPayments(1, 50);
  return (
    <AdminPaymentsClient
      initial={payments.map((p) => ({
        id: p.id,
        reference: p.reference,
        amount: p.amount.toString(),
        provider: p.provider,
        purpose: p.purpose,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        user: p.user,
      }))}
      initialTotal={total}
    />
  );
}
