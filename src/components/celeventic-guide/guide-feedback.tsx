"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";

export function GuideFeedback({ slug }: { slug: string }) {
  const [done, setDone] = useState<"yes" | "no" | null>(null);
  const [askingReason, setAskingReason] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  const send = async (helpful: boolean, optionalReason?: string) => {
    setSending(true);
    trackGuideEvent("guide_feedback", { slug, helpful, ...(optionalReason ? { hasReason: true } : {}) });
    try {
      await fetch(`/api/guides/${encodeURIComponent(slug)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful, reason: optionalReason?.trim() ? optionalReason.trim().slice(0, 500) : undefined }),
      });
    } catch {}
    finally {
      setSending(false);
      setDone(helpful ? "yes" : "no");
      setAskingReason(false);
    }
  };

  if (done) {
    return (
      <p className="text-sm text-slate-600" role="status">
        Thanks for the feedback
        {done === "no" ? (
          <>
            .{" "}
            <a href="/legal/contact" className="text-brand-700 hover:underline">Contact support</a> if you still need help.
          </>
        ) : (
          "."
        )}
      </p>
    );
  }

  if (askingReason) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
        <p className="text-sm text-slate-700">What would have made this more helpful? (optional)</p>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} aria-label="Optional feedback reason" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={sending} onClick={() => void send(false, reason)}>Submit</Button>
          <Button type="button" size="sm" variant="ghost" disabled={sending} onClick={() => void send(false)}>Skip</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-slate-600">Was this helpful?</p>
      <Button type="button" size="sm" variant="outline" onClick={() => void send(true)}>
        <ThumbsUp className="h-4 w-4 mr-1.5" /> Yes
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setAskingReason(true)}>
        <ThumbsDown className="h-4 w-4 mr-1.5" /> Not really
      </Button>
    </div>
  );
}
