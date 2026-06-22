import { Suspense } from "react";
import { MessagesClient } from "./messages-client";

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="text-slate-500 py-12 text-center">Loading messages…</p>}>
      <MessagesClient />
    </Suspense>
  );
}
