#!/usr/bin/env node
/**
 * Safe smoke test for public invite wishes.
 *
 * Usage:
 *   INVITE_LINK="<uniqueLink>" npm run smoke:wishes
 *   INVITE_LINK="..." BASE_URL="https://www.celeventic.com" npm run smoke:wishes
 *
 * Do not commit real invitation links.
 */

const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const link = (process.env.INVITE_LINK || "").trim();

const PRIVATE_KEYS = [
  "email",
  "phone",
  "contactPhone",
  "qrToken",
  "admissionCode",
  "tokenNonce",
  "authorToken",
  "authorTokenHash",
  "invitationId",
  "guestId",
  "partyId",
  "ip",
];

async function main() {
  if (!link) {
    console.error("Set INVITE_LINK to an invitation uniqueLink (not a full URL with secrets).");
    process.exit(1);
  }

  const url = `${base}/api/invite/wishes?link=${encodeURIComponent(link)}&page=1&limit=10`;
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));

  console.log(JSON.stringify({
    httpStatus: res.status,
    ok: res.ok,
    success: Boolean(body.success),
    itemCount: Array.isArray(body?.data?.items) ? body.data.items.length : null,
    total: body?.data?.total ?? null,
    hasMore: body?.data?.hasMore ?? null,
    pages: body?.data?.pages ?? null,
  }, null, 2));

  if (!res.ok || !body.success) {
    console.error("Smoke failed: wishes endpoint did not succeed");
    process.exit(1);
  }

  const items = body.data.items || [];
  for (const item of items) {
    for (const key of PRIVATE_KEYS) {
      if (key in item && item[key] != null && item[key] !== "") {
        console.error(`Private field leaked in public wish payload: ${key}`);
        process.exit(1);
      }
    }
    if (!item.id || !item.message || !item.authorName) {
      console.error("Wish item missing required public fields");
      process.exit(1);
    }
  }

  console.log("smoke:wishes passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
