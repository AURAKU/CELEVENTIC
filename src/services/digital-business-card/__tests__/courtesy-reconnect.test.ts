import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeReconnectFingerprint } from "../courtesy-reconnect.service";

describe("courtesy reconnect fingerprints", () => {
  it("dedupes by email, then phone, then anonymous ip + name", () => {
    assert.equal(
      normalizeReconnectFingerprint({ visitorName: "Kojo", visitorEmail: "Kojo@Host.test", visitorPhone: "024", ip: "1.1.1.1" }),
      "email:kojo@host.test"
    );
    assert.equal(
      normalizeReconnectFingerprint({ visitorName: "Kojo", visitorEmail: null, visitorPhone: "+233 24 000 0000", ip: "1.1.1.1" }),
      "phone:233240000000"
    );
    assert.equal(
      normalizeReconnectFingerprint({ visitorName: "Visitor", visitorEmail: null, visitorPhone: null, ip: "8.8.8.8" }),
      "anon:8.8.8.8:visitor"
    );
  });
});
