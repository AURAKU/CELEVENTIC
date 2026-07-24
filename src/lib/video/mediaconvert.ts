import {
  CreateJobCommand,
  DescribeEndpointsCommand,
  GetJobCommand,
  MediaConvertClient,
  type JobSettings,
  type Output,
  type OutputGroup,
} from "@aws-sdk/client-mediaconvert";
import { getVideoBucketName } from "@/lib/video/s3-video";
import { buildProcessedPrefix } from "@/lib/video/key-builder";
import { HLS_MIN_DURATION_SECONDS } from "@/lib/video/constants";
import type { VideoCategory } from "@/lib/video/constants";

export class MediaConvertNotConfiguredError extends Error {
  constructor() {
    super(
      "AWS MediaConvert is not configured. Set AWS_MEDIACONVERT_ROLE_ARN (and optionally AWS_MEDIACONVERT_ENDPOINT / AWS_MEDIACONVERT_QUEUE_ARN) to enable video processing."
    );
    this.name = "MediaConvertNotConfiguredError";
  }
}

function trimEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

export function isMediaConvertConfigured(): boolean {
  return Boolean(trimEnv("AWS_MEDIACONVERT_ROLE_ARN") && (trimEnv("AWS_REGION") || trimEnv("AWS_DEFAULT_REGION")));
}

export function isVideoProcessingEnabled(): boolean {
  return (trimEnv("VIDEO_PROCESSING_ENABLED") ?? "true").toLowerCase() !== "false";
}

let cachedEndpoint: string | null = null;

/** MediaConvert endpoints are account-specific. Prefer the env var; discover + cache otherwise. */
async function resolveEndpoint(region: string): Promise<string> {
  const fromEnv = trimEnv("AWS_MEDIACONVERT_ENDPOINT");
  if (fromEnv) return fromEnv;
  if (cachedEndpoint) return cachedEndpoint;

  const bootstrapClient = new MediaConvertClient({
    region,
    credentials: {
      accessKeyId: trimEnv("AWS_ACCESS_KEY_ID") ?? "",
      secretAccessKey: trimEnv("AWS_SECRET_ACCESS_KEY") ?? "",
    },
  });
  const out = await bootstrapClient.send(new DescribeEndpointsCommand({}));
  const endpoint = out.Endpoints?.[0]?.Url;
  if (!endpoint) throw new Error("Unable to resolve an AWS MediaConvert account endpoint");
  cachedEndpoint = endpoint;
  return endpoint;
}

async function getMediaConvertClient(): Promise<MediaConvertClient> {
  if (!isMediaConvertConfigured()) throw new MediaConvertNotConfiguredError();
  const region = trimEnv("AWS_REGION") ?? trimEnv("AWS_DEFAULT_REGION")!;
  const endpoint = await resolveEndpoint(region);
  return new MediaConvertClient({
    region,
    endpoint,
    credentials: {
      accessKeyId: trimEnv("AWS_ACCESS_KEY_ID") ?? "",
      secretAccessKey: trimEnv("AWS_SECRET_ACCESS_KEY") ?? "",
    },
  });
}

export interface RenditionSpec {
  name: string;
  width: number;
  height: number;
  videoBitrate: number;
  audioBitrate: number;
}

/** Standard ladder — MediaConvert `ScalingBehavior: FIT_NO_UPSCALE` guarantees we never upscale small sources. */
const STANDARD_RENDITIONS: RenditionSpec[] = [
  { name: "360p", width: 640, height: 360, videoBitrate: 800_000, audioBitrate: 96_000 },
  { name: "480p", width: 854, height: 480, videoBitrate: 1_400_000, audioBitrate: 96_000 },
  { name: "720p", width: 1280, height: 720, videoBitrate: 2_800_000, audioBitrate: 128_000 },
  { name: "1080p", width: 1920, height: 1080, videoBitrate: 5_000_000, audioBitrate: 128_000 },
];

const COMPACT_RENDITION: RenditionSpec = {
  name: "720p-compact",
  width: 1280,
  height: 720,
  videoBitrate: 1_600_000,
  audioBitrate: 96_000,
};

function renditionsForCategory(category: VideoCategory): RenditionSpec[] {
  switch (category) {
    case "INVITATION_BACKGROUND":
      // Short, looping, decorative — keep file size small; one compact rendition is enough.
      return [COMPACT_RENDITION];
    case "GUESTBOOK":
    case "VENDOR_PORTFOLIO":
      return STANDARD_RENDITIONS.slice(0, 3); // up to 720p
    case "EVENT_SHORT":
    case "PREMIUM":
    case "ADMIN":
    default:
      return STANDARD_RENDITIONS; // up to 1080p
  }
}

