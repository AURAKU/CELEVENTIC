import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isFormDataFile } from "../../../../lib/uploads/form-data-file";

/**
 * Regression coverage for the "Upload failed with status 500" bug: `/api/uploads/video/local`
 * used `file instanceof File`, which throws `ReferenceError: File is not defined` on Node < 20
 * (no global `File` there) — an uncaught exception that surfaced to the client as an opaque 500
 * for every single local-fallback video upload. `isFormDataFile` must correctly identify a real
 * FormData file part using only duck-typing, with zero references to the global `File` value.
 */
describe("isFormDataFile", () => {
  it("accepts a Blob (the common shape of a real multipart file part under Node's undici FormData)", () => {
    const blob = new Blob([Buffer.from("hello")], { type: "video/mp4" });
    assert.equal(isFormDataFile(blob as unknown as FormDataEntryValue), true);
  });

  it("rejects a plain string (the other legal FormData.get() return type)", () => {
    assert.equal(isFormDataFile("just-a-string-field"), false);
  });

  it("rejects null/undefined (missing field)", () => {
    assert.equal(isFormDataFile(null), false);
    assert.equal(isFormDataFile(undefined), false);
  });

  it("rejects a plain object that merely looks numeric but has no arrayBuffer()", () => {
    assert.equal(isFormDataFile({ size: 100 } as unknown as FormDataEntryValue), false);
  });

  it("rejects an object with arrayBuffer() but a non-numeric size", () => {
    const fake = { arrayBuffer: async () => new ArrayBuffer(0), size: "100" };
    assert.equal(isFormDataFile(fake as unknown as FormDataEntryValue), false);
  });

  it("never throws even when the global `File` constructor doesn't exist on this runtime", () => {
    // Simulates Node < 20 (no global File) — the whole point of this helper. If the
    // implementation ever regresses to `value instanceof File`, this throws a ReferenceError.
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "File");
    // @ts-expect-error -- intentionally deleting the global for this test only
    delete globalThis.File;
    try {
      const blob = new Blob(["x"]) as unknown as FormDataEntryValue;
      assert.doesNotThrow(() => isFormDataFile(blob));
      assert.equal(isFormDataFile(blob), true);
    } finally {
      if (originalDescriptor) Object.defineProperty(globalThis, "File", originalDescriptor);
    }
  });

  it("works with a real multipart-parsed FormData file entry end to end", async () => {
    const fd = new FormData();
    fd.append("file", new Blob([Buffer.from("fake-video-bytes")], { type: "video/mp4" }), "clip.mp4");
    const req = new Request("http://localhost/api/uploads/video/local", { method: "POST", body: fd });
    const parsed = await req.formData();
    const file = parsed.get("file");
    assert.equal(isFormDataFile(file), true);
    if (isFormDataFile(file)) {
      const buf = Buffer.from(await file.arrayBuffer());
      assert.equal(buf.toString(), "fake-video-bytes");
    }
  });
});
