import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLocalHost,
  isCeleventicDomain,
  resolveAppUrl,
  sanitizePublicUrl,
  DEFAULT_PRODUCTION_URL,
} from "../app-url";

describe("isLocalHost", () => {
  it("flags localhost, 127.0.0.1, and .local hosts", () => {
    assert.equal(isLocalHost("localhost:3000"), true);
    assert.equal(isLocalHost("http://localhost:3000/invite/abc"), true);
    assert.equal(isLocalHost("127.0.0.1:3000"), true);
    assert.equal(isLocalHost("mybox.local"), true);
  });

  it("does not flag live Celeventic domains", () => {
    assert.equal(isLocalHost("www.celeventic.com"), false);
    assert.equal(isLocalHost("https://www.celeventic.com/invite/abc"), false);
  });
});

describe("isCeleventicDomain", () => {
  it("recognizes all canonical live domains", () => {
    assert.equal(isCeleventicDomain("www.celeventic.com"), true);
    assert.equal(isCeleventicDomain("celeventic.org"), true);
    assert.equal(isCeleventicDomain("https://www.celeventic.online/invite/x"), true);
    assert.equal(isCeleventicDomain("localhost"), false);
  });
});

describe("resolveAppUrl", () => {
  it("prefers a non-localhost request host over everything else", () => {
    const url = resolveAppUrl({
      host: "www.celeventic.com",
      protocol: "https",
      envUrl: "http://localhost:3000",
      nodeEnv: "production",
    });
    assert.equal(url, "https://www.celeventic.com");
  });

  it("never trusts a localhost request host, even in production", () => {
    // Reproduces a reverse-proxy misconfiguration where the Host header the
    // Next.js process sees is the internal proxy target, not the public domain.
    const url = resolveAppUrl({
      host: "127.0.0.1:3000",
      envUrl: undefined,
      nodeEnv: "production",
    });
    assert.equal(url, DEFAULT_PRODUCTION_URL);
  });

  it("ignores a localhost NEXT_PUBLIC_APP_URL in production and falls back safely", () => {
    // Reproduces a `.env` copied verbatim from a local dev machine to Hostinger.
    const url = resolveAppUrl({
      host: undefined,
      envUrl: "http://localhost:3000",
      nodeEnv: "production",
    });
    assert.equal(url, DEFAULT_PRODUCTION_URL);
  });

  it("uses a valid non-localhost envUrl when no request host is available", () => {
    const url = resolveAppUrl({ envUrl: "https://celeventic.org", nodeEnv: "production" });
    assert.equal(url, "https://celeventic.org");
  });

  it("only falls back to localhost outside of production", () => {
    const url = resolveAppUrl({ nodeEnv: "development" });
    assert.equal(url, "http://localhost:3000");
  });
});

describe("sanitizePublicUrl", () => {
  it("rewrites a stale localhost URL onto the live base, preserving path/query", () => {
    const result = sanitizePublicUrl(
      "http://localhost:3000/invite/abc123?guest=xyz",
      "https://www.celeventic.com"
    );
    assert.equal(result, "https://www.celeventic.com/invite/abc123?guest=xyz");
  });

  it("leaves an already-live URL untouched", () => {
    const result = sanitizePublicUrl(
      "https://www.celeventic.com/invite/abc123",
      "https://www.celeventic.com"
    );
    assert.equal(result, "https://www.celeventic.com/invite/abc123");
  });

  it("handles a bare localhost string that fails URL parsing", () => {
    const result = sanitizePublicUrl("localhost:3000/invite/abc", "https://www.celeventic.com");
    assert.doesNotMatch(result, /localhost/);
  });
});