function shouldMute(category: VideoCategory, context: Record<string, unknown> | null | undefined): boolean {
  if (category !== "INVITATION_BACKGROUND") return false;
  return context?.mute === true || context?.mute === "true";
}

function buildVideoOutput(spec: RenditionSpec, includeAudio: boolean): Output {
  return {
    NameModifier: `_${spec.name}`,
    VideoDescription: {
      Width: spec.width,
      Height: spec.height,
      ScalingBehavior: "FIT_NO_UPSCALE",
      CodecSettings: {
        Codec: "H_264",
        H264Settings: {
          RateControlMode: "QVBR",
          QvbrSettings: { QvbrQualityLevel: 8 },
          MaxBitrate: spec.videoBitrate,
          CodecProfile: "MAIN",
          CodecLevel: "AUTO",
          GopSizeUnits: "SECONDS",
          GopSize: 2,
          SceneChangeDetect: "TRANSITION_DETECTION",
          QualityTuningLevel: "SINGLE_PASS_HQ",
        },
      },
    },
    AudioDescriptions: includeAudio
      ? [
          {
            AudioSourceName: "Audio Selector 1",
            CodecSettings: {
              Codec: "AAC",
              AacSettings: {
                Bitrate: spec.audioBitrate,
                CodingMode: "CODING_MODE_2_0",
                SampleRate: 48000,
              },
            },
          },
        ]
      : [],
    ContainerSettings: { Container: "MP4", Mp4Settings: { MoovPlacement: "PROGRESSIVE_DOWNLOAD" } },
  };
}

function buildHlsOutput(spec: RenditionSpec, includeAudio: boolean): Output {
  return {
    NameModifier: `_${spec.name}`,
    VideoDescription: {
      Width: spec.width,
      Height: spec.height,
      ScalingBehavior: "FIT_NO_UPSCALE",
      CodecSettings: {
        Codec: "H_264",
        H264Settings: {
          RateControlMode: "QVBR",
          QvbrSettings: { QvbrQualityLevel: 7 },
          MaxBitrate: spec.videoBitrate,
          CodecProfile: "MAIN",
          CodecLevel: "AUTO",
          GopSizeUnits: "SECONDS",
          GopSize: 2,
          QualityTuningLevel: "SINGLE_PASS",
        },
      },
    },
    AudioDescriptions: includeAudio
      ? [
          {
            AudioSourceName: "Audio Selector 1",
            CodecSettings: { Codec: "AAC", AacSettings: { Bitrate: spec.audioBitrate, CodingMode: "CODING_MODE_2_0", SampleRate: 48000 } },
          },
        ]
      : [],
    ContainerSettings: { Container: "M3U8" },
  };
}

export interface MediaConvertJobPlan {
  settings: JobSettings;
  outputPrefix: string;
  willProduceHls: boolean;
  renditionNames: string[];
}

