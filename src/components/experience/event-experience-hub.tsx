"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { HubTabId, ExperienceHubMode } from "@/lib/experience/experience-types";

export const HUB_TAB_LABELS: Record<HubTabId, string> = {
  invitation: "Hero",
  rsvp: "RSVP",
  story: "Story",
  countdown: "Save the Date",
  venue: "Venue",
  gallery: "Gallery",
  gifts: "Gifts",
  seating: "Seating",
  menu: "Menu",
  timeline: "Schedule",
  memory: "Memory",
  livestream: "Live",
};

/** Maps hub tabs to DOM section ids for scroll navigation */
export const HUB_TAB_SECTION: Partial<Record<HubTabId, string>> = {
  invitation: "welcome",
  story: "story",
  countdown: "countdown",
  venue: "details",
  gallery: "gallery",
  rsvp: "rsvp",
  seating: "pass",
  timeline: "schedule",
  gifts: "gifts",
  menu: "menu",
  memory: "memory",
};

interface EventExperienceHubProps {
  enabledTabs: HubTabId[];
  hubMode?: ExperienceHubMode;
  activeTab?: HubTabId;
  onTabChange?: (tab: HubTabId) => void;
  children: React.ReactNode;
}

export function EventExperienceHubBar({
  enabledTabs,
  activeTab,
  onTabChange,
}: Pick<EventExperienceHubProps, "enabledTabs" | "activeTab" | "onTabChange">) {
  function scrollToTab(tab: HubTabId) {
    onTabChange?.(tab);
    const sectionId = HUB_TAB_SECTION[tab];
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="sticky top-[52px] z-40 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto max-w-2xl px-2 py-2 flex gap-1 overflow-x-auto scrollbar-thin">
        {enabledTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => scrollToTab(tab)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors touch-manipulation",
              activeTab === tab
                ? "bg-[#0B8A83] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-[#0B8A83]/10 hover:text-[#0B8A83]"
            )}
          >
            {HUB_TAB_LABELS[tab]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EventExperienceHub({ enabledTabs, hubMode = "scroll", children }: EventExperienceHubProps) {
  const [activeTab, setActiveTab] = useState<HubTabId>(enabledTabs[0] ?? "invitation");

  if (hubMode === "tabs") {
    return (
      <div>
        <EventExperienceHubBar enabledTabs={enabledTabs} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="inv-portal-enter">{children}</div>
      </div>
    );
  }

  return (
    <div>
      <EventExperienceHubBar enabledTabs={enabledTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {children}
    </div>
  );
}
