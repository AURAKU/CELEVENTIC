import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inviteLiveRecoveryUrl } from "@/lib/invitation/invite-error-recovery";

describe("invite live recovery", () => {
  it("sends a local invitation path to the live Celeventic domain", () => {
    assert.equal(
      inviteLiveRecoveryUrl({
        hostname: "127.0.0.1",
        pathname: "/invite/edwin-and-lordina",
        search: "?skipIntro=1",
        hash: "#wishes",
      }),
      "https://www.celeventic.com/invite/edwin-and-lordina?skipIntro=1#wishes"
    );
    assert.equal(
      inviteLiveRecoveryUrl({
        hostname: "localhost",
        pathname: "/invite/edwin-and-lordina",
      }),
      "https://www.celeventic.com/invite/edwin-and-lordina"
    );
  });

  it("does not rewrite a live invitation or a non-invite path", () => {
    assert.equal(
      inviteLiveRecoveryUrl({
        hostname: "www.celeventic.com",
        pathname: "/invite/edwin-and-lordina",
      }),
      null
    );
    assert.equal(
      inviteLiveRecoveryUrl({
        hostname: "127.0.0.1",
        pathname: "/dashboard/business-card",
      }),
      null
    );
  });
});