export async function buildMediaConvertJobPlan(input: {
  assetId: string;
  category: VideoCategory;
  originalKey: string;
  durationSeconds: number | null;
  context: Record<string, unknown> | null | undefined;
}): Promise<MediaConvertJobPlan> {
  const bucket = await getVideoBucketName();
  const prefix = buildProcessedPrefix(input.category, input.assetId);
  const mute = shouldMute(input.category, input.context);
  const includeAudio = !mute;
  const renditions = renditionsForCategory(input.category);
  const willProduceHls =
    input.category !== "INVITATION_BACKGROUND" &&
    (input.durationSeconds === null || input.durationSeconds >= HLS_MIN_DURATION_SECONDS);

  const outputGroups: OutputGroup[] = [
    {
      Name: "Mp4Renditions",
      OutputGroupSettings: {
        Type: "FILE_GROUP_SETTINGS",
        FileGroupSettings: { Destination: `s3://${bucket}/${prefix}/mp4/video` },
      },
      Outputs: renditions.map((r) => buildVideoOutput(r, includeAudio)),
    },
    {
      Name: "PosterAndThumbnail",
      OutputGroupSettings: {
        Type: "FILE_GROUP_SETTINGS",
        FileGroupSettings: { Destination: `s3://${bucket}/${prefix}/images/frame` },
      },
      Outputs: [
        {
          NameModifier: "_poster",
          VideoDescription: {
            Width: 1280,
            Height: 720,
            ScalingBehavior: "FIT_NO_UPSCALE",
            CodecSettings: {
              Codec: "FRAME_CAPTURE",
              FrameCaptureSettings: { FramerateNumerator: 1, FramerateDenominator: 3, MaxCaptures: 1, Quality: 90 },
            },
          },
          ContainerSettings: { Container: "RAW" },
        },
        {
          NameModifier: "_thumb",
          VideoDescription: {
            Width: 400,
            Height: 400,
            ScalingBehavior: "FIT_NO_UPSCALE",
            CodecSettings: {
              Codec: "FRAME_CAPTURE",
              FrameCaptureSettings: { FramerateNumerator: 1, FramerateDenominator: 5, MaxCaptures: 4, Quality: 80 },
            },
          },
          ContainerSettings: { Container: "RAW" },
        },
      ],
    },
  ];

  if (willProduceHls) {
    outputGroups.push({
      Name: "HlsAbr",
      OutputGroupSettings: {
        Type: "HLS_GROUP_SETTINGS",
        HlsGroupSettings: {
          Destination: `s3://${bucket}/${prefix}/hls/video`,
          SegmentLength: 6,
          MinSegmentLength: 0,
          DirectoryStructure: "SINGLE_DIRECTORY",
          ManifestDurationFormat: "INTEGER",
        },
      },
      Outputs: renditions.map((r) => buildHlsOutput(r, includeAudio)),
    });
  }

  // No `VideoSelector`/codec restriction on the input: MediaConvert auto-probes the source
  // codec and decodes it before encoding outputs. This means H.264, HEVC/H.265 (iPhone/Android
  // HEVC shipped inside .mp4/.mov), ProRes, MPEG-2, VP8/VP9, etc. all flow through the same
  // job settings below and are always transcoded to H.264/AAC (+ HLS) — HEVC is never served
  // as the only public delivery format.
  const settings: JobSettings = {
    Inputs: [
      {
        FileInput: `s3://${bucket}/${input.originalKey}`,
        AudioSelectors: includeAudio ? { "Audio Selector 1": { DefaultSelection: "DEFAULT" } } : undefined,
        TimecodeSource: "ZEROBASED",
      },
    ],
    OutputGroups: outputGroups,
  };

  return {
    settings,
    outputPrefix: prefix,
    willProduceHls,
    renditionNames: renditions.map((r) => r.name),
  };
}

export interface CreatedMediaConvertJob {
  jobId: string;
  queueArn: string | null;
}

export async function createMediaConvertJob(plan: MediaConvertJobPlan, assetId: string): Promise<CreatedMediaConvertJob> {
  const client = await getMediaConvertClient();
  const role = trimEnv("AWS_MEDIACONVERT_ROLE_ARN")!;
  const queue = trimEnv("AWS_MEDIACONVERT_QUEUE_ARN");

  const out = await client.send(
    new CreateJobCommand({
      Role: role,
      Settings: plan.settings,
      Queue: queue,
      UserMetadata: { videoAssetId: assetId },
      // Idempotency: MediaConvert doesn't natively dedupe, so callers must ensure they only
      // call this once per asset (enforced by the QUEUED -> PROCESSING status transition guard).
      StatusUpdateInterval: "SECONDS_60",
    })
  );

  if (!out.Job?.Id) throw new Error("MediaConvert did not return a job id");
  return { jobId: out.Job.Id, queueArn: out.Job.Queue ?? null };
}

export type MediaConvertJobStatus = "SUBMITTED" | "PROGRESSING" | "COMPLETE" | "CANCELED" | "ERROR" | "UNKNOWN";

export interface MediaConvertJobResult {
  status: MediaConvertJobStatus;
  errorMessage: string | null;
  outputDurationMs: number | null;
  outputWidth: number | null;
  outputHeight: number | null;
}

export async function getMediaConvertJobStatus(jobId: string): Promise<MediaConvertJobResult> {
  const client = await getMediaConvertClient();
  const out = await client.send(new GetJobCommand({ Id: jobId }));
  const status = (out.Job?.Status as MediaConvertJobStatus) ?? "UNKNOWN";

  let outputDurationMs: number | null = null;
  let outputWidth: number | null = null;
  let outputHeight: number | null = null;

  const groupDetails = out.Job?.OutputGroupDetails ?? [];
  for (const group of groupDetails) {
    for (const detail of group.OutputDetails ?? []) {
      if (detail.DurationInMs) outputDurationMs = Math.max(outputDurationMs ?? 0, detail.DurationInMs);
      if (detail.VideoDetails?.WidthInPx && detail.VideoDetails?.HeightInPx) {
        outputWidth = Math.max(outputWidth ?? 0, detail.VideoDetails.WidthInPx);
        outputHeight = Math.max(outputHeight ?? 0, detail.VideoDetails.HeightInPx);
      }
    }
  }

  return {
    status,
    errorMessage: out.Job?.ErrorMessage ?? null,
    outputDurationMs,
    outputWidth,
    outputHeight,
  };
}
