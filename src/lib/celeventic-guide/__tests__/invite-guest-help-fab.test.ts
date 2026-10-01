import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("every live invitation portal path mounts the glass Guide chip", () => {
  const portal = readFileSync("src/components/guest-portal/guest-invitation-portal.tsx", "utf8");
  const cinematic = readFileSync("src/components/guest-portal/cinematic-invitation-spotlight.tsx", "utf8");
  const fab = readFileSync("src/components/celeventic-guide/guest-quick-actions.tsx", "utf8");
  const portalMounts = portal.split("<InviteGuestHelpFab").length - 1;
  assert.equal(portalMounts, 2);
  assert.match(portal, /PagedInvitationViewer[\s\S]*<InviteGuestHelpFab \/>/);
  assert.doesNotMatch(portal, /!props\.embedded && \(\s*<InviteGuestHelpFab/);
  assert.match(cinematic, /<InviteGuestHelpFab \/>/);
  assert.match(fab, /BRAND_LOGO_MARK/);
  assert.match(fab, /object-\[50%_18%\]/);
  assert.match(fab, /scale-\[1\.9\]/);
  assert.match(fab, /pointer-events-none fixed z-\[80\]/);
  assert.match(fab, /APP_NAME\} Guide — learn how to navigate the invitation/);
});
