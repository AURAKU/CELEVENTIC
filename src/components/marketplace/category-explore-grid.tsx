"use client";

import { categoryVisual, type StoryCategory } from "@/lib/vendor-os/category-visuals";
import { cn } from "@/lib/utils";

interface CategoryExploreGridProps {
  categories: StoryCategory[];
  openLabel: string;
  onSelect: (name: string) => void;
}

export function CategoryExploreGrid({ categories, openLabel, onSelect }: CategoryExploreGridProps) {
  const trades = categories.filter((category) => category.name !== "All").slice(0, 12);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {trades.map((category) => {
        const visual = categoryVisual(category.name);
        const Icon = visual.icon;
        return (
          <button
            key={category.slug}
            type="button"
            onClick={() => onSelect(category.name)}
            className={cn(
              "min-h-[5.75rem] overflow-hidden rounded-[1.15rem] text-left touch-manipulation",
              "border border-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.24)]"
            )}
          >
            <span className={cn("flex h-full items-center gap-3 bg-gradient-to-br px-3 py-3", visual.fill)}>
              <span
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/12 ring-2 ring-white/20",
                  "bg-gradient-to-br",
                  visual.ring
                )}
              >
                <Icon className="h-5 w-5 text-white" strokeWidth={1.7} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold leading-tight text-white [overflow-wrap:normal] [word-break:normal] sm:text-base">
                  {category.name}
                </span>
                <span className="mt-0.5 block text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/70">
                  {openLabel}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
