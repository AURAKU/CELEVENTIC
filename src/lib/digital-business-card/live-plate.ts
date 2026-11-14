export const CELEYOU_LIVE_PLATE_ATTR = "data-celeyou-live-plate";
export const CELEYOU_PLATE_FILE_NAME = "celeyou-plate.png";

export function celeCardLivePlateSnapshotKey(cardId: string): string {
  const id = cardId.replace(/[^a-zA-Z0-9_-]/g, "");
  return id ? `celecard-plates/${id}.png` : "";
}

export function isVisibleLivePlate(node: { getClientRects?: () => ArrayLike<unknown>; getBoundingClientRect?: () => { width: number; height: number } }): boolean {
  const box = node.getBoundingClientRect?.();
  if (!box || box.width < 48 || box.height < 32) return false;
  const rects = node.getClientRects?.();
  return !rects || rects.length > 0;
}

function notShareComposer(node: HTMLElement) {
  if (typeof node.closest !== "function") return true;
  return !node.closest(".celecard-share-layer, .celecard-share-plate");
}

export function pickLivePlateElement(root: ParentNode | null | undefined): HTMLElement | null {
  if (!root || typeof root.querySelectorAll !== "function") return null;
  const marked = Array.from(root.querySelectorAll<HTMLElement>(`[${CELEYOU_LIVE_PLATE_ATTR}]`)).filter(isVisibleLivePlate);
  const liveMarked = marked.filter(notShareComposer);
  if (liveMarked.length) return largestPlate(liveMarked);
  if (marked.length) return largestPlate(marked);
  const faces = Array.from(root.querySelectorAll<HTMLElement>(".celecard-face")).filter(isVisibleLivePlate);
  const liveFaces = faces.filter(notShareComposer);
  return largestPlate(liveFaces.length ? liveFaces : faces);
}

function largestPlate(nodes: HTMLElement[]): HTMLElement | null {
  if (!nodes.length) return null;
  return nodes.reduce((best, node) => {
    const a = area(best);
    const b = area(node);
    return b > a ? node : best;
  });
}

function area(node: HTMLElement) {
  const box = node.getBoundingClientRect();
  return box.width * box.height;
}
