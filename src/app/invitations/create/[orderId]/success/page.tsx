"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { MvpShell } from "@/components/invitation-mvp/mvp-shell";
import { Button } from "@/components/ui/button";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const shareUrl = searchParams.get("url") ?? "";
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <MvpShell title="Invitation Published!" subtitle="Share your beautiful link with guests">
      <div className="max-w-md mx-auto text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0B8A83]/10 mx-auto mb-6">
          <Check className="h-8 w-8 text-[#0B8A83]" />
        </div>
        {shareUrl ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6">
            <p className="text-sm text-slate-500 mb-2">Your shareable link</p>
            <p className="text-sm font-mono text-[#0B8A83] break-all">{shareUrl}</p>
          </div>
        ) : (
          <p className="text-slate-600 mb-6">Payment received. Your invitation is being prepared.</p>
        )}
        <div className="flex flex-col gap-3">
          {shareUrl && (
            <>
              <Button onClick={copyLink} className="bg-[#0B8A83] hover:bg-[#097068]">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <Button variant="outline" asChild>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> View Invitation
                </a>
              </Button>
            </>
          )}
          <Button variant="outline" asChild>
            <Link href="/dashboard/my-invitations">Go to My Invitations</Link>
          </Button>
        </div>
      </div>
    </MvpShell>
  );
}
