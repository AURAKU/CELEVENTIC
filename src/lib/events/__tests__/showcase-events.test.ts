import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isShowcaseEventTitle, mergeShowcaseEvents } from "../showcase-events";

describe("showcase events", () => {
  it("recognises Kojo and Edwin by title", () => {
    assert.equal(isShowcaseEventTitle("Edwin & Lordina"), true);
    assert.equal(isShowcaseEventTitle("Kojo & Fafa"), true);
    assert.equal(isShowcaseEventTitle("Someone Else"), false);
  });

  it("puts Kojo then Edwin ahead of newer private events", () => {
    const merged = mergeShowcaseEvents(
      [
        { id: "edwin", title: "Edwin & Lordina" },
        { id: "kojo", title: "Kojo & Fafa" },
      ],
      [
        { id: "new", title: "Newest Draft" },
        { id: "kojo", title: "Kojo & Fafa" },
        { id: "other", title: "Another Wedding" },
      ],
      5
    );
    assert.deepEqual(
      merged.map((event) => event.id),
      ["kojo", "edwin", "new", "other"]
    );
  });
});
