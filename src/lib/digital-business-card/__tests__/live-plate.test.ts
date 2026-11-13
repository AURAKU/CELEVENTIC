import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CELEYOU_LIVE_PLATE_ATTR,
  CELEYOU_PLATE_FILE_NAME,
  celeCardLivePlateSnapshotKey,
  pickLivePlateElement,
} from "@/lib/digital-business-card/live-plate";

describe("CeleYou live plate capture", () => {
  it("stores owner snapshots under a sanitized card id", () => {
    assert.equal(celeCardLivePlateSnapshotKey("cm123abc"), "celecard-plates/cm123abc.png");
    assert.equal(celeCardLivePlateSnapshotKey("../etc/passwd"), "celecard-plates/etcpasswd.png");
    assert.equal(celeCardLivePlateSnapshotKey(""), "");
    assert.equal(CELEYOU_LIVE_PLATE_ATTR, "data-celeyou-live-plate");
    assert.equal(CELEYOU_PLATE_FILE_NAME, "celeyou-plate.png");
  });

  it("picks the largest marked live plate in the document", () => {
    const small = {
      getBoundingClientRect: () => ({ width: 80, height: 50 }),
      getClientRects: () => [{}],
    };
    const large = {
      getBoundingClientRect: () => ({ width: 340, height: 214 }),
      getClientRects: () => [{}],
    };
    const hidden = {
      getBoundingClientRect: () => ({ width: 340, height: 214 }),
      getClientRects: () => [],
    };
    const root = {
      querySelectorAll(selector: string) {
        if (selector.includes(CELEYOU_LIVE_PLATE_ATTR)) return [hidden, small, large];
        return [];
      },
    };
    assert.equal(pickLivePlateElement(root as unknown as ParentNode), large as unknown as HTMLElement);
    assert.equal(pickLivePlateElement(null), null);
  });
});
