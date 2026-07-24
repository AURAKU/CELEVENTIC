import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveVideoStorageStrategy,
  normalizeProvider,
  isLocalFallbackEnabled,
} from "../storage-strategy";

describe("resolveVideoStorageStrategy — the root-cause fix for 'Video storage is not configured'", () => {
  it("uses S3 when the provider is s3 and S3 is actually ready", () => {
    const decision = resolveVideoStorageStrategy({
      providerEnv: "s3",
      s3Ready: true,
      localFallbackEnabledEnv: undefined,
    });
    assert.deepEqual(decision, { strategy: "s3", blocked: false });
  });

  it("falls back to local — never blocks — when MEDIA_STORAGE_PROVIDER is unset and S3 isn't ready (the reported bug's exact scenario)", () => {
    const decision = resolveVideoStorageStrategy({
      providerEnv: undefined,
      s3Ready: false,
      localFallbackEnabledEnv: undefined,
    });
    assert.deepEqual(decision, { strategy: "local", blocked: false });
  });

  it("falls back to local when MEDIA_STORAGE_PROVIDER=s3 is explicitly set but AWS creds are missing (Hostinger today)", () => {
    const decision = resolveVideoStorageStrategy({
      providerEnv: "s3",
      s3Ready: false,
      localFallbackEnabledEnv: undefined,
    });
    assert.deepEqual(decision, { strategy: "local", blocked: false });
  });

  it("uses local directly when the operator explicitly opts out of S3 via MEDIA_STORAGE_PROVIDER, even if S3 happens to be ready", () => {
    const decision = resolveVideoStorageStrategy({
      providerEnv: "local",
      s3Ready: true,
      localFallbackEnabledEnv: undefined,
    });
    assert.deepEqual(decision, { strategy: "local", blocked: false });
  });

  it("only blocks the upload when the operator explicitly disables the fallback AND S3 isn't ready", () => {
    const decision = resolveVideoStorageStrategy({
      providerEnv: "s3",
      s3Ready: false,
      localFallbackEnabledEnv: "false",
    });
    assert.deepEqual(decision, { strategy: "local", blocked: true });
  });

  it("never blocks when S3 is ready, regardless of the fallback flag", () => {
    const decision = resolveVideoStorageStrategy({
      providerEnv: "s3",
      s3Ready: true,
      localFallbackEnabledEnv: "false",
    });
    assert.deepEqual(decision, { strategy: "s3", blocked: false });
  });
});

describe("normalizeProvider", () => {
  it("defaults to 's3' when unset, empty, or whitespace-only", () => {
    assert.equal(normalizeProvider(undefined), "s3");
    assert.equal(normalizeProvider(null), "s3");
    assert.equal(normalizeProvider(""), "s3");
    assert.equal(normalizeProvider("   "), "s3");
  });

  it("trims and lowercases explicit values", () => {
    assert.equal(normalizeProvider("  S3  "), "s3");
    assert.equal(normalizeProvider("Local"), "local");
  });
});

describe("isLocalFallbackEnabled", () => {
  it("defaults to enabled when unset", () => {
    assert.equal(isLocalFallbackEnabled(undefined), true);
    assert.equal(isLocalFallbackEnabled(null), true);
  });

  it("is disabled only for the literal string 'false' (case/whitespace-insensitive)", () => {
    assert.equal(isLocalFallbackEnabled("false"), false);
    assert.equal(isLocalFallbackEnabled("FALSE"), false);
    assert.equal(isLocalFallbackEnabled("  false  "), false);
    assert.equal(isLocalFallbackEnabled("true"), true);
    assert.equal(isLocalFallbackEnabled("no"), true);
  });
});
