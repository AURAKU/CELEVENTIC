import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  safeNextPath,
  smartCardLoginPath,
  smartCardSignupPath,
  smartCardStartPath,
  smartCardStudioPath,
} from "../safe-next-path";

describe("safeNextPath", () => {
  it("allows same-app dashboard paths", () => {
    assert.equal(safeNextPath("/dashboard/business-card"), "/dashboard/business-card");
    assert.equal(
      safeNextPath("/dashboard/business-card?plan=yearly"),
      "/dashboard/business-card?plan=yearly"
    );
  });

  it("blocks open redirects and auth loops", () => {
    assert.equal(safeNextPath("https://evil.example/phish"), "/phish");
    assert.equal(safeNextPath("//evil.example"), null);
    assert.equal(safeNextPath("/auth/login"), null);
    assert.equal(safeNextPath("https://celeventic.com/auth/register"), null);
    assert.equal(safeNextPath(""), null);
  });
});

describe("SmartCard signup destinations", () => {
  it("sends new users to register with first-card onboarding as next", () => {
    const href = smartCardSignupPath("yearly", "spotlight");
    assert.equal(href.startsWith("/auth/register?"), true);
    const params = new URLSearchParams(href.split("?")[1]);
    assert.equal(params.get("intent"), "smartcard");
    assert.equal(params.get("plan"), "yearly");
    assert.equal(params.get("theme"), "spotlight");
    assert.equal(params.get("next"), "/dashboard/business-card/start?plan=yearly&theme=spotlight");
    assert.equal(smartCardStartPath(), "/dashboard/business-card/start");
  });

  it("opens studio with plan and theme for signed-in users", () => {
    assert.equal(smartCardStudioPath(), "/dashboard/business-card");
    assert.equal(smartCardStudioPath("monthly"), "/dashboard/business-card?plan=monthly");
  });

  it("signs existing Celeventic users into studio without a second registration", () => {
    const href = smartCardLoginPath("yearly");
    assert.equal(href.startsWith("/auth/login?"), true);
    const params = new URLSearchParams(href.split("?")[1]);
    assert.equal(params.get("callbackUrl"), "/dashboard/business-card?plan=yearly");
  });
});
