"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import {
  getInvitationPackage,
  invitationPackageContactMessage,
  isQuoteOnlyInvitationPackage,
} from "@/lib/invitation-mvp/packages";
import { GUIDE_SUPPORT_CONTACT, guideSupportWhatsAppUrl } from "@/lib/celeventic-guide/support-contact";

/** Catalogue is the create funnel when no template/package was chosen yet. */
const CATALOGUE_HREF = "/invitations/catalogue";

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
  // Server createDraft resolves the real type from catalogue category; keep query if present.
  const eventType = searchParams.get("eventType") ?? "";
  const themeId = searchParams.get("theme");
  const hasDraftParams = Boolean(template && packageSlug);

  useEffect(() => {
    if (status === "loading") return;

    // Landing / sitemap / Explore CTAs often hit this route with no template.
    // Send people into the catalogue so Create invitation always works.
    if (!hasDraftParams) {
      if (!session) {
        const callback = CATALOGUE_HREF;
        router.replace(
          `/auth/register?intent=host&callbackUrl=${encodeURIComponent(callback)}&next=${encodeURIComponent(callback)}`
        );
        return;
      }
      router.replace(CATALOGUE_HREF);
      return;
    }

    if (!session) {
      const themePart = themeId ? `&theme=${encodeURIComponent(themeId)}` : "";
      const eventPart = eventType ? `&eventType=${encodeURIComponent(eventType)}` : "";
      const callback = `/invitations/create/start?template=${encodeURIComponent(template!)}&package=${encodeURIComponent(packageSlug!)}${eventPart}${themePart}`;
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(callback)}`);
      return;
    }

    if (isQuoteOnlyInvitationPackage(packageSlug!)) {
      const pkg = getInvitationPackage(packageSlug!);
      if (pkg) {
        window.location.assign(guideSupportWhatsAppUrl(invitationPackageContactMessage(pkg)));
      } else {
        window.location.assign(`mailto:${GUIDE_SUPPORT_CONTACT.email}`);
      }
      return;
    }

    // Viral-footer attribution captured on the catalogue/preview pages.
    let attributionRef: string | undefined;
    try {
      attributionRef = window.sessionStorage.getItem("celeventic:referrer-invite") ?? undefined;
    } catch {
      attributionRef = undefined;
    }

    let cancelled = false;
    fetch("/api/invitation-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateSlug: template,
        packageSlug,
        ...(eventType ? { eventType } : {}),
        themeId: themeId ?? undefined,
        attributionRef,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) {
          router.replace(`/invitations/create/${d.data.id}/details`);
        } else {
          setError(d.error || "Failed to start");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Network error");
      });

    return () => {
      cancelled = true;
    };
  }, [session, status, template, packageSlug, eventType, themeId, router, hasDraftParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-600">{error}</p>
        <Button asChild>
          <Link href={CATALOGUE_HREF}>Choose a template</Link>
        </Button>
      </div>
    );
  }

  return (
    <PageLoader
      label={hasDraftParams ? "Setting up your invitation..." : "Opening invitation catalogue..."}
      className="min-h-screen"
    />
  );
}
