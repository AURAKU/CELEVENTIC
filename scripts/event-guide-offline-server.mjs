#!/usr/bin/env node
/**
 * Celeventic Event Guide — Venue Offline Pack runner.
 *
 * This file is shipped *inside* a downloaded pack and run by a venue operator
 * on a laptop or mini-server on the event Wi-Fi. It must therefore have zero
 * dependencies and read nothing outside its own folder.
 *
 *   node serve.mjs --port 4173
 *
 * Security posture:
 *   - Verifies the pack's HMAC signature before serving anything. A tampered
 *     pack refuses to start rather than serving altered content.
 *   - Refuses to serve after the pack's expiry.
 *   - Serves exactly four routes. Unknown paths get a bare 404 — no directory
 *     listing, no file server, no path traversal surface.
 *   - Rate limits seating lookups per client address.
 *   - Holds no organizer credentials and cannot write to the live event.
 *
 * Anonymous counters are appended to `sync-queue.json` for the organizer to
 * upload afterwards.
 */

import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const QUEUE_PATH = join(HERE, "sync-queue.json");

const RATE_LIMIT = { attempts: 12, windowMs: 60_000 };
const buckets = new Map();

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function fail(message) {
  console.error(`\n  Event Guide offline pack: ${message}\n`);
  process.exit(1);
}

async function readJson(name) {
  const path = join(HERE, name);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    fail(`${name} is not readable JSON. Download a fresh pack.`);
  }
}

function signingKey() {
  const secret = process.env.EVENT_GUIDE_PACK_SECRET;
  if (!secret) {
    fail(
      "EVENT_GUIDE_PACK_SECRET is not set.\n" +
        "  Copy it from Celeventic → Event Guide → Offline Readiness, then run:\n" +
        "    EVENT_GUIDE_PACK_SECRET=... node serve.mjs"
    );
  }
  return secret;
}

