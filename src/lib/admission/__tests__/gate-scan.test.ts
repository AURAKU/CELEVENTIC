import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyGateInput,
  prefersEntryPassAdmit,
} from "@/lib/admission/gate-scan";
import { extractPassToken } from "@/lib/admission/pass-token-format";

const SAMPLE_TOKEN =
  "cvp1.ABCDEFGHIJKLMNOPQRSTUV.ABCDEFGHIJKLMNOPQRSTUV";

describe("gate scan classification", () => {
  it("routes bare and URL pass tokens to the entry-pass path", () => {
    assert.deepEqual(classifyGateInput(SAMPLE_TOKEN), {
      kind: "pass_token",
      token: SAMPLE_TOKEN,
      raw: SAMPLE_TOKEN,
    });
    assert.equal(
      classifyGateInput(`https://celeventic.com/admission/${SAMPLE_TOKEN}?utm=gate`)
        .kind,
      "pass_token"
    );
    assert.equal(
      classifyGateInput(
        `https://celeventic.com/api/admission/pass-image?token=${encodeURIComponent(SAMPLE_TOKEN)}`
      ).kind,
      "pass_token"
    );
    assert.equal(prefersEntryPassAdmit(SAMPLE_TOKEN), true);
  });

  it("routes 4/6-digit codes to the entry-pass path", () => {
    assert.deepEqual(classifyGateInput("1234"), {
      kind: "admission_code",
      code: "1234",
      raw: "1234",
    });
    assert.deepEqual(classifyGateInput("12 34"), {
      kind: "admission_code",
      code: "1234",
      raw: "12 34",
    });
    assert.deepEqual(classifyGateInput("123-456"), {
      kind: "admission_code",
      code: "123456",
      raw: "123-456",
    });
    assert.equal(prefersEntryPassAdmit("48291"), false);
    assert.equal(prefersEntryPassAdmit("482910"), true);
  });

  it("never peels digits out of opaque tokens or verify URLs", () => {
    assert.equal(classifyGateInput("https://celeventic.com/verify/abc123").kind, "legacy");
    assert.equal(classifyGateInput("not-a-token").kind, "legacy");
    assert.equal(classifyGateInput("GUEST-TOKEN-99").kind, "legacy");
    assert.equal(prefersEntryPassAdmit("https://celeventic.com/verify/abc"), false);
  });
});

describe("extractPassToken screenshot / share payloads", () => {
  it("extracts tokens from pass-image query strings and utm paths", () => {
    assert.equal(
      extractPassToken(
        `https://app.celeventic.com/api/admission/pass-image?token=${SAMPLE_TOKEN}&size=512`
      ),
      SAMPLE_TOKEN
    );
    assert.equal(
      extractPassToken(`/admission/${SAMPLE_TOKEN}?utm_source=gate#top`),
      SAMPLE_TOKEN
    );
    assert.equal(extractPassToken("https://app.celeventic.com/verify/xyz"), null);
  });
});
