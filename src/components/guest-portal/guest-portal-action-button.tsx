"use client";

import {
  Armchair,
  Calendar,
  Clock,
  Copy,
  Gift,
  Heart,
  Images,
  Loader2,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  QrCode,
  RotateCcw,
  Share2,
  Upload,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import type { InvitationActionKey, ResolvedGuestAction } from "@/lib/invitation/guest-portal-actions";
import { cn } from "@/lib/utils";

const ACTION_ICONS: Record<InvitationActionKey, LucideIcon> = {
  RSVP: Heart,
  LOCATION: MapPin,
  SAVE_DATE: Calendar,
  SHARE: Share2,
  COPY_LINK: Copy,
  QR_PASS: QrCode,
  SEATING: Armchair,
  MENU: Menu,
  GALLERY: Images,
  MEMORY_UPLOAD: Upload,
  CONTRIBUTION: Gift,
  CALL: Phone,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  REPLAY: RotateCcw,
  AUDIO_TOGGLE: Volume2,
  COUNTDOWN: Clock,
};

interface GuestPortalActionButtonProps {
  action: ResolvedGuestAction;
  accentColor?: string;
  variant?: "rail" | "tile" | "chip" | "dark-chip";
  compact?: boolean;
  loading?: boolean;
  onRun: (action: ResolvedGuestAction) => void;
  className?: string;
}

export function GuestPortalActionButton({
  action,
  accentColor = "#0B8A83",
  variant = "rail",
  compact,
  loading,
  onRun,
  className,
}: GuestPortalActionButtonProps) {
  const Icon =
    action.key === "AUDIO_TOGGLE" && action.label === "Unmute" ? VolumeX : ACTION_ICONS[action.key];

  const disabled = action.disabled || loading;
  const title = action.disabledReason ?? action.label;

  const railClass = cn(
    "group flex flex-col items-center gap-1.5 shrink-0 touch-manipulation transition-transform active:scale-95",
    compact ? "min-w-[56px] max-w-[64px]" : "min-w-[64px] max-w-[76px]",
    disabled && "opacity-45 pointer-events-none"
  );

  const iconShellClass = cn(
    "flex items-center justify-center rounded-full shadow-sm transition-transform group-hover:scale-105",
    compact ? "h-9 w-9" : "h-11 w-11",
    variant === "dark-chip"
      ? "border border-white/25 bg-white/10 text-white backdrop-blur-md"
      : "text-white"
  );

  const labelClass = cn(
    "text-center font-medium leading-tight line-clamp-2",
    compact ? "text-[9px]" : "text-[10px]",
    variant === "dark-chip" ? "text-white/85" : "text-slate-600"
  );

  const inner = (
    <>
      <div
        className={iconShellClass}
        style={
          variant === "dark-chip"
            ? undefined
            : { background: `linear-gradient(145deg, ${accentColor}, ${accentColor}cc)` }
        }
      >
        {loading ? (
          <Loader2 className={cn("animate-spin", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        ) : (
          <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        )}
      </div>
      <span className={labelClass}>{action.label}</span>
    </>
  );

  if (action.kind === "href" && action.href && !disabled) {
    return (
      <a
        href={action.href}
        target={action.external ? "_blank" : undefined}
        rel={action.external ? "noopener noreferrer" : undefined}
        title={title}
        className={cn(railClass, className)}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={() => onRun(action)}
      className={cn(railClass, className)}
    >
      {inner}
    </button>
  );
}

interface GuestPortalQuickActionsProps {
  actions: ResolvedGuestAction[];
  accentColor?: string;
  variant?: "rail" | "dock" | "chips" | "dark-chips";
  compact?: boolean;
  loadingKey?: InvitationActionKey | null;
  onRun: (action: ResolvedGuestAction) => void;
  error?: string | null;
  className?: string;
}

export function GuestPortalQuickActions({
  actions: allActions,
  accentColor = "#0B8A83",
  variant = "rail",
  compact,
  loadingKey,
  onRun,
  error,
  className,
}: GuestPortalQuickActionsProps) {
  // Hide soft-dead CTAs from the primary dock — only actionable controls belong here.
  const actions = allActions.filter((a) => !a.disabled);
  if (actions.length === 0) return null;

  if (variant === "rail" || variant === "dark-chips") {
    const isDark = variant === "dark-chips";
    return (
      <div className={cn("w-full", className)}>
        <div
          className={cn(
            "overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            compact ? "px-1" : "px-2"
          )}
        >
          <div
            className={cn(
              "flex items-start justify-start sm:justify-center gap-3 sm:gap-4 py-1 min-w-min mx-auto",
              compact && "gap-2"
            )}
          >
            {actions.map((action) => (
              <GuestPortalActionButton
                key={action.key}
                action={action}
                accentColor={accentColor}
                variant={isDark ? "dark-chip" : "rail"}
                compact={compact}
                loading={loadingKey === action.key}
                onRun={onRun}
              />
            ))}
          </div>
        </div>
        {error && (
          <p className={cn("text-[10px] text-center mt-2", isDark ? "text-red-300" : "text-red-600")}>
            {error}
          </p>
        )}
      </div>
    );
  }

  if (variant === "dock") {
    return (
      <GuestPortalQuickActions
        actions={actions}
        accentColor={accentColor}
        variant="rail"
        compact={compact}
        loadingKey={loadingKey}
        onRun={onRun}
        error={error}
        className={className}
      />
    );
  }

  if (variant === "chips") {
    return (
      <GuestPortalQuickActions
        actions={actions}
        accentColor={accentColor}
        variant="rail"
        compact={compact}
        loadingKey={loadingKey}
        onRun={onRun}
        error={error}
        className={className}
      />
    );
  }

  return null;
}
