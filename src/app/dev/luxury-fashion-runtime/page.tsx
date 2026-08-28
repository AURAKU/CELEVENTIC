import { notFound } from "next/navigation";
import { LuxuryFashionRuntimeClient } from "./luxury-fashion-runtime-client";

export const dynamic = "force-dynamic";

export default function LuxuryFashionRuntimePage({
  searchParams,
}: {
  searchParams: Promise<{ skipIntro?: string; reduced?: string; house?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_RUNTIME !== "1") {
    notFound();
  }
  return <LuxuryFashionRuntimeClient searchParams={searchParams} />;
}
