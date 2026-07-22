/** Perceived-luminance check for choosing light/dark component variants. */
export function isDarkColor(color: string): boolean {
  const hex = color.trim().replace("#", "");
  const full =
    hex.length === 3
      ? hex.split("").map((c) => c + c).join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}/.test(full)) return false;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}
