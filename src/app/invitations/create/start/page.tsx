"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";

export default function CreateStartPage() {
  return (
    <Suspense fallback={<PageLoader label="Setting up your invitation..." className="min-h-screen" />}>
      <CreateStartPageInner />
    </Suspense>
  );
}

function CreateStartPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState("");

  const template = searchParams.get("template");
  const packageSlug = searchParams.get("package");
  const eventType = searchParams.get("eventType") ?? "WEDDING";

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      const callback = `/invitations/create/start?template=${template}&package=${packageSlug}&eventType=${eventType}`;
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }
    if (!template || !packageSlug) {
      setError("Missing template or package");
      return;
    }

    fetch("/api/invitation-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateSlug: template, packageSlug, eventType }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          router.replace(`/invitations/create/${d.data.id}/details`);
        } else {
          setError(d.error || "Failed to start");
        }
      })
      .catch(() => setError("Network error"));
  }, [session, status, template, packageSlug, eventType, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-600">{error}</p>
        <Button asChild><Link href="/invitations/catalogue">Back to Catalogue</Link></Button>
      </div>
    );
  }

  return <PageLoader label="Setting up your invitation..." className="min-h-screen" />;
}
