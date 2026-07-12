import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/loading-skeleton";

export default function GettingStartedLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
