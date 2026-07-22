"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  Layers,
  Images,
  Plus,
  Copy,
  GripVertical,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HUB_TAB_LABELS } from "@/components/experience/event-experience-hub";
import type { HubTabId } from "@/lib/experience/experience-types";
import type { StudioSceneConfig } from "@/lib/experience/experience-types";
import {
  addCustomScene,
  duplicateScene,
  reorderScenes,
  toggleSceneVisibility,
} from "@/lib/invitation-studio/studio-scenes";
import { cn } from "@/lib/utils";
import { hubTabsForEventType } from "@/lib/invitation/wedding-experience-filters";

interface StudioScenesPanelProps {
  scenes: StudioSceneConfig[];
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  onScenesChange: (scenes: StudioSceneConfig[]) => void;
  leftTab: "scenes" | "assets";
  onLeftTabChange: (tab: "scenes" | "assets") => void;
  assetsSlot: React.ReactNode;
  blocksHref?: string | null;
  /** When wedding/engagement, hide funeral/corporate-adjacent hub tabs */
  eventType?: string | null;
}

export function StudioScenesPanel({
  scenes,
  selectedSceneId,
  onSelectScene,
  onScenesChange,
  leftTab,
  onLeftTabChange,
  assetsSlot,
  blocksHref,
  eventType,
}: StudioScenesPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("Custom section");

  const allowedTabs = hubTabsForEventType(eventType);
  const usedTabs = new Set(
    scenes.filter((s) => s.tabId !== "custom").map((s) => s.tabId as HubTabId)
  );
  const addable = allowedTabs.filter((t) => !usedTabs.has(t));

  function addHubSection(tab: HubTabId) {
    onScenesChange([
      ...scenes,
      {
        id: `scene-${tab}-${Date.now().toString(36)}`,
        tabId: tab,
        title: HUB_TAB_LABELS[tab] ?? tab,
        visible: true,
      },
    ]);
  }

  function onDragStart(index: number) {
    setDragIndex(index);
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    onScenesChange(reorderScenes(scenes, dragIndex, index));
    setDragIndex(index);
  }

  function onDragEnd() {
    setDragIndex(null);
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-slate-200/80 bg-white">
      <div className="flex border-b border-slate-100">
        <button
          type="button"
          onClick={() => onLeftTabChange("scenes")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold",
            leftTab === "scenes"
              ? "border-b-2 border-[#0B8A83] text-[#0B8A83]"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          Scenes
        </button>
        <button
          type="button"
          onClick={() => onLeftTabChange("assets")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold",
            leftTab === "assets"
              ? "border-b-2 border-[#0B8A83] text-[#0B8A83]"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Images className="h-3.5 w-3.5" />
          Assets
        </button>
      </div>

      {leftTab === "scenes" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
          <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
            Drag to reorder sections guests see. Hide, duplicate, or add a custom section —
            changes show live in the preview.
          </p>
          <ul className="space-y-1">
            {scenes.map((scene, index) => {
              const active = selectedSceneId === scene.id;
              const isHero = scene.tabId === "invitation";
              return (
                <li key={scene.id}>
                  <div
                    draggable
                    onDragStart={() => onDragStart(index)}
                    onDragOver={(e) => onDragOver(e, index)}
                    onDragEnd={onDragEnd}
                    className={cn(
                      "group flex items-center gap-1 rounded-lg border px-1.5 py-1.5 transition-colors",
                      active
                        ? "border-[#0B8A83]/40 bg-[#0B8A83]/5"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50",
                      !scene.visible && "opacity-55",
                      dragIndex === index && "border-[#D4A63A]/50 bg-[#D4A63A]/10"
                    )}
                  >
                    <span
                      className="cursor-grab touch-none p-1 text-slate-300 active:cursor-grabbing group-hover:text-slate-500"
                      aria-hidden
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-sm font-medium text-slate-800"
                      onClick={() => onSelectScene(scene.id)}
                    >
                      {renameId === scene.id ? (
                        <Input
                          autoFocus
                          className="h-7 text-sm"
                          value={scene.title}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            onScenesChange(
                              scenes.map((s) =>
                                s.id === scene.id ? { ...s, title: e.target.value } : s
                              )
                            );
                          }}
                          onBlur={() => setRenameId(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setRenameId(null);
                          }}
                        />
                      ) : (
                        <span className="block truncate">
                          {scene.title}
                          {scene.tabId === "custom" && (
                            <span className="ml-1 text-[10px] font-normal text-slate-400">
                              custom
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => setRenameId(scene.id)}
                        aria-label="Rename scene"
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        onClick={() => onScenesChange(duplicateScene(scenes, scene.id))}
                        aria-label="Duplicate scene"
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        onClick={() =>
                          onScenesChange(toggleSceneVisibility(scenes, scene.id))
                        }
                        aria-label={scene.visible ? "Hide section" : "Show section"}
                        disabled={isHero}
                        title={isHero ? "Hero section stays on" : scene.visible ? "Hide" : "Show"}
                      >
                        {scene.visible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {addable.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Add section
              </p>
              <div className="flex flex-wrap gap-1.5">
                {addable.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => addHubSection(tab)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-[#0B8A83] hover:text-[#0B8A83]"
                  >
                    <Plus className="h-3 w-3" />
                    {HUB_TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Custom section
            </p>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Section title"
              className="h-8 text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                onScenesChange(addCustomScene(scenes, customTitle.trim() || "Custom section"));
                setCustomTitle("Custom section");
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add custom section
            </Button>
          </div>

          {blocksHref && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">Section content</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Edit story, venue text, and custom blocks in the Sections editor.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-2 w-full">
                <a href={blocksHref}>Open sections editor</a>
              </Button>
            </div>
          )}

          <div className="mt-auto pt-4">
            <p className="text-[10px] text-slate-400">
              Freeform drag/resize of every element is planned for a later canvas phase — scene
              order and properties are live now.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{assetsSlot}</div>
      )}
    </aside>
  );
}
