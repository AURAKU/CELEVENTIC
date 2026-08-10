"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";

export function GuideFeedback({ slug }: { slug: string }) {
  const [done, setDone] = useState<"yes" | "no" | null>(null);

  const send = async (helpful: boolean) => {
    setDone(helpful ? "yes" : "no");
    trackGuideEvent("guide_feedback", { slug, helpful });
    try {
      await fetch(`/api/guides/${encodeURIComponent(slug)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful }),
      });
    } catch {
      /* ignore */
    }
  };

  if (done) {
    return (
      <p className="text-sm text-slate-600" role="status">
        Thanks for the feedback
        {done === "no" ? (
          <>
            .{" "}
            <a href="/legal/contact" className="text-brand-700 hover:underline">
              Contact support
            </a>{" "}
            if you still need help.
          </>
        ) : (
          "."
        )}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-slate-600">Was this helpful?</p>
      <Button type="button" size="sm" variant="outline" onClick={() => send(true)}>
        <ThumbsUp className="h-4 w-4 mr-1.5" /> Yes
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => send(false)}>
        <ThumbsDown className="h-4 w-4 mr-1.5" /> No
      </Button>
    </div>
  );
}
