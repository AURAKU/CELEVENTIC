import { DEFAULT_PART_SIZE_BYTES, MAX_PARTS, MIN_PART_SIZE_BYTES } from "@/lib/video/constants";

export interface PartPlan {
  partSize: number;
  totalParts: number;
}

/** Chooses a part size that keeps total part count under S3's 10,000-part ceiling. */
export function computePartPlan(totalBytes: number): PartPlan {
  let partSize = DEFAULT_PART_SIZE_BYTES;
  let totalParts = Math.ceil(totalBytes / partSize);
  if (totalParts > MAX_PARTS) {
    partSize = Math.ceil(totalBytes / MAX_PARTS / MIN_PART_SIZE_BYTES) * MIN_PART_SIZE_BYTES;
    totalParts = Math.ceil(totalBytes / partSize);
  }
  return { partSize, totalParts };
}
