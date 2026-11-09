"use client";

import { ALL_STORY_VISUAL, categoryVisual, storyShortLabel, type StoryCategory } from "@/lib/vendor-os/category-visuals";
import { cn } from "@/lib/utils";

interface CategoryStoriesRailProps {
  categories: StoryCategory[];
  selected: string;
  allLabel: string;
  onSelect: (name: string) => void;
}

export function CategoryStoriesRail({
  categories,
  selected,
  allLabel,
  onSelect,
}: CategoryStoriesRailProps) {
  const items: Array<{ name: string; label: string; isAll: boolean }> = [
    { name: "", label: allLabel, isAll: true },
    ...categories.map((c) => ({ name: c.name, label: storyShortLabel(c.name), isAll: false })),
  ];

  return (
    <div className="relative">
      <div
        role="tablist"
        aria-label="Vendor categories"
        className="marketplace-stories flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory px-1 pb-2 pt-1"
      >
        {items.map((item) => {
          const active = selected === item.name;
          const visual = item.isAll ? ALL_STORY_VISUAL : categoryVisual(item.name);
          const Icon = visual.icon;
          return (
            <button
              key={item.isAll ? "all" : item.name}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={item.name || item.label}
              title={item.name || item.label}
              onClick={() => onSelect(item.name)}
              className="group flex w-[4.85rem] shrink-0 snap-start flex-col items-center gap-1.5 touch-manipulation"
            >
              <span
                className={cn(
                  "relative grid h-[4.15rem] w-[4.15rem] place-items-center rounded-full p-[2.5px]",
                  "bg-gradient-to-br",
                  visual.ring,
                  active && "marketplace-story-ring-active shadow-[0_0_22px_rgba(11,138,131,0.45)]",
                  !active && "opacity-90 group-hover:opacity-100"
                )}
              >
                <span className="grid h-full w-full place-items-center rounded-full bg-slate-950 p-[2.5px]">
                  <span
                    className={cn(
                      "grid h-full w-full place-items-center rounded-full bg-gradient-to-br text-white",
                      visual.fill
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "w-full truncate text-center text-[0.68rem] font-semibold leading-tight tracking-wide [overflow-wrap:normal] [word-break:normal]",
                  active ? "text-white" : "text-white/65 group-hover:text-white"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-950 to-transparent" />
    </div>
  );
}
