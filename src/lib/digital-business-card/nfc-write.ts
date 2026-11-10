import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";

type NdefWriter = {
  write: (message: { records: Array<{ recordType: string; data: string }> }) => Promise<void>;
};

function ndefReaderCtor(): (new () => NdefWriter) | null {
  const ctor = (globalThis as { NDEFReader?: new () => NdefWriter }).NDEFReader;
  return ctor ?? null;
}

/** Writes the public CeleYou URL to a physical tag. Chrome on Android only. */
export async function writeCeleCardNfcUrl(url: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const destination = url.trim();
  if (!/^https?:\/\//i.test(destination)) {
    return { ok: false, reason: "NFC tags need a full https link." };
  }
  const support = detectNfcWriteSupport();
  if (!support.canWrite) {
    return { ok: false, reason: support.guidance };
  }
  const Reader = ndefReaderCtor();
  if (!Reader) {
    return { ok: false, reason: support.guidance };
  }
  try {
    const ndef = new Reader();
    await ndef.write({ records: [{ recordType: "url", data: destination }] });
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "Could not write the tag. Hold it still, then try again, or copy the link into an NFC writer.",
    };
  }
}
