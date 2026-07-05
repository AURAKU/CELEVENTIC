import type { SeatPosition, TableShape } from "@/lib/seating/seating-types";

const ROUND_RADIUS = 88;
const SQUARE_HALF = 72;
const RECT_HALF_W = 88;
const RECT_HALF_H = 52;

/** Compute seat slot positions around a table (offsets from center in px). */
export function computeSeatPositions(shape: TableShape, seatCount: number): SeatPosition[] {
  const count = Math.max(1, Math.min(seatCount, 20));
  if (shape === "round") return roundPositions(count);
  if (shape === "square") return squarePositions(count);
  return rectanglePositions(count);
}

function roundPositions(count: number): SeatPosition[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      index: i + 1,
      label: String(i + 1),
      offsetX: Math.cos(angle) * ROUND_RADIUS,
      offsetY: Math.sin(angle) * ROUND_RADIUS,
    };
  });
}

/** Seats evenly distributed along a square perimeter. */
function squarePositions(count: number): SeatPosition[] {
  const w = SQUARE_HALF * 2;
  const h = SQUARE_HALF * 2;
  return perimeterPositions(count, w, h, -SQUARE_HALF, -SQUARE_HALF);
}

/** Seats on top and bottom long edges (wider rectangle). */
function rectanglePositions(count: number): SeatPosition[] {
  const w = RECT_HALF_W * 2;
  const h = RECT_HALF_H * 2;
  return perimeterPositions(count, w, h, -RECT_HALF_W, -RECT_HALF_H);
}

function perimeterPositions(
  count: number,
  width: number,
  height: number,
  originX: number,
  originY: number
): SeatPosition[] {
  const perimeter = 2 * (width + height);
  const cx = originX + width / 2;
  const cy = originY + height / 2;

  return Array.from({ length: count }, (_, i) => {
    const t = ((i + 0.5) / count) * perimeter;
    let x: number;
    let y: number;

    if (t <= width) {
      x = originX + t;
      y = originY;
    } else if (t <= width + height) {
      x = originX + width;
      y = originY + (t - width);
    } else if (t <= 2 * width + height) {
      x = originX + width - (t - width - height);
      y = originY + height;
    } else {
      x = originX;
      y = originY + height - (t - 2 * width - height);
    }

    return {
      index: i + 1,
      label: String(i + 1),
      offsetX: x - cx,
      offsetY: y - cy,
    };
  });
}
