import { Suspense } from "react";
import VendorPortalClient from "./vendor-portal-client";

export default function VendorPortalPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 py-12 text-center">Loading...</p>}>
      <VendorPortalClient />
    </Suspense>
  );
}
