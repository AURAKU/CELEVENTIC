"use client";

import { useState } from "react";
import { ChevronDown, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NAMEDROP_APPLE_NOTICE,
  NAMEDROP_STEPS,
  SAVE_CONTACT_IOS_HINT,
  SETUP_NAMEDROP_CTA,
} from "@/lib/celeyou-share/namedrop";

export function CeleYouNameDropSetup({
  onSaveContact,
  defaultOpen = false,
}: {
  onSaveContact?: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id="namedrop" className="rounded-xl border border-slate-200 bg-white p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Smartphone className="h-4 w-4 text-[#0B8A83]" />
          {SETUP_NAMEDROP_CTA}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-slate-700">{NAMEDROP_APPLE_NOTICE}</p>
          <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-600">
            {NAMEDROP_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="text-[11px] leading-relaxed text-slate-500">{SAVE_CONTACT_IOS_HINT}</p>
          {onSaveContact ? (
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={onSaveContact}>
              Download CeleYou contact
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
