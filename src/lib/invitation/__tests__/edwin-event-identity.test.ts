import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDuplicateEdwinEvent,
  isEdwinLordinaEventName,
} from "@/lib/invitation/edwin-event-identity";

describe("Edwin event identity", () => {
  it("recognises both spellings of the couple", () => {
    assert.equal(isEdwinLordinaEventName("Edwin & Lordina"), true);
    assert.equal(isEdwinLordinaEventName("Edwin and Lordina"), true);
    assert.equal(isEdwinLordinaEventName("Kojo & Fafa"), false);
  });

  it("treats a second titled event as the duplicate and keeps the canonical slug", () => {
    assert.equal(
      isDuplicateEdwinEvent(
        { id: "dup", slug: "edwin-lordina-wedding", title: "Edwin & Lordina", hostName: "Edwin & Lordina" },
        "canonical"
      ),
      true
    );
    assert.equal(
      isDuplicateEdwinEvent(
        { id: "canonical", slug: "edwin-and-lordina", title: "Edwin & Lordina", hostName: "Edwin & Lordina" },
        "canonical"
      ),
      false
    );
    assert.equal(
      isDuplicateEdwinEvent(
        { id: "kojo", slug: "kojo-and-fafa", title: "Kojo & Fafa", hostName: "Kojo & Fafa" },
        "canonical"
      ),
      false
    );
  });
});
