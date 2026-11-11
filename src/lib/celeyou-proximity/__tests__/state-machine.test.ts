import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransitionProximity,
  isFailureProximityStatus,
  isTerminalProximityStatus,
  screenForProximityStatus,
} from "@/lib/celeyou-proximity/state-machine";

describe("CeleYou Tap-to-Connect state machine", () => {
  it("lets a host move from discovering to a verified complete share", () => {
    assert.equal(canTransitionProximity("DISCOVERING", "PEER_FOUND"), true);
    assert.equal(canTransitionProximity("PEER_FOUND", "REQUEST_PENDING"), true);
    assert.equal(canTransitionProximity("REQUEST_PENDING", "APPROVED"), true);
    assert.equal(canTransitionProximity("APPROVED", "COMPLETED"), true);
    assert.equal(canTransitionProximity("DISCOVERING", "COMPLETED"), false);
    assert.equal(canTransitionProximity("COMPLETED", "APPROVED"), false);
  });

  it("keeps declined and expired sessions terminal", () => {
    assert.equal(isTerminalProximityStatus("DECLINED"), true);
    assert.equal(isTerminalProximityStatus("EXPIRED"), true);
    assert.equal(isFailureProximityStatus("DECLINED"), true);
    assert.equal(canTransitionProximity("DECLINED", "APPROVED"), false);
  });

  it("shows the recipient the approval screen only after Connect", () => {
    assert.equal(screenForProximityStatus("REQUEST_PENDING", "peer"), "request");
    assert.equal(screenForProximityStatus("REQUEST_PENDING", "host"), "found");
    assert.equal(screenForProximityStatus("APPROVED", "host"), "verifying");
    assert.equal(screenForProximityStatus("COMPLETED", "host"), "success");
    assert.equal(screenForProximityStatus("DISCOVERING", "host"), "searching");
  });
});
