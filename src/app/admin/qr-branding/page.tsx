import { AdminQrBrandingCard } from "@/components/admin/admin-qr-branding-card";

export default function AdminQrBrandingPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">QR Branding</h1>
        <p className="text-sm text-slate-500 mt-1">
          Platform-wide fallback logo for QR codes on invitations, tickets, and admission passes.
        </p>
      </div>
      <AdminQrBrandingCard />
    </div>
  );
}
