/**
 * Point the published Edwin & Lordina invitation at the current design.
 * The guest link stays as it is. /invite/edwin-and-lordina opens the same page.
 *
 *   npx tsx scripts/apply-edwin-live-design.ts
 *   npx tsx scripts/apply-edwin-live-design.ts --dry-run
 */
import { prisma } from "../src/lib/prisma";
import {
  applyEdwinPublishedDesign,
  isMissingEdwinInvitationError,
} from "../src/lib/invitation/edwin-published-design";
import {
  EDWIN_PUBLISHED_INVITE_LINK,
  inviteLinkIdentityKeys,
} from "../src/lib/invitation/public-invite-alias";

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index < 0) return null;
  return process.argv[index + 1]?.trim() || null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const uniqueLink = argValue("--link") || EDWIN_PUBLISHED_INVITE_LINK;
  if (dryRun) {
    const invitation = await prisma.invitation.findFirst({
      where: { uniqueLink: { in: inviteLinkIdentityKeys(uniqueLink) } },
      select: { uniqueLink: true, event: { select: { slug: true, title: true } } },
    });
    if (!invitation) {
      console.log(
        `No invitation with unique link ${uniqueLink}. Skip. Original Edwin restore is a separate approved step.`
      );
      return;
    }
    console.log(`dry-run ${invitation.uniqueLink} event=${invitation.event.slug} (${invitation.event.title})`);
    return;
  }
  try {
    const result = await applyEdwinPublishedDesign(uniqueLink);
    console.log(`updated ${result.uniqueLink} (${result.orders} orders) without changing the guest link`);
  } catch (error) {
    if (isMissingEdwinInvitationError(error)) {
      console.log(
        `${error instanceof Error ? error.message : error}. Skip. Original Edwin restore is a separate approved step.`
      );
      return;
    }
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
