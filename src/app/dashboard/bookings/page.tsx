import { Suspense } from "react";
import { OrganizerBookingsClient } from "./organizer-bookings-client";

export default function OrganizerBookingsPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 py-8">Loading bookings…</p>}>
      <OrganizerBookingsClient />
    </Suspense>
  );
}
