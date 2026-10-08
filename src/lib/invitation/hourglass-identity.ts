/**
 * Engraving for the shared hourglass. Identity comes from the invitation
 * board. An empty board stays blank rather than borrowing another couple.
 */
/**
 * The wedding template mounts the spinning hourglass when the design asks
 * for it. Edwin & Lordina's published invitation still stores the catalogue
 * default (`gold-royal`); that page uses the same hourglass.
 */
export function weddingBoardUsesHourglass(
  countdownStyle: string | null | undefined,
  name1?: string | null,
  name2?: string | null
): boolean {
  if (countdownStyle === "hourglass") return true;
  if (countdownStyle !== "gold-royal") return false;
  const first = (value?: string | null) => value?.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  return first(name1) === "EDWIN" && first(name2) === "LORDINA";
}

export function hourglassEngraving(input: {
  name1?: string | null;
  name2?: string | null;
  seal?: string | null;
  displayDate?: string | null;
}): { monogram: string; coupleLine: string; dateLine: string } {
  const first = (value?: string | null) => value?.trim().split(/\s+/).filter(Boolean)[0] ?? "";
  const one = first(input.name1);
  const two = first(input.name2);
  const monogram = input.seal?.trim() || "";
  const coupleLine = [one, two].filter(Boolean).join(" & ");
  const dateLine = input.displayDate?.replace(/\s*•\s*/g, " · ").replace(/\s+/g, " ").trim() || "";
  return { monogram, coupleLine, dateLine };
}
