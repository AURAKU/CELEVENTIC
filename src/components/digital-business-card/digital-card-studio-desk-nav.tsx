"use client";

import {
  BarChart3,
  IdCard,
  Link2,
  Palette,
  Settings2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STUDIO_DESKS, type StudioDeskId } from "@/lib/digital-business-card/studio-desk";

const DESK_ICONS: Record<StudioDeskId, typeof IdCard> = {
  card: IdCard,
  design: Palette,
  links: Link2,
  audience: Users,
  insights: BarChart3,
  settings: Settings2,
};

export function DigitalCardStudioDeskNav({
  desk,
  onChange,
}: {
  desk: StudioDeskId;
  onChange: (desk: StudioDeskId) => void;
}) {
  return (
    <nav className="celecard-studio-desks" aria-label="CeleYou workspace">
      <p className="celecard-studio-desks-heading">Workspace</p>
      <div className="celecard-studio-desks-track" role="tablist" aria-orientation="horizontal">
        {STUDIO_DESKS.map((item) => {
          const active = desk === item.id;
          const Icon = DESK_ICONS[item.id];
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
              <Icon className="celecard-studio-desk-tab-icon" aria-hidden />
              <span className="celecard-studio-desk-tab-copy">
                <span className="celecard-studio-desk-tab-full">{item.label}</span>
                <span className="celecard-studio-desk-tab-short">{item.shortLabel}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
