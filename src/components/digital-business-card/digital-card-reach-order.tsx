"use client";

import { ArrowDown, ArrowUp, LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";
import { reachBrandMarkId, type DigitalCardReachItem, type DigitalCardReachSurface } from "@/lib/digital-business-card/socials";

export function DigitalCardReachOrderEditor({
  items,
  onChange,
  className,
}: {
  items: DigitalCardReachItem[];
  onChange: (next: { stackOrder: string[]; dockOrder: string[] }) => void;
  className?: string;
}) {
  const stack = items.filter((item) => item.surface === "stack");
  const dock = items.filter((item) => item.surface === "dock");

  function emit(nextItems: DigitalCardReachItem[]) {
    onChange({
      stackOrder: nextItems.filter((item) => item.surface === "stack").map((item) => item.id),
      dockOrder: nextItems.filter((item) => item.surface === "dock").map((item) => item.id),
    });
  }

  function move(id: string, direction: -1 | 1, surface: DigitalCardReachSurface) {
    const stackItems = items.filter((item) => item.surface === "stack");
    const dockItems = items.filter((item) => item.surface === "dock");
    const group = surface === "stack" ? [...stackItems] : [...dockItems];
    const index = group.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= group.length) return;
    const [row] = group.splice(index, 1);
    group.splice(nextIndex, 0, row);
    emit(surface === "stack" ? [...group, ...dockItems] : [...stackItems, ...group]);
  }

  function setSurface(id: string, surface: DigitalCardReachSurface) {
    emit(items.map((item) => (item.id === id ? { ...item, surface } : item)));
  }

  if (!items.length) {
    return (
      <p className={cn("text-xs text-slate-500", className)}>
        Filled mails, numbers, sites, and socials appear here. Empty ones stay off the guest page.
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Group
        title="Featured taps"
        hint="Full-width plates guests tap first. Only live details."
        items={stack}
        surface="stack"
        onMove={move}
        onSurface={setSurface}
      />
      <Group
        title="Icon row"
        hint="Official logos in a compact dock. Hide a network by clearing its field."
        items={dock}
        surface="dock"
        onMove={move}
        onSurface={setSurface}
      />
    </div>
  );
}

function Group({
  title,
  hint,
  items,
  surface,
  onMove,
  onSurface,
}: {
  title: string;
  hint: string;
  items: DigitalCardReachItem[];
  surface: DigitalCardReachSurface;
  onMove: (id: string, direction: -1 | 1, surface: DigitalCardReachSurface) => void;
  onSurface: (id: string, surface: DigitalCardReachSurface) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      <ul className="mt-2 space-y-1.5">
        {items.length ? (
          items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5"
            >
              <DigitalCardBrandMark id={reachBrandMarkId(item)} className="h-8 w-8 rounded-lg shadow-none" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{item.title}</span>
                {item.subtitle ? (
                  <span className="block truncate text-[11px] text-slate-500">{item.subtitle}</span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => onSurface(item.id, surface === "stack" ? "dock" : "stack")}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label={surface === "stack" ? "Move to icon row" : "Move to featured taps"}
                title={surface === "stack" ? "Move to icon row" : "Move to featured taps"}
              >
                {surface === "stack" ? <LayoutGrid className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove(item.id, -1, surface)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                aria-label="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                onClick={() => onMove(item.id, 1, surface)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                aria-label="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </li>
          ))
        ) : (
          <li className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
            Nothing here yet.
          </li>
        )}
      </ul>
    </div>
  );
}
