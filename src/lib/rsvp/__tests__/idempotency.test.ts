import test from "node:test";
import assert from "node:assert/strict";
import { shouldReuseLatestRsvp } from "../idempotency";

test("first submit is never a duplicate", () => {
  assert.equal(shouldReuseLatestRsvp(null, { response: "ACCEPTED" }), false);
});

test("identical response and message is reused", () => {
  assert.equal(
    shouldReuseLatestRsvp(
      { response: "ACCEPTED", message: "see you" },
      { response: "ACCEPTED", message: "see you" }
    ),
    true
  );
});

test("changed response creates a new history row", () => {
  assert.equal(
    shouldReuseLatestRsvp(
      { response: "ACCEPTED", message: null },
      { response: "DECLINED" }
    ),
    false
  );
});

test("changed message is a new signal", () => {
  assert.equal(
    shouldReuseLatestRsvp(
      { response: "ACCEPTED", message: "one" },
      { response: "ACCEPTED", message: "two" }
    ),
    false
  );
});
