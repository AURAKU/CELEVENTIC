import { redirect } from "next/navigation";
import { qrRoutingService } from "@/services/qr/qr-routing.service";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function QrScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await qrRoutingService.resolveScan(token);

  if (result.action === "redirect" && result.url) {
    redirect(result.url);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4] px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-10 text-center space-y-4">
          <Logo className="justify-center mx-auto" size="lg" />
          <h1 className="font-display text-xl font-bold text-[#0F172A]">
            {result.action === "expired" ? "Invitation Expired" : "Invalid Link"}
          </h1>
          <p className="text-sm text-slate-500">
            {result.reason ?? "This QR code could not be validated. Please contact your host."}
          </p>
          <Link href="/" className="text-sm text-[#0B8A83] hover:underline">Visit Celeventic</Link>
        </CardContent>
      </Card>
    </div>
  );
}