function signManifest(manifest) {
  const canonical = JSON.stringify({
    format: manifest.format,
    packVersion: manifest.packVersion,
    guideVersion: manifest.guideVersion,
    eventTitle: manifest.eventTitle,
    seatingMode: manifest.seatingMode,
    issuedAt: manifest.issuedAt,
    expiresAt: manifest.expiresAt,
    files: manifest.files.map((f) => [f.path, f.sha256, f.bytes]),
  });
  return createHmac("sha256", signingKey()).update(canonical).digest("hex");
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function seatingIndexKey(salt, value) {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}

function normalizeNameKey(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function constantTimeEquals(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function rateLimited(key) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }
  if (bucket.count >= RATE_LIMIT.attempts) return true;
  bucket.count += 1;
  return false;
}

function findSeat(entries, mode, salt, rawQuery) {
  if (mode === "CODE_ONLY") {
    const digits = String(rawQuery).replace(/[^0-9]/g, "");
    if (!digits) return { status: "no_match" };
    const key = seatingIndexKey(salt, `code:${digits}`);
    const entry = entries.find((e) => e.k === key);
    return entry ? { status: "ok", entry } : { status: "no_match" };
  }

  const query = normalizeNameKey(rawQuery);
  if (!query) return { status: "no_match" };

  if (mode === "HASHED_NAME") {
    const key = seatingIndexKey(salt, `name:${query}`);
    const entry = entries.find((e) => e.k === key);
    return entry ? { status: "ok", entry } : { status: "no_match" };
  }

  const tokens = query.split(" ").filter(Boolean);
  const matches = entries.filter((entry) => {
    const haystacks = [entry.k, ...(entry.members ?? []).map(normalizeNameKey)];
    return haystacks.some((hay) => {
      if (hay === query) return true;
      const hayTokens = hay.split(" ").filter(Boolean);
      return tokens.every((t) => hayTokens.some((h) => h === t || h.startsWith(t)));
    });
  });

  if (matches.length === 0) return { status: "no_match" };
  if (matches.length > 1) return { status: "ambiguous", matchCount: matches.length };
  return { status: "ok", entry: matches[0] };
}

async function appendToQueue(record) {
  let queue = [];
  if (existsSync(QUEUE_PATH)) {
    try {
      queue = JSON.parse(await readFile(QUEUE_PATH, "utf8"));
      if (!Array.isArray(queue)) queue = [];
    } catch {
      queue = [];
    }
  }
  queue.push(record);
  await writeFile(QUEUE_PATH, JSON.stringify(queue.slice(-20000), null, 0), "utf8");
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

/**
 * The local guide page.
 *
 * Deliberately a single self-contained document with no build step and no
 * external requests: on a venue network with no internet, anything fetched from
 * a CDN would simply never arrive.
 */
function renderPage(guide, manifest, token) {
  const theme = guide.theme ?? {};
  const colors = theme.colors ?? {};
  const header = guide.header ?? {};
  const seatingOn = manifest.seatingMode !== "DISABLED";

  const programme = (guide.programme ?? [])
    .map(
      (item) => `<li class="row">
        ${item.time ? `<p class="time">${escapeHtml(item.time)}</p>` : ""}
        <p class="title">${escapeHtml(item.title)}</p>
        ${item.description ? `<p class="detail">${escapeHtml(item.description)}</p>` : ""}
      </li>`
    )
    .join("");

  const menuSections = (guide.menu?.sections ?? [])
    .map(
      (section) => `<div class="row">
        <p class="time">${escapeHtml(section.heading)}</p>
        ${(section.items ?? []).map((i) => `<p class="detail">${escapeHtml(i)}</p>`).join("")}
      </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${escapeHtml(header.eventTitle ?? "Event Guide")} — Event Guide</title>
<style>
:root{
  --bg:${escapeHtml(colors.background ?? "#fbf8f3")};
  --text:${escapeHtml(colors.text ?? "#2b2118")};
  --primary:${escapeHtml(colors.primary ?? "#0b3b39")};
  --secondary:${escapeHtml(colors.secondary ?? "#c7a35a")};
  --accent:${escapeHtml(colors.accent ?? "#0b8a83")};
  --paper:${escapeHtml(theme.paperWash ?? "rgba(255,255,255,.7)")};
  --hair:${escapeHtml(theme.accentWash ?? "rgba(199,163,90,.2)")};
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:Georgia,"Times New Roman",serif;padding:2.5rem 1.25rem 4rem}
main{max-width:34rem;margin:0 auto}
header{text-align:center}
.eyebrow{font-size:.68rem;letter-spacing:.3em;text-transform:uppercase;color:var(--secondary);margin:0;font-family:system-ui,sans-serif}
h1{font-size:1.9rem;margin:.6rem 0 0;color:var(--primary);line-height:1.2}
.sub{margin:.5rem 0 0;opacity:.8;font-size:.85rem}
nav{display:flex;gap:.25rem;background:var(--hair);border-radius:999px;padding:.25rem;margin:2rem 0 1.25rem}
nav button{flex:1;border:0;border-radius:999px;padding:.7rem;font:600 .8rem/1 system-ui,sans-serif;background:transparent;color:var(--text);cursor:pointer}
nav button[aria-current="page"]{background:var(--accent);color:#fff}
.row{border:1px solid var(--hair);background:var(--paper);border-radius:1rem;padding:1rem 1.25rem;margin-bottom:.75rem}
.time{margin:0;font:600 .7rem/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--secondary)}
.title{margin:.35rem 0 0;font-size:1.05rem;color:var(--primary)}
.detail{margin:.3rem 0 0;font-size:.88rem;opacity:.82}
ol{list-style:none;padding:0;margin:0}
input{width:100%;padding:.85rem 1rem;border:1px solid var(--hair);border-radius:.75rem;background:transparent;color:var(--text);font-size:1.05rem}
button.go{width:100%;margin-top:.75rem;padding:.85rem;border:0;border-radius:999px;background:var(--accent);color:#fff;font:700 .82rem/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.note{font-size:.72rem;opacity:.6;margin-top:1.25rem;line-height:1.6}
.local{margin-top:2.5rem;text-align:center;font:.68rem/1.6 system-ui,sans-serif;opacity:.55}
[hidden]{display:none}
</style></head>
<body><main>
<header>
  <p class="eyebrow">Event Guide</p>
  <h1>${escapeHtml(header.eventTitle ?? "")}</h1>
  ${header.celebrants ? `<p class="sub">${escapeHtml(header.celebrants)}</p>` : ""}
  ${
    header.dateLabel || header.venue
      ? `<p class="sub">${escapeHtml([header.dateLabel, header.venue].filter(Boolean).join("  ·  "))}</p>`
      : ""
  }
  ${header.welcome ? `<p class="sub">${escapeHtml(header.welcome)}</p>` : ""}
</header>

<nav>
  <button data-tab="programme" aria-current="page">Programme</button>
  ${seatingOn ? '<button data-tab="seating">Seating</button>' : ""}
  <button data-tab="menu">Menu</button>
</nav>

<section data-panel="programme">
  <ol>${programme || '<li class="row"><p class="detail">The programme will appear here.</p></li>'}</ol>
</section>

<section data-panel="menu" hidden>
  ${menuSections}
  ${
    guide.menu?.body
      ? `<div class="row"><p class="detail" style="white-space:pre-wrap">${escapeHtml(guide.menu.body)}</p></div>`
      : ""
  }
  ${!menuSections && !guide.menu?.body ? '<div class="row"><p class="detail">The menu will appear here.</p></div>' : ""}
</section>

${
  seatingOn
    ? `<section data-panel="seating" hidden>
  <div class="row">
    <p class="time">${manifest.seatingMode === "CODE_ONLY" ? "Your admission code" : "Your name"}</p>
    <p class="detail">We will show only your own table.</p>
    <input id="q" style="margin-top:.9rem" inputmode="${manifest.seatingMode === "CODE_ONLY" ? "numeric" : "text"}" placeholder="${manifest.seatingMode === "CODE_ONLY" ? "e.g. 123 456" : "e.g. Ama Mensah"}"/>
    <button class="go" id="find">Find my table</button>
    <div id="out" class="detail" style="margin-top:1rem"></div>
    <p class="note">Other guests' seats are never shown.</p>
  </div>
</section>`
    : ""
}

<p class="local">Venue offline guide · works on this venue's Wi-Fi only</p>
</main>
<script>
const token=${JSON.stringify(token)};
const panels=[...document.querySelectorAll('[data-panel]')];
document.querySelectorAll('nav button').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('nav button').forEach(b=>b.removeAttribute('aria-current'));
  btn.setAttribute('aria-current','page');
  const tab=btn.dataset.tab;
  panels.forEach(p=>p.hidden = p.dataset.panel!==tab);
  navigator.sendBeacon?.('/guide/'+token+'/event',new Blob([JSON.stringify({tab})],{type:'application/json'}));
}));
const find=document.getElementById('find');
if(find){
  const run=async()=>{
    const out=document.getElementById('out');
    out.textContent='Checking…';
    try{
      const res=await fetch('/guide/'+token+'/seating',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:document.getElementById('q').value})});
      const data=await res.json();
      if(data.status==='ok'){
        const e=data.entry;
        out.innerHTML='<p class="time">Your table</p><p class="title" style="font-size:1.6rem">'+(e.table||'Not yet assigned')+'</p>'+
          (e.seat?'<p class="detail">Seat '+e.seat+'</p>':'')+(e.zone?'<p class="detail">'+e.zone+'</p>':'')+
          (e.ceremonyRow?'<p class="time" style="margin-top:.9rem">Ceremony</p><p class="title">'+e.ceremonyRow+'</p>':'');
      } else if(data.status==='ambiguous'){
        out.textContent='More than one guest matches that. Please add a surname.';
      } else if(data.status==='rate_limited'){
        out.textContent='That is a lot of tries. Please wait a moment.';
      } else {
        out.textContent='We could not find that. Please ask a member of the host team.';
      }
    }catch{ out.textContent='Something went wrong. Please try again.'; }
  };
  find.addEventListener('click',run);
  document.getElementById('q').addEventListener('keydown',e=>{if(e.key==='Enter')run();});
}
navigator.sendBeacon?.('/guide/'+token+'/event',new Blob([JSON.stringify({tab:'programme'})],{type:'application/json'}));
</script>
</body></html>`;
}

async function main() {
  const manifest = await readJson("manifest.json");
  if (!manifest) fail("manifest.json is missing. This is not a complete pack.");
  if (manifest.format !== "celeventic.event-guide-pack/1") {
    fail(`unsupported pack format "${manifest.format}".`);
  }

  // Integrity before anything else: a pack whose files were altered must not run.
  const expected = signManifest(manifest);
  if (!constantTimeEquals(manifest.signature, expected)) {
    fail("signature verification failed. This pack was altered — download a fresh one.");
  }

  for (const entry of manifest.files) {
    const path = join(HERE, entry.path);
    if (!existsSync(path)) fail(`${entry.path} is missing from this pack.`);
    const actual = sha256(await readFile(path));
    if (actual !== entry.sha256) {
      fail(`${entry.path} does not match the manifest. This pack was altered.`);
    }
  }

  if (new Date(manifest.expiresAt).getTime() <= Date.now()) {
    fail(`this pack expired on ${manifest.expiresAt}. Download a fresh one from Celeventic.`);
  }

  const guide = await readJson("guide.json");
  if (!guide) fail("guide.json is missing from this pack.");
  const seating = manifest.seatingMode === "DISABLED" ? [] : ((await readJson("seating-index.json")) ?? []);

  const token = manifest.offlineToken;
  const port = Number(arg("port", "4173"));
  const host = arg("host", "0.0.0.0");
  const page = renderPage(guide, manifest, token);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const client = req.socket.remoteAddress ?? "unknown";

    const send = (status, body, type = "text/plain; charset=utf-8") => {
      res.writeHead(status, {
        "Content-Type": type,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      });
      res.end(body);
    };

    // Expiry is re-checked per request so a long-running process stops on time.
    if (new Date(manifest.expiresAt).getTime() <= Date.now()) {
      return send(410, "This offline guide has expired.");
    }

    if (req.method === "GET" && url.pathname === `/guide/${token}`) {
      return send(200, page, "text/html; charset=utf-8");
    }

    if (req.method === "POST" && url.pathname === `/guide/${token}/seating`) {
      if (manifest.seatingMode === "DISABLED") return send(404, "");
      if (rateLimited(client)) {
        return send(429, JSON.stringify({ status: "rate_limited" }), "application/json");
      }
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 4096) return send(413, "");
      }
      let query = "";
      try {
        query = String(JSON.parse(body || "{}").query ?? "").slice(0, 80);
      } catch {
        return send(400, JSON.stringify({ status: "no_match" }), "application/json");
      }

      const minimum = manifest.seatingMode === "CODE_ONLY" ? 4 : 3;
      if (query.trim().length < minimum) {
        return send(200, JSON.stringify({ status: "query_too_short" }), "application/json");
      }

      const result = findSeat(seating, manifest.seatingMode, manifest.seatingSalt, query);
      await appendToQueue({
        clientRecordId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        capturedAt: new Date().toISOString(),
        day: new Date().toISOString().slice(0, 10),
        tab: "seating",
        views: 0,
        searches: 1,
        matches: result.status === "ok" ? 1 : 0,
      });

      return send(200, JSON.stringify(result), "application/json");
    }

    if (req.method === "POST" && url.pathname === `/guide/${token}/event`) {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 1024) break;
      }
      try {
        const tab = JSON.parse(body || "{}").tab;
        if (tab === "programme" || tab === "seating" || tab === "menu") {
          await appendToQueue({
            clientRecordId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            capturedAt: new Date().toISOString(),
            day: new Date().toISOString().slice(0, 10),
            tab,
            views: 1,
            searches: 0,
            matches: 0,
          });
        }
      } catch {
        // A malformed beacon is not worth a response body.
      }
      res.writeHead(204).end();
      return;
    }

    // Everything else, including any attempt to read a file path, is a bare 404.
    return send(404, "");
  });

  server.listen(port, host, () => {
    console.log(`\n  Event Guide — ${manifest.eventTitle}`);
    console.log(`  Pack v${manifest.packVersion} · guide v${manifest.guideVersion} · seating ${manifest.seatingMode}`);
    console.log(`  Expires ${manifest.expiresAt}`);
    console.log(`\n  Guests open:  http://<this-machine-ip>:${port}/guide/${token}`);
    if (manifest.venueWifiName) {
      console.log(`  Wi-Fi:        ${manifest.venueWifiName} (this address works on that network only)`);
    }
    console.log(`\n  Anonymous counters are written to sync-queue.json for upload afterwards.\n`);
  });
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
