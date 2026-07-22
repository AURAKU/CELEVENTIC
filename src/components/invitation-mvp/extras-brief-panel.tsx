"use client";

import { useEffect, useState } from "react";
import { Check, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FulfillmentRequest {
  id: string;
  addonSlug: string;
  status: string;
  brief: Record<string, unknown> | null;
  deliverableUrl: string | null;
}

const ADDON_LABELS: Record<string, { title: string; prompt: string; extraField?: { key: string; label: string; placeholder: string } }> = {
  "custom-monogram": {
    title: "Custom monogram",
    prompt: "Your initials, wedding date, and the style you love (classic crest, modern minimal, floral…)",
  },
  "custom-illustration": {
    title: "Custom illustration",
    prompt: "Describe the illustration you want — subjects, style, mood. Add links to reference photos if any.",
  },
  "custom-domain": {
    title: "Custom domain",
    prompt: "Anything we should know about your domain setup",
    extraField: { key: "desiredDomain", label: "Desired domain", placeholder: "ama-and-kofi.com" },
  },
  "video-intro": {
    title: "Animated intro video",
    prompt: "Describe the feel you want — names to feature, moments to include, preferred pace.",
  },
  "voice-intro": {
    title: "Voice intro",
    prompt: "The message you'd like voiced, and the tone (warm, formal, celebratory…)",
  },
};

/**
 * Post-purchase requirement collection for bespoke extras. A purchased
 * monogram/illustration/domain/video is only a promise until we have the
 * customer's brief — this panel captures it and shows delivery status.
 */
export function ExtrasBriefPanel({ orderId }: { orderId: string }) {
  const [requests, setRequests] = useState<FulfillmentRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { notes: string; extra: string }>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invitation-orders/${orderId}/fulfillment`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRequests(d.data);
      })
      .catch(() => undefined);
  }, [orderId]);

  const pending = requests.filter((r) => ADDON_LABELS[r.addonSlug]);
  if (pending.length === 0) return null;

  async function submit(request: FulfillmentRequest) {
    const meta = ADDON_LABELS[request.addonSlug];
    const draft = drafts[request.addonSlug] ?? { notes: "", extra: "" };
    setSavingSlug(request.addonSlug);
    const brief: Record<string, unknown> = { notes: draft.notes };
    if (meta.extraField && draft.extra) brief[meta.extraField.key] = draft.extra;
    const res = await fetch(`/api/invitation-orders/${orderId}/fulfillment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addonSlug: request.addonSlug, brief }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setRequests((prev) => prev.map((r) => (r.id === data.data.id ? data.data : r)));
    }
    setSavingSlug(null);
  }

  return (
    <div className="mt-8 rounded-2xl border border-[#D4A63A]/40 bg-[#D4A63A]/5 p-5 text-left">
      <h3 className="font-display font-semibold text-[#0F172A] flex items-center gap-2">
        <PenLine className="h-4 w-4 text-[#D4A63A]" /> Tell us about your extras
      </h3>
      <p className="text-xs text-slate-500 mt-1 mb-4">
        Your order includes bespoke work. Share the details so our designers can start.
      </p>
      <div className="space-y-4">
        {pending.map((request) => {
          const meta = ADDON_LABELS[request.addonSlug];
          const submitted = request.status !== "PENDING_INFO";
          const draft = drafts[request.addonSlug] ?? { notes: "", extra: "" };
          return (
            <div key={request.id} className="rounded-xl border border-slate-200/80 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#0F172A]">{meta.title}</p>
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 ${
                    request.status === "DELIVERED"
                      ? "bg-emerald-100 text-emerald-700"
                      : submitted
                        ? "bg-[#0B8A83]/10 text-[#0B8A83]"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {request.status === "DELIVERED" ? "Delivered" : submitted ? "Received" : "Details needed"}
                </span>
              </div>
              {request.status === "DELIVERED" && request.deliverableUrl ? (
                <a
                  href={request.deliverableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-[#0B8A83] underline"
                >
                  View your deliverable
                </a>
              ) : submitted ? (
                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-[#0B8A83]" /> Brief received — our team will be in touch.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {meta.extraField && (
                    <Input
                      placeholder={meta.extraField.placeholder}
                      aria-label={meta.extraField.label}
                      value={draft.extra}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [request.addonSlug]: { ...draft, extra: e.target.value } }))
                      }
                    />
                  )}
                  <Textarea
                    rows={3}
                    placeholder={meta.prompt}
                    value={draft.notes}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [request.addonSlug]: { ...draft, notes: e.target.value } }))
                    }
                  />
                  <Button
                    size="sm"
                    onClick={() => submit(request)}
                    disabled={savingSlug === request.addonSlug || (!draft.notes.trim() && !draft.extra.trim())}
                  >
                    {savingSlug === request.addonSlug ? "Sending…" : "Send details"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
