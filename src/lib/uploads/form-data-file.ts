/**
 * Runtime-safe check for whether a `FormData` entry is a file part, without ever referencing
 * the global `File` identifier as a value.
 *
 * Why this exists: `formData.get(name)` returns `string | File` per spec, and the natural check
 * is `value instanceof File`. But the global `File` constructor was only added to Node.js in
 * v20 — on Node 18 (still a common production runtime, e.g. Hostinger/pm2 deployments pinned to
 * an LTS image) `File` is `undefined` at the top level, so `instanceof File` throws
 * `ReferenceError: File is not defined` before the check ever runs. This crashes the whole
 * request as an unhandled exception -> generic framework 500, even though the underlying
 * `Request.formData()` (backed by `undici`) parsed the upload fine and produced a perfectly
 * usable File-like object.
 *
 * Duck-typing on the actual Blob/File contract (`arrayBuffer()` + numeric `size`) works
 * identically across Node versions and whichever `File` implementation produced the value
 * (Node's own, undici's, or a browser's), and never touches the possibly-undefined global.
 */
export function isFormDataFile(value: FormDataEntryValue | null | undefined): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
    typeof (value as { size?: unknown }).size === "number"
  );
}
