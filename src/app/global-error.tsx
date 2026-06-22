"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-mesh flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center">
          <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Celeventic hit a client-side error. Try a hard refresh (Ctrl+Shift+R). If you were running
            both <code className="text-xs">npm run dev</code> and <code className="text-xs">npm run start</code> at
            once, stop one server and run <code className="text-xs">npm run build:clean</code>.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => reset()}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
