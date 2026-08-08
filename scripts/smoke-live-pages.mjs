#!/usr/bin/env node
/**
 * Smoke-check public routes against a base URL (default: live).
 * Exit 1 if any route returns 5xx or the branded error card.
 *
 *   node scripts/smoke-live-pages.mjs
 *   BASE_URL=http://127.0.0.1:3000 node scripts/smoke-live-pages.mjs
 */
const BASE = (process.env.BASE_URL || "https://www.celeventic.com").replace(/\/$/, "");

const ROUTES = [
  "/",
  "/pricing",
  "/legal",
  "/auth/login",
  "/invitations",
  "/invitations/catalogue",
  "/invitations/templates/forever-afaris-wedding",
  "/invitations/templates/classic-gold",
  "/invitations/templates/traditional-marriage-ceremony",
  "/templates",
  "/experience",
  "/marketplace",
  "/discover",
  "/api/health",
  // Public thank-you shells must never render the branded error card.
  "/events/demo/thank-you",
  "/thank-you/demo-token",
  // Event Guide public shells — invalid tokens must stay calm (200 page / 404 API).
  "/event-guide/health-check-token",
  "/event-guide/invalid-token-xyz",
  "/api/public/event-guide/invalid-token-xyz",
  "/event-guide-sw.js",
];

async function check(path) {
  const url = BASE + path;
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "CeleventicSmoke/1.0" },
  });
  const text = await res.text();
  const errorCard =
    text.includes("unexpected error") ||
    (text.includes("Something went wrong") && text.includes("Try again"));
  let bad = res.status >= 500 || errorCard;

  // Invalid Event Guide page must render the unavailable shell, not crash.
  if (path === "/event-guide/invalid-token-xyz") {
    if (res.status !== 200 || !text.includes("This guide link is not active")) bad = true;
  }
  // Invalid Event Guide API must refuse with NOT_FOUND, never 500.
  if (path === "/api/public/event-guide/invalid-token-xyz") {
    if (res.status !== 404 || !text.includes("NOT_FOUND")) bad = true;
  }

  return { path, status: res.status, errorCard, bad };
}

async function checkEventGuideSeating() {
  const path = "/api/public/event-guide/invalid-token-xyz/seating";
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "CeleventicSmoke/1.0",
      },
      body: JSON.stringify({ query: "Ada" }),
    });
    const text = await res.text();
    const bad = res.status !== 404 || !text.includes("disabled");
    return { path: `POST ${path}`, status: res.status, errorCard: false, bad };
  } catch (err) {
    return { path: `POST ${path}`, status: 0, errorCard: false, bad: true, err: String(err) };
  }
}

const results = [];
for (const path of ROUTES) {
  try {
    results.push(await check(path));
  } catch (err) {
    results.push({ path, status: 0, errorCard: false, bad: true, err: String(err) });
  }
}
results.push(await checkEventGuideSeating());

let failed = 0;
for (const r of results) {
  const mark = r.bad ? "FAIL" : "ok  ";
  if (r.bad) failed += 1;
  console.log(`${mark}\t${r.status}\t${r.path}${r.errorCard ? "\t[error-card]" : ""}${r.err ? `\t${r.err}` : ""}`);
}

console.log(`\n${failed === 0 ? "PASS" : "FAIL"} — ${results.length - failed}/${results.length} routes healthy @ ${BASE}`);
process.exit(failed === 0 ? 0 : 1);
