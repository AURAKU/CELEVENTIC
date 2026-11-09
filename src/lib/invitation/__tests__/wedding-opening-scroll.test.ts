import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const opening = readFileSync(
  "src/components/invitation/templates/forever-afaris-wedding-opening.tsx",
  "utf8"
);
const board = readFileSync(
  "src/components/invitation/templates/forever-afaris-wedding.tsx",
  "utf8"
);
const lock = readFileSync("src/lib/experience-engine/invitation-scroll-lock.ts", "utf8");
const pagedCss = readFileSync("src/components/invitation-pages/invitation-pages.css", "utf8");
const shell = readFileSync("src/components/invitation/invite-viewport-shell.tsx", "utf8");
const cinematic = readFileSync(
  "src/components/guest-portal/cinematic-invitation-spotlight.tsx",
  "utf8"
);
const wrapper = readFileSync("src/components/invitation-os/premium-invite-wrapper.tsx", "utf8");

test("the wedding opening releases the page so guests can scroll", () => {
  assert.doesNotMatch(opening, /const OPEN_RELEASE_MS/);
  assert.match(opening, /pointerEvents = "none"/);
  assert.match(opening, /finish\(\);/);
  assert.match(opening, /transition=\{\{ duration: 0 \}\}/);
  assert.match(opening, /stage === "sealed" \|\| stage === "done"/);
  assert.doesNotMatch(opening, /after\(GATE_REVEAL_AT_MS/);
  assert.doesNotMatch(opening, /after\(prefersReduced \? 40 : 280, onComplete\)/);
});

test("the opened wedding board does not pulse or trap the first swipe", () => {
  assert.doesNotMatch(board, /useScroll/);
  assert.doesNotMatch(board, /hidden: \{ opacity: 0, y:/);
  assert.match(board, /pointer-events-none absolute inset-0/);
  assert.match(lock, /Never set touch-action:none/);
  assert.match(lock, /armLiveInvitationScroller/);
});

test("every live template board is armed as a pan-y scroller after open", () => {
  assert.match(lock, /LIVE_INVITE_SCROLLER_SELECTOR/);
  assert.match(lock, /\[data-inv-scroller\]/);
  assert.match(lock, /Applies to every template/);
  assert.match(shell, /data-inv-scroller=\{liveScrollable \? "" : undefined\}/);
  assert.match(cinematic, /data-inv-scroller=""/);
  assert.match(wrapper, /armLiveInvitationScroller\(\)/);
  assert.match(pagedCss, /container-name: inv-paged;/);
  const pagedScrollBlock = pagedCss.match(/\.inv-paged-scroll \{[^}]+\}/);
  assert.ok(pagedScrollBlock);
  assert.doesNotMatch(pagedScrollBlock[0], /container-type/);
});

test("blush-gate tap-to-begin does not mount a second sealed envelope", () => {
  const contract = readFileSync("src/lib/experience/live-envelope-contract.ts", "utf8");
  assert.match(contract, /tapBeginUnlocksBoard\(openingExperience\)/);
  assert.match(contract, /id === "blush-gate"/);
});
