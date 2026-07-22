/**
 * Studio scene/section model — maps hub tabs + custom sections into an editable list.
 * Additive to designConfig.experience; legacy invites without scenes still work via enabledTabs.
 *
 * Legacy compatibility (no Prisma migration):
 * - Old invites store only `experience.enabledTabs` (and studio.revealMode, etc.).
 * - New Studio writes optional `experience.scenes[]` while also syncing `enabledTabs`.
 * - Readers: if `scenes` is absent, derive from `enabledTabs` (mergeScenesWithTabs).
 * - Custom scenes (tabId "custom") do not appear in guest hub tabs until content blocks exist.
 */
import type { HubTabId, StudioSceneConfig } from "@/lib/experience/experience-types";
import { DEFAULT_HUB_TABS, HUB_TAB_LABELS_FALLBACK } from "@/lib/invitation-studio/hub-tab-labels";

/** @deprecated Prefer StudioSceneConfig from experience-types */
export type StudioScene = StudioSceneConfig;

export function scenesFromEnabledTabs(enabledTabs?: HubTabId[]): StudioScene[] {
  const tabs = enabledTabs?.length ? enabledTabs : DEFAULT_HUB_TABS;
  return tabs.map((tabId) => ({
    id: `scene-${tabId}`,
    tabId,
    title: HUB_TAB_LABELS_FALLBACK[tabId] ?? tabId,
    visible: true,
  }));
}

export function mergeScenesWithTabs(
  scenes: StudioScene[] | undefined,
  enabledTabs?: HubTabId[]
): StudioScene[] {
  if (scenes?.length) {
    return scenes.map((s) => ({
      ...s,
      visible: s.visible !== false,
    }));
  }
  return scenesFromEnabledTabs(enabledTabs);
}

export function enabledTabsFromScenes(scenes: StudioScene[]): HubTabId[] {
  const tabs = scenes
    .filter((s) => s.visible && s.tabId !== "custom")
    .map((s) => s.tabId as HubTabId);
  return tabs.length > 0 ? tabs : ["invitation"];
}

export function reorderScenes(scenes: StudioScene[], fromIndex: number, toIndex: number): StudioScene[] {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= scenes.length || toIndex >= scenes.length) {
    return scenes;
  }
  const next = [...scenes];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function duplicateScene(scenes: StudioScene[], sceneId: string): StudioScene[] {
  const idx = scenes.findIndex((s) => s.id === sceneId);
  if (idx < 0) return scenes;
  const source = scenes[idx];
  // Hub tabs are unique in enabledTabs — duplicates become custom sections with copied title/body
  const copy: StudioScene = {
    ...source,
    id: `scene-dup-${Date.now().toString(36)}`,
    title: `${source.title} (copy)`,
    tabId: "custom",
    body: source.body ?? "",
  };
  const next = [...scenes];
  next.splice(idx + 1, 0, copy);
  return next;
}

export function addCustomScene(scenes: StudioScene[], title = "Custom section"): StudioScene[] {
  return [
    ...scenes,
    {
      id: `scene-custom-${Date.now().toString(36)}`,
      tabId: "custom",
      title,
      visible: true,
      body: "",
    },
  ];
}

export function toggleSceneVisibility(scenes: StudioScene[], sceneId: string): StudioScene[] {
  return scenes.map((s) => (s.id === sceneId ? { ...s, visible: !s.visible } : s));
}
