"use client";

import {
  Undo2,
  Redo2,
  Smartphone,
  Tablet,
  Monitor,
  Save,
  Eye,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudioSaveStatus } from "@/hooks/use-studio-autosave";
import { StudioVersionsMenu } from "@/components/invitation-studio/studio-versions-menu";
import type { StudioSnapshot } from "@/lib/invitation-studio/studio-history";

export type StudioDevice = "mobile" | "tablet" | "desktop";

interface StudioToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  device: StudioDevice;
  onDeviceChange: (d: StudioDevice) => void;
  saveStatus: StudioSaveStatus;
  lastSavedAt?: Date | null;
  onSaveNow: () => void;
  onPreview: () => void;
  onPublishCheck: () => void;
  saving?: boolean;
  versions?: StudioSnapshot[];
  onSaveVersion?: (label: string) => void;
  onRestoreVersion?: (id: string) => void;
}

function statusLabel(status: StudioSaveStatus, lastSavedAt?: Date | null): string {
  switch (status) {
    case "saving":
      return "Saving…";
    case "saved":
      return lastSavedAt
        ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : "Saved";
    case "dirty":
      return "Unsaved changes";
    case "error":
      return "Save failed — retry";
    default:
      return "Ready";
  }
}

export function StudioToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  device,
  onDeviceChange,
  saveStatus,
  lastSavedAt,
  onSaveNow,
  onPreview,
  onPublishCheck,
  saving,
  versions = [],
  onSaveVersion,
  onRestoreVersion,
}: StudioToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Undo"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!canRedo}
          onClick={onRedo}
          aria-label="Redo"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        {onSaveVersion && onRestoreVersion && (
          <StudioVersionsMenu
            versions={versions}
            onSaveVersion={onSaveVersion}
            onRestoreVersion={onRestoreVersion}
          />
        )}
        <div
          className={cn(
            "ml-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            saveStatus === "error" && "bg-red-50 text-red-700",
            saveStatus === "dirty" && "bg-amber-50 text-amber-800",
            saveStatus === "saving" && "bg-slate-100 text-slate-600",
            (saveStatus === "saved" || saveStatus === "idle") && "bg-emerald-50 text-emerald-800"
          )}
        >
          {saveStatus === "saving" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : saveStatus === "error" ? (
            <AlertCircle className="h-3 w-3" />
          ) : saveStatus === "dirty" ? (
            <Cloud className="h-3 w-3" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          {statusLabel(saveStatus, lastSavedAt)}
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {(
          [
            { id: "mobile" as const, icon: Smartphone, label: "Phone" },
            { id: "tablet" as const, icon: Tablet, label: "Tablet" },
            { id: "desktop" as const, icon: Monitor, label: "Desktop" },
          ] as const
        ).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onDeviceChange(id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              device === id
                ? "bg-white text-[#0B8A83] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            )}
            aria-pressed={device === id}
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSaveNow}
          disabled={saving || saveStatus === "saving"}
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save</span>
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onPreview}>
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-[#0B8A83] hover:bg-[#097068]"
          onClick={onPublishCheck}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Publish check
        </Button>
      </div>
    </div>
  );
}
