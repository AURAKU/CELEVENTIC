import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  buildMediaConvertJobPlan,
  createMediaConvertJob,
  getMediaConvertJobStatus,
  isMediaConvertConfigured,
  isVideoProcessingEnabled,
  MediaConvertNotConfiguredError,
} from "../mediaconvert";
import { frameCaptureUrl } from "../processing";

const ORIGINAL_ENV = { ...process.env };

before(() => {
  process.env.AWS_REGION = "eu-west-2";
  process.env.AWS_S3_BUCKET = "celeventic-production-media";
  process.env.AWS_ACCESS_KEY_ID = "test-access-key-id";
  process.env.AWS_SECRET_ACCESS_KEY = "test-secret-access-key";
  delete process.env.AWS_MEDIACONVERT_ROLE_ARN;
  delete process.env.AWS_MEDIACONVERT_ENDPOINT;
  delete process.env.AWS_MEDIACONVERT_QUEUE_ARN;
});

after(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("MediaConvert env gating — production-safe when AWS isn't fully configured", () => {
  it("reports not configured without a role ARN", () => {
    assert.equal(isMediaConvertConfigured(), false);
  });

  it("reports configured once a role ARN + region are present", () => {
    process.env.AWS_MEDIACONVERT_ROLE_ARN = "arn:aws:iam::123456789012:role/MediaConvertRole";
    assert.equal(isMediaConvertConfigured(), true);
    delete process.env.AWS_MEDIACONVERT_ROLE_ARN;
  });

  it("defaults VIDEO_PROCESSING_ENABLED to true when unset", () => {
    delete process.env.VIDEO_PROCESSING_ENABLED;
    assert.equal(isVideoProcessingEnabled(), true);
  });

  it("respects VIDEO_PROCESSING_ENABLED=false", () => {
    process.env.VIDEO_PROCESSING_ENABLED = "false";
    assert.equal(isVideoProcessingEnabled(), false);
    delete process.env.VIDEO_PROCESSING_ENABLED;
  });

  it("createMediaConvertJob throws a clear, typed error when the role ARN is missing", async () => {
    const plan = await buildMediaConvertJobPlan({
      assetId: "asset_1",
      category: "EVENT_SHORT",
      originalKey: "uploads/raw/videos/event_short/user_1/x.mp4",
      durationSeconds: 30,
      context: null,
    });
    await assert.rejects(() => createMediaConvertJob(plan, "asset_1"), MediaConvertNotConfiguredError);
  });

  it("getMediaConvertJobStatus throws the same typed error when unconfigured", async () => {
    await assert.rejects(() => getMediaConvertJobStatus("job-123"), MediaConvertNotConfiguredError);
  });
});

describe("buildMediaConvertJobPlan — HEVC-agnostic input, category-driven output ladder", () => {
  it("never restricts the input codec — HEVC, H.264, ProRes, etc. all flow through the same input settings", async () => {
    const plan = await buildMediaConvertJobPlan({
      assetId: "asset_hevc",
      category: "EVENT_SHORT",
      originalKey: "uploads/raw/videos/event_short/user_1/hevc-clip.mov",
      durationSeconds: 120,
      context: null,
    });
    const input = plan.settings.Inputs?.[0];
    assert.ok(input?.FileInput?.includes("hevc-clip.mov"));
    // No VideoSelector / codec restriction on the input — MediaConvert auto-probes and decodes
    // whatever source codec is present (including HEVC) before re-encoding to the outputs below.
    assert.equal((input as Record<string, unknown>).VideoSelector, undefined);
  });

  it("always transcodes to H.264/AAC MP4 outputs regardless of source codec", async () => {
    const plan = await buildMediaConvertJobPlan({
      assetId: "asset_hevc2",
      category: "GUESTBOOK",
      originalKey: "uploads/raw/videos/guestbook/event_1/hevc-clip.mp4",
      durationSeconds: 45,
      context: null,
    });
    const mp4Group = plan.settings.OutputGroups?.find((g) => g.Name === "Mp4Renditions");
    assert.ok(mp4Group);
    for (const output of mp4Group!.Outputs ?? []) {
      assert.equal(output.VideoDescription?.CodecSettings?.Codec, "H_264");
      assert.equal(output.ContainerSettings?.Container, "MP4");
      const audio = output.AudioDescriptions?.[0];
      assert.equal(audio?.CodecSettings?.Codec, "AAC");
    }
  });

  it("invitation backgrounds get one compact rendition, no HLS, and can be muted", async () => {
    const plan = await buildMediaConvertJobPlan({
      assetId: "asset_bg",
      category: "INVITATION_BACKGROUND",
      originalKey: "uploads/raw/videos/invitation_background/user_1/bg.mp4",
      durationSeconds: 12,
      context: { mute: true },
    });
    assert.equal(plan.willProduceHls, false);
    assert.equal(plan.renditionNames.length, 1);
    const mp4Group = plan.settings.OutputGroups?.find((g) => g.Name === "Mp4Renditions");
    const output = mp4Group?.Outputs?.[0];
    assert.equal(output?.AudioDescriptions?.length, 0);
  });

  it("long event videos get an HLS ABR output group in addition to MP4", async () => {
    const plan = await buildMediaConvertJobPlan({
      assetId: "asset_long",
      category: "EVENT_SHORT",
      originalKey: "uploads/raw/videos/event_short/user_1/long.mp4",
      durationSeconds: 600,
      context: null,
    });
    assert.equal(plan.willProduceHls, true);
    const hlsGroup = plan.settings.OutputGroups?.find((g) => g.Name === "HlsAbr");
    assert.ok(hlsGroup);
    assert.equal(hlsGroup?.OutputGroupSettings?.Type, "HLS_GROUP_SETTINGS");
  });

  it("short/unknown-duration videos skip HLS to avoid pointless segmenting", async () => {
    const plan = await buildMediaConvertJobPlan({
      assetId: "asset_short",
      category: "VENDOR_PORTFOLIO",
      originalKey: "uploads/raw/videos/vendor_portfolio/vendor_1/short.mp4",
      durationSeconds: 20,
      context: null,
    });
    assert.equal(plan.willProduceHls, false);
  });

  it("uses FIT_NO_UPSCALE scaling on every video rendition (never upscale small sources)", async () => {
    const plan = await buildMediaConvertJobPlan({
      assetId: "asset_scale",
      category: "ADMIN",
      originalKey: "uploads/raw/videos/admin/admin_1/clip.mp4",
      durationSeconds: 30,
      context: null,
    });
    const mp4Group = plan.settings.OutputGroups?.find((g) => g.Name === "Mp4Renditions");
    for (const output of mp4Group!.Outputs ?? []) {
      assert.equal(output.VideoDescription?.ScalingBehavior, "FIT_NO_UPSCALE");
    }
  });
});

describe("frameCaptureUrl — MediaConvert FRAME_CAPTURE output naming", () => {
  it("zero-pads the frame sequence to 7 digits", () => {
    assert.equal(frameCaptureUrl("https://media.celeventic.com/processed/x/frame", "_poster", 0), "https://media.celeventic.com/processed/x/frame_poster.0000000.jpg");
    assert.equal(frameCaptureUrl("https://media.celeventic.com/processed/x/frame", "_thumb", 3), "https://media.celeventic.com/processed/x/frame_thumb.0000003.jpg");
  });
});
