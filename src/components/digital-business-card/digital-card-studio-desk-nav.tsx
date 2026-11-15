"use client";

import { cn } from "@/lib/utils";
import { STUDIO_DESKS, type StudioDeskId } from "@/lib/digital-business-card/studio-desk";

export function DigitalCardStudioDeskNav({
  desk,
  onChange,
}: {
  desk: StudioDeskId;
  onChange: (desk: StudioDeskId) => void;
}) {
  return (
    <nav className="celecard-studio-desks" aria-label="CeleYou workspace">
      <div className="celecard-studio-desks-track" role="tablist" aria-orientation="horizontal">
        {STUDIO_DESKS.map((item) => {
          const active = desk === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={item.hint}
              className={cn("celecard-studio-desk-tab", active && "is-active")}
              onClick={() => onChange(item.id)}
            >
              <span className="celecard-studio-desk-tab-full">{item.label}</span>
              <span className="celecard-studio-desk-tab-short">{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
