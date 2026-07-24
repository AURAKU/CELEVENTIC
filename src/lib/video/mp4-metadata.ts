/**
 * Best-effort, dependency-free MP4/MOV box walker for pre-processing metadata
 * (duration + dimensions) so the UI/limits can react before MediaConvert runs.
 * This is intentionally lightweight — MediaConvert's own job output (once READY)
 * is the authoritative source and overwrites these values.
 */

interface Box {
  type: string;
  start: number;
  bodyStart: number;
  end: number;
}

function readBoxesAt(buf: Buffer, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    const size32 = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("latin1");
    let boxSize = size32;
    let bodyStart = offset + 8;
    if (size32 === 1) {
      if (offset + 16 > end) break;
      const big = buf.readBigUInt64BE(offset + 8);
      boxSize = Number(big);
      bodyStart = offset + 16;
    } else if (size32 === 0) {
      boxSize = end - offset;
    }
    if (boxSize < 8 || offset + boxSize > end + 8) {
      // Truncated buffer (we only fetch a header window) — stop walking safely.
      boxes.push({ type, start: offset, bodyStart, end: Math.min(offset + boxSize, end) });
      break;
    }
    boxes.push({ type, start: offset, bodyStart, end: offset + boxSize });
    offset += boxSize;
  }
  return boxes;
}

function findBox(boxes: Box[], type: string): Box | undefined {
  return boxes.find((b) => b.type === type);
}

export interface Mp4Metadata {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
}

/**
 * Parse an MP4/MOV `moov` atom. `buf` must contain the full `moov` box —
 * for progressive/"fast-start" files this is near the front; for files with
 * `moov` at the end, callers should fetch the tail of the object instead.
 * Returns nulls (never throws) when the structure can't be confidently parsed.
 */
export function parseMp4Metadata(buf: Buffer): Mp4Metadata {
  try {
    const top = readBoxesAt(buf, 0, buf.length);
    const moov = findBox(top, "moov");
    if (!moov) return { durationSeconds: null, width: null, height: null };

    const moovChildren = readBoxesAt(buf, moov.bodyStart, moov.end);
    let durationSeconds: number | null = null;
    const mvhd = findBox(moovChildren, "mvhd");
    if (mvhd) {
      const version = buf[mvhd.bodyStart];
      if (version === 1) {
        const timescale = buf.readUInt32BE(mvhd.bodyStart + 20);
        const duration = Number(buf.readBigUInt64BE(mvhd.bodyStart + 24));
        if (timescale > 0) durationSeconds = duration / timescale;
      } else {
        const timescale = buf.readUInt32BE(mvhd.bodyStart + 12);
        const duration = buf.readUInt32BE(mvhd.bodyStart + 16);
        if (timescale > 0) durationSeconds = duration / timescale;
      }
    }

    let width: number | null = null;
    let height: number | null = null;
    for (const child of moovChildren) {
      if (child.type !== "trak") continue;
      const trakChildren = readBoxesAt(buf, child.bodyStart, child.end);
      const mdia = findBox(trakChildren, "mdia");
      if (!mdia) continue;
      const mdiaChildren = readBoxesAt(buf, mdia.bodyStart, mdia.end);
      const hdlr = findBox(mdiaChildren, "hdlr");
      if (!hdlr) continue;
      const handlerType = buf.subarray(hdlr.bodyStart + 8, hdlr.bodyStart + 12).toString("latin1");
      if (handlerType !== "vide") continue;

      const tkhd = findBox(trakChildren, "tkhd");
      if (!tkhd) continue;
      const version = buf[tkhd.bodyStart];
      const widthOffset = version === 1 ? tkhd.bodyStart + 88 : tkhd.bodyStart + 76;
      const heightOffset = widthOffset + 4;
      if (heightOffset + 4 <= tkhd.end) {
        // Fixed-point 16.16 — high 16 bits are the integer pixel value.
        width = buf.readUInt16BE(widthOffset);
        height = buf.readUInt16BE(heightOffset);
      }
      break;
    }

    return { durationSeconds, width, height };
  } catch {
    return { durationSeconds: null, width: null, height: null };
  }
}
