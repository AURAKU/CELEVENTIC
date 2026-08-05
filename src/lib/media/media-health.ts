/**
 * Media capability + disk health for admin system health / deploy probes.
 * Never throws — optional zscale missing is a capability flag, not a hard failure.
 */
import { access, constants, statfs } from "fs/promises";
import path from "path";
import { getUploadRoot } from "@/lib/uploads/file-storage";
import { getFfmpegFullCapabilities } from "@/lib/video/ffmpeg-capabilities";
import { prisma } from "@/lib/prisma";
import { VIDEO_PROCESS_QUEUE } from "@/lib/video/queues";

export interface MediaPipelineHealth {
  status: "healthy" | "warning" | "critical";
  message: string;
  details: string[];
  capabilities: {
    ffmpeg: boolean;
    ffprobe: boolean;
    libx264: boolean;
    aac: boolean;
    hevcDecoder: boolean;
    zscale: boolean;
    tonemap: boolean;
    colorspace: boolean;
  };
  storage: {
    uploadRootWritable: boolean;
    freeBytes: number | null;
  };
  queue: {
    failedProcessing: number;
    pendingJobs: number;
  };
}

async function pathWritable(dir: string): Promise<boolean> {
  try {
    await access(dir, constants.W_OK);
    return true;
  } catch {
    try {
      const { mkdir } = await import("fs/promises");
      await mkdir(dir, { recursive: true });
      await access(dir, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}

export async function getMediaPipelineHealth(): Promise<MediaPipelineHealth> {
  const details: string[] = [];
  let caps = {
    ffmpeg: false,
    ffprobe: false,
    libx264: false,
    aac: false,
    hevcDecoder: false,
    zscale: false,
    tonemap: false,
    colorspace: false,
  };

  try {
    const full = await getFfmpegFullCapabilities();
    caps = {
      ffmpeg: full.hasLibx264 || full.hasAac || full.hasHevcDecoder || full.hasZscale || full.hasTonemap,
      ffprobe: true,
      libx264: full.hasLibx264,
      aac: full.hasAac,
      hevcDecoder: full.hasHevcDecoder,
      zscale: full.hasZscale,
      tonemap: full.hasTonemap,
      colorspace: !!full.hasColorspace,
    };
    // Confirm binaries respond — getFfmpegFullCapabilities already probes; empty set ⇒ missing.
    caps.ffmpeg = full.hasLibx264;
    details.push(
      `FFmpeg: libx264=${caps.libx264} aac=${caps.aac} hevc=${caps.hevcDecoder} zscale=${caps.zscale} tonemap=${caps.tonemap} colorspace=${caps.colorspace}`
    );
  } catch (error) {
    details.push(`FFmpeg probe failed: ${error instanceof Error ? error.message : "unknown"}`);
  }

  const uploadRoot = getUploadRoot();
  const uploadRootWritable = await pathWritable(uploadRoot);
  details.push(`Upload root writable: ${uploadRootWritable} (${path.basename(uploadRoot)})`);

  let freeBytes: number | null = null;
  try {
    const fsStat = await statfs(uploadRoot);
    freeBytes = Number(fsStat.bavail) * Number(fsStat.bsize);
    details.push(`Free disk: ${Math.round(freeBytes / (1024 * 1024))}MB`);
  } catch {
    details.push("Free disk: unavailable");
  }

  let failedProcessing = 0;
  let pendingJobs = 0;
  try {
    failedProcessing = await prisma.videoAsset.count({ where: { status: "FAILED" } });
    pendingJobs = await prisma.backgroundJob.count({
      where: {
        queue: VIDEO_PROCESS_QUEUE,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });
    details.push(`Failed videos: ${failedProcessing}; pending video jobs: ${pendingJobs}`);
  } catch {
    details.push("Video queue counts unavailable");
  }

  let status: MediaPipelineHealth["status"] = "healthy";
  let message = "Media pipeline ready";
  if (!caps.libx264 || !uploadRootWritable) {
    status = "critical";
    message = !caps.libx264 ? "FFmpeg H.264 encoder unavailable" : "Upload directory not writable";
  } else if (!caps.hevcDecoder || !caps.zscale) {
    status = "warning";
    message = !caps.hevcDecoder
      ? "HEVC decoder missing — iPhone HEVC uploads may fail"
      : "zscale unavailable — HDR uses colorspace/scale fallback (OK)";
  } else if (failedProcessing > 25) {
    status = "warning";
    message = `${failedProcessing} failed video assets need attention`;
  }

  return {
    status,
    message,
    details,
    capabilities: caps,
    storage: { uploadRootWritable, freeBytes },
    queue: { failedProcessing, pendingJobs },
  };
}
