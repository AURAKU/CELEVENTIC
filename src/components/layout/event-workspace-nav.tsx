"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart, Mail, Users, Armchair, Clock, Store, Gift, QrCode, Image, Sparkles,
  MessageSquare, Wallet, UsersRound, Flower2, Video, Archive, Cake, Ticket,
  Palette, Presentation, UserPlus, Calendar, BarChart3, Music, Layers, Mic,
  BadgeCheck, Star, Tent, Map, LayoutDashboard, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceNavItem } from "@/hooks/use-event-workspace";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart, Mail, Users, Armchair, Clock, Store, Gift, QrCode, Image, Sparkles,
  MessageSquare, Wallet, UsersRound, Flower2, Video, Archive, Cake, Ticket,
  Palette, Presentation, UserPlus, Calendar, BarChart3, Music, Layers, Mic,
  BadgeCheck, Star, Tent, Map, LayoutDashboard,
};

interface EventWorkspaceNavProps {
  items: WorkspaceNavItem[];
  eventTitle?: string;
  eventType?: string;
}

export function EventWorkspaceNav({ items, eventTitle, eventType }: EventWorkspaceNavProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    const [path] = href.split("?");
    return pathname === path || pathname.startsWith(path + "/");
  }

  return (
    <div className="space-y-3">
      <div className="px-3 py-2 rounded-xl bg-white/10 border border-white/10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Event</p>
        <p className="text-sm font-semibold text-white truncate mt-0.5">{eventTitle}</p>
        {eventType && (
          <p className="text-xs text-brand-300 mt-0.5">{eventType.replace(/_/g, " ")}</p>
        )}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.isLocked ? `#upgrade-${item.featureKey}` : item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                item.isLocked
                  ? "text-slate-500 cursor-not-allowed opacity-70"
                  : active
                    ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
                    : "text-slate-400 hover:text-white hover:bg-white/8"
              )}
              onClick={item.isLocked ? (e) => e.preventDefault() : undefined}
              title={item.isLocked ? `Upgrade to ${item.requiredPlan ?? "premium"} to unlock` : undefined}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && !item.isLocked && "text-brand-300")} />
              <span className="truncate flex-1">{item.label}</span>
              {item.isLocked && <Lock className="h-3 w-3 shrink-0 text-slate-500" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
