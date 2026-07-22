/**
 * Studio layers panel model — MVP list of composited invitation layers.
 * Order drives guest z-index stacking; visibility hides layers; snap guides aid studio alignment.
 */

export type StudioLayerId =
  | "background"
  | "ornament"
  | "hero-media"
  | "heading"
  | "script"
  | "body"
  | "countdown"
  | "actions"
  | "environment";

export interface StudioLayer {
  id: StudioLayerId;
  label: string;
  visible: boolean;
}

export const DEFAULT_STUDIO_LAYERS: StudioLayer[] = [
  { id: "background", label: "Background", visible: true },
  { id: "ornament", label: "Frame & ornament", visible: true },
  { id: "hero-media", label: "Hero media", visible: true },
  { id: "heading", label: "Heading text", visible: true },
  { id: "script", label: "Script text", visible: true },
  { id: "body", label: "Body text", visible: true },
  { id: "countdown", label: "Countdown", visible: true },
  { id: "actions", label: "Action buttons", visible: true },
  { id: "environment", label: "Particles / atmosphere", visible: true },
];

/** Snap guide presets — percentages of canvas for MVP alignment */
export const SNAP_GUIDES = [
  { id: "center", label: "Center", x: 50, y: 50 },
  { id: "safe-top", label: "Safe top", x: 50, y: 18 },
  { id: "safe-bottom", label: "Safe bottom", x: 50, y: 82 },
  { id: "left-third", label: "Left third", x: 33, y: 50 },
  { id: "right-third", label: "Right third", x: 67, y: 50 },
] as const;

export type SnapGuideId = (typeof SNAP_GUIDES)[number]["id"];

export function mergeLayers(
  order?: StudioLayerId[],
  hidden?: StudioLayerId[]
): StudioLayer[] {
  const base = order?.length
    ? (order
        .map((id) => DEFAULT_STUDIO_LAYERS.find((l) => l.id === id))
        .filter(Boolean) as StudioLayer[])
    : [...DEFAULT_STUDIO_LAYERS];

  const known = new Set(base.map((l) => l.id));
  for (const layer of DEFAULT_STUDIO_LAYERS) {
    if (!known.has(layer.id)) base.push({ ...layer });
  }

  const hiddenSet = new Set(hidden ?? []);
  return base.map((l) => ({ ...l, visible: !hiddenSet.has(l.id) }));
}

export function reorderLayers(layers: StudioLayer[], fromIndex: number, toIndex: number): StudioLayer[] {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= layers.length || toIndex >= layers.length) {
    return layers;
  }
  const next = [...layers];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function layersToOrderAndHidden(layers: StudioLayer[]): {
  layerOrder: StudioLayerId[];
  hiddenLayers: StudioLayerId[];
} {
  return {
    layerOrder: layers.map((l) => l.id),
    hiddenLayers: layers.filter((l) => !l.visible).map((l) => l.id),
  };
}

/** Base z-index for compositing (background → foreground by list order). */
const LAYER_Z_BASE = 1;

/**
 * Map layer ids → z-index from `layerOrder` (first = behind, last = in front).
 * Missing order falls back to DEFAULT_STUDIO_LAYERS sequence.
 */
export function layerZIndexMap(order?: string[] | null): Record<StudioLayerId, number> {
  const ids = (
    order?.length
      ? order.filter((id): id is StudioLayerId =>
          DEFAULT_STUDIO_LAYERS.some((l) => l.id === id)
        )
      : DEFAULT_STUDIO_LAYERS.map((l) => l.id)
  ) as StudioLayerId[];

  const known = new Set(ids);
  for (const layer of DEFAULT_STUDIO_LAYERS) {
    if (!known.has(layer.id)) ids.push(layer.id);
  }

  const map = {} as Record<StudioLayerId, number>;
  ids.forEach((id, i) => {
    map[id] = LAYER_Z_BASE + i;
  });
  return map;
}

export function layerZIndex(order: string[] | null | undefined, id: StudioLayerId): number {
  return layerZIndexMap(order)[id];
}
