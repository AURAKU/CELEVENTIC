#!/usr/bin/env node
/**
 * Live invitation parity smoke test.
 *
 * Answers the question that repeatedly could not be answered during the parity
 * incident: *does this exact invitation link actually work for a guest, on this
 * deployment, right now?* Everything is checked from outside the app, over HTTP,
 * exactly as a guest's phone would.
 *
 * Invitation tokens are bearer credentials, so they come from the environment
 * and are redacted in every line of output. A CI log or a pasted terminal
 * transcript must never become a way into someone's invitation.
 *
 *   INVITE_LINK_SINGLE=… npm run smoke:live-invitations
 *   BASE_URL=http://127.0.0.1:3000 INVITE_LINK_SINGLE=… npm run smoke:live-invitations
 *
 * Env:
 *   BASE_URL            default https://www.celeventic.com
 *   INVITE_LINK_SINGLE  a single-guest invitation link or token
 *   INVITE_LINK_GROUP   a group / party invitation link or token
 *   INVITE_LINK_MEDIA   an invitation with cover + gallery media
 *
 * Exit code 1 if any required check fails. Warnings never fail the run.
 */

const BASE = (process.env.BASE_URL || "https://www.celeventic.com").replace(/\/$/, "");

/**
 * Some checks only mean anything when run from outside the deployment. Against
 * a local server they would report the local origin as a leak, which is exactly
 * the kind of false alarm that teaches people to ignore a smoke test.
 */
const BASE_IS_LOCAL = /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?$/i.test(
  BASE
);
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 30_000);
const UA =
  process.env.SMOKE_USER_AGENT ||
  // A real mobile Safari UA: the parity bugs were device-specific, and some
  // upstreams vary their response by user agent.
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const TARGETS = [
  { key: "single", env: "INVITE_LINK_SINGLE", label: "single guest" },
  { key: "group", env: "INVITE_LINK_GROUP", label: "group / party" },
  { key: "media", env: "INVITE_LINK_MEDIA", label: "media heavy" },
];

/* ---------------------------------------------------------------- redaction */

/**
 * Show only enough of a token to correlate two lines of output, never enough to
 * use it. Four leading characters plus a length is identifying but not usable.
 */
function redactToken(token) {
  if (!token) return "(unset)";
  if (token.length <= 8) return `${token.slice(0, 2)}…(${token.length})`;
  return `${token.slice(0, 4)}…${token.length}ch`;
}

const REDACTIONS = [];

/** Scrub every known token out of an arbitrary string before it is printed. */
function scrub(text) {
  let out = String(text);
  for (const { token, mask } of REDACTIONS) {
    if (token) out = out.split(token).join(mask);
  }
  return out;
}

function say(...parts) {
  console.log(scrub(parts.join(" ")));
}

/* ------------------------------------------------------------------- helpers */

