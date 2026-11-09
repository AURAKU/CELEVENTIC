"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";

function PaidReturnInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const reference = searchParams.get("reference") ?? searchParams.get("trxref") ?? "";
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function confirm() {
      const res = await fetch(`/api/invitation-orders/${orderId}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok || !data.success) {
        setError(data.error || "We could not confirm this payment yet.");
        return;
      }
      window.location.replace(data.data.next ?? `/invitations/create/${orderId}/studio`);
    }
    void confirm();
    return () => {
      cancelled = true;
    };
  }, [orderId, reference]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-red-600 max-w-md">{error}</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild>
            <Link href={`/invitations/create/${orderId}/checkout`}>Back to checkout</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/invitations/create/${orderId}/studio`}>Try Studio</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <PageLoader label="Confirming your payment…" className="min-h-screen" />;
}

export default function PaidReturnPage() {
  return (
    <Suspense fallback={<PageLoader label="Confirming your payment…" className="min-h-screen" />}>
      <PaidReturnInner />
    </Suspense>
  );
}