/** Mirror of `normalizeInviteLink` for the token the operator supplied. */
function tokenFromEnv(raw) {
  if (!raw) return "";
  let value = String(raw)
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .trim()
    .replace(/^[<("']+/, "")
    .replace(/[>)"']+$/, "");
  try {
    value = decodeURIComponent(value);
  } catch {
    /* keep as-is */
  }
  if (value.includes("/invite/")) value = value.split("/invite/")[1];
  return value.split("#")[0].split("?")[0].replace(/\/+$/, "").trim();
}

async function request(path, { method = "GET", redirect = "follow" } = {}) {
  const url = path.startsWith("http") ? path : BASE + path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      method,
      redirect,
      signal: controller.signal,
      headers: { "user-agent": UA, accept: "*/*" },
    });
    const body = method === "HEAD" ? "" : await res.text();
    return {
      ok: true,
      status: res.status,
      headers: res.headers,
      body,
      location: res.headers.get("location"),
      ms: Date.now() - startedAt,
    };
  } catch (err) {
    return { ok: false, status: 0, body: "", error: String(err), ms: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------------------------------------------- checks */

const results = [];

function record(area, name, pass, detail = "", { warn = false } = {}) {
  results.push({ area, name, pass, detail, warn });
  const mark = pass ? "PASS" : warn ? "WARN" : "FAIL";
  say(`  ${mark.padEnd(4)} ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Absolute URLs pointing at a host only the author's network can resolve. */
const NON_PUBLIC_URL =
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|[\w-]+\.local|[\w-]+\.internal)(?::\d+)?/gi;

/** Server-only filesystem paths that must never appear in a browser payload. */
const FILESYSTEM_PATH = /\/var\/www\/[^\s"']*\/public\/uploads\//gi;

/**
 * Fields that exist on the server model but must never reach a guest's HTML.
 * A leak here is a privacy incident, not a rendering bug.
 */
const PRIVATE_FIELD_MARKERS = [
  "passwordHash",
  "sessionToken",
  "stripeCustomerId",
  "stripeSecret",
  "webhookSecret",
  "NEXTAUTH_SECRET",
  "DATABASE_URL",
  "smtpPassword",
  "apiSecret",
];

async function checkHealth() {
  say("\n[health]");
  const res = await request("/api/health");
  if (!res.ok) {
    record("health", "GET /api/health", false, res.error);
    return;
  }
  record("health", "GET /api/health returns 200", res.status === 200, `status ${res.status}`);
  let json = null;
  try {
    json = JSON.parse(res.body);
  } catch {
    /* non-JSON */
  }
  record("health", "reports ok:true", Boolean(json?.ok), json ? "" : "body was not JSON");

  const build = json?.build;
  record(
    "health",
    "reports a build fingerprint",
    Boolean(build && (build.commit || build.buildId)),
    build ? `commit=${build.commit ?? "-"} buildId=${build.buildId ?? "-"}` : "no build field",
    { warn: true }
  );
  if (build?.startedAt) say(`       process started ${build.startedAt}`);
}

async function checkInvitation({ key, env, label }, rawValue) {
  const token = tokenFromEnv(rawValue);
  say(`\n[${key}] ${label} — ${redactToken(token)}`);

  if (!token) {
    record(key, `${env} is set`, false, "skipped: env var missing");
    return;
  }

  const invitePath = `/invite/${encodeURIComponent(token)}`;

  /* --- the page itself ---------------------------------------------------- */
  const noFollow = await request(invitePath, { redirect: "manual" });
  if (!noFollow.ok) {
    record(key, "invitation responds", false, noFollow.error);
    return;
  }

  const redirected = noFollow.status >= 300 && noFollow.status < 400;
  if (redirected) {
    // A redirect is legitimate only when it settles on the canonical token.
    const settlesOnSelf = (noFollow.location || "").includes(token);
    record(
      key,
      "redirect (if any) stays on this invitation",
      settlesOnSelf,
      `${noFollow.status} → ${scrub(noFollow.location || "?")}`
    );
  } else {
    record(key, "no unexpected redirect", true, `status ${noFollow.status}`);
  }

  const page = redirected ? await request(invitePath) : noFollow;
  record(key, "invitation returns 200", page.status === 200, `status ${page.status} in ${page.ms}ms`);
  if (page.status !== 200) return;

  const html = page.body;
  record(key, "response is HTML", html.includes("<html"), `${html.length} bytes`);

  /*
   * Match these strings only as *rendered element text* (`>text<`).
   *
   * A healthy invitation page still contains both of them — the not-found
   * component travels in the route's flight payload, and "Something went wrong"
   * lives in the i18n dictionary. There they appear inside escaped JSON
   * (`\"…\"`), so a plain `includes()` reports a failure on every working page.
   */
  const renderedText = (phrase) => new RegExp(`>\\s*${phrase}`, "i").test(html);
  record(
    key,
    "not the branded error card",
    !renderedText("This invitation didn(?:&rsquo;|&#x27;|')t finish loading"),
    ""
  );
  record(key, "not a 404 shell", !renderedText("This invitation link is unavailable"), "");

  /* --- no-store, so a shared device never serves another guest's page ----- */
  const cache = page.headers?.get("cache-control") || "";
  record(
    key,
    "guest page is not publicly cacheable",
    /no-store|private|max-age=0/i.test(cache),
    `cache-control: ${cache || "(absent)"}`,
    { warn: true }
  );

  /* --- leaks -------------------------------------------------------------- */
  const nonPublic = [...new Set(html.match(NON_PUBLIC_URL) || [])];
  if (BASE_IS_LOCAL) {
    // Against a local server, `http://localhost:3000` in the payload is the
    // correct app URL. This check is only meaningful from outside.
    record(
      key,
      "no non-public URLs in the payload",
      true,
      `not enforced against a local base (${nonPublic.length} local ref(s))`,
      { warn: true }
    );
  } else {
    record(
      key,
      "no non-public URLs in the payload",
      nonPublic.length === 0,
      nonPublic.slice(0, 5).join(", ")
    );
  }

  const fsPaths = [...new Set(html.match(FILESYSTEM_PATH) || [])];
  record(
    key,
    "no server filesystem paths in the payload",
    fsPaths.length === 0,
    fsPaths.slice(0, 3).join(", ")
  );

  const leakedFields = PRIVATE_FIELD_MARKERS.filter((f) => html.includes(f));
  record(
    key,
    "no private fields in the payload",
    leakedFields.length === 0,
    leakedFields.join(", ")
  );

  /* --- critical assets referenced by the page ----------------------------- */
  const cssHrefs = [...new Set([...html.matchAll(/href="(\/_next\/static\/[^"]+\.css[^"]*)"/g)].map((m) => m[1]))];
  const jsSrcs = [...new Set([...html.matchAll(/src="(\/_next\/static\/[^"]+\.js[^"]*)"/g)].map((m) => m[1]))];
  const assets = [...cssHrefs.slice(0, 4), ...jsSrcs.slice(0, 6)].map((a) => a.replace(/&amp;/g, "&"));

  if (assets.length === 0) {
    record(key, "page references build assets", false, "no /_next/static references found");
  } else {
    const statuses = await Promise.all(assets.map((a) => request(a, { method: "HEAD" })));
    const broken = statuses
      .map((s, i) => ({ asset: assets[i], status: s.status }))
      .filter((s) => s.status !== 200);
    record(
      key,
      `critical assets load (${assets.length} checked)`,
      broken.length === 0,
      broken.map((b) => `${b.asset} → ${b.status}`).slice(0, 4).join(", ")
    );
  }

  /* --- media referenced by the page -------------------------------------- */
  const media = [
    ...new Set(
      [...html.matchAll(/(?:src|href)="(\/uploads\/[^"?#]+)/g)].map((m) =>
        m[1].replace(/&amp;/g, "&")
      )
    ),
  ].slice(0, 8);

  if (media.length === 0) {
    record(key, "media references", true, "none on this invitation", { warn: true });
  } else {
    const statuses = await Promise.all(media.map((m) => request(m, { method: "HEAD" })));
    const broken = statuses
      .map((s, i) => ({ url: media[i], status: s.status }))
      .filter((s) => s.status !== 200 && s.status !== 206);
    record(
      key,
      `media loads (${media.length} checked)`,
      broken.length === 0,
      broken.map((b) => `${b.url} → ${b.status}`).slice(0, 4).join(", ")
    );
  }

  /* --- the APIs the page itself calls ------------------------------------ */
  const admission = await request(`/api/invite/${encodeURIComponent(token)}/admission-status`);
  record(
    key,
    "admission-status answers the same token",
    admission.status === 200 || admission.status === 404,
    `status ${admission.status}`
  );
  if (admission.status === 200) {
    let body = null;
    try {
      body = JSON.parse(admission.body);
    } catch {
      /* ignore */
    }
    record(key, "admission-status returns JSON", body !== null, "");
  }

  const wishes = await request(`/api/invite/wishes?link=${encodeURIComponent(token)}`);
  record(
    key,
    "wishes answers the same token",
    wishes.status === 200 || wishes.status === 404,
    `status ${wishes.status}`
  );

  /* --- mangled forms a messaging app would produce ------------------------ */
  const mangled = [
    { name: "trailing slash", path: `/invite/${encodeURIComponent(token)}/` },
    { name: "percent-encoded", path: `/invite/${encodeURIComponent(token)}%20` },
  ];
  for (const form of mangled) {
    const res = await request(form.path);
    record(
      key,
      `mangled link resolves (${form.name})`,
      res.status === 200,
      `status ${res.status}`,
      { warn: true }
    );
  }
}

/* ---------------------------------------------------------------------- main */

async function main() {
  for (const target of TARGETS) {
    const raw = process.env[target.env];
    if (raw) {
      REDACTIONS.push({ token: tokenFromEnv(raw), mask: `«${target.key}»` });
      REDACTIONS.push({ token: raw, mask: `«${target.key}»` });
    }
  }

  say(`Celeventic live invitation smoke — ${BASE}`);
  say(`user-agent: ${UA.slice(0, 48)}…`);

  await checkHealth();

  const configured = TARGETS.filter((t) => process.env[t.env]);
  if (configured.length === 0) {
    say("\nNo invitation links configured.");
    say("Set at least INVITE_LINK_SINGLE to smoke a real invitation:");
    say("  INVITE_LINK_SINGLE=<token> npm run smoke:live-invitations");
  }

  for (const target of TARGETS) {
    const raw = process.env[target.env];
    if (!raw) {
      say(`\n[${target.key}] ${target.label} — skipped (${target.env} unset)`);
      continue;
    }
    await checkInvitation(target, raw);
  }

  const failures = results.filter((r) => !r.pass && !r.warn);
  const warnings = results.filter((r) => !r.pass && r.warn);

  say("\n────────────────────────────────────────");
  say(`checks: ${results.length}   failures: ${failures.length}   warnings: ${warnings.length}`);
  for (const f of failures) say(`  FAIL [${f.area}] ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  for (const w of warnings) say(`  WARN [${w.area}] ${w.name}${w.detail ? ` — ${w.detail}` : ""}`);

  if (failures.length > 0) {
    say("\nLive invitation parity: FAILED");
    process.exit(1);
  }
  say("\nLive invitation parity: OK");
}

main().catch((err) => {
  console.error(scrub(`smoke runner crashed: ${err?.stack || err}`));
  process.exit(1);
});
