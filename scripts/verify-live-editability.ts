/**
 * End-to-end proof that a published invitation stays editable.
 *
 * Picks a live order, mutates it through the same service the Studio calls,
 * asserts the change landed on the records the guest page reads, then restores
 * the original values. Nothing is left behind.
 *
 * Run: npx tsx scripts/verify-live-editability.ts [orderId]
 */
import { prisma } from "../src/lib/prisma";
import { invitationOrderService } from "../src/services/invitations/invitation-order.service";

const results: { name: string; ok: boolean; detail: string }[] = [];

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const orderId = process.argv[2];
  const order = orderId
    ? await prisma.invitationOrder.findUnique({ where: { id: orderId } })
    : await prisma.invitationOrder.findFirst({
        where: { NOT: { invitationId: null }, AND: { NOT: { eventId: null } } },
        orderBy: { createdAt: "desc" },
      });

  if (!order?.invitationId || !order.eventId) {
    console.log("No published invitation available to verify — skipping.");
    return;
  }

  console.log(`Verifying order ${order.id} (${order.templateSlug}, ${order.status})\n`);

  const snapshot = {
    venueName: order.venueName,
    galleryUrls: order.galleryUrls,
    designConfig: order.designConfig,
    event: await prisma.event.findUniqueOrThrow({ where: { id: order.eventId } }),
    media: await prisma.eventMedia.findMany({ where: { eventId: order.eventId } }),
    invitation: await prisma.invitation.findUniqueOrThrow({ where: { id: order.invitationId } }),
  };

  const probeVenue = `__live-edit-probe-${Date.now()}`;
  const probeImage = `/uploads/__live-edit-probe-${Date.now()}.jpg`;
  const baseGallery = Array.isArray(order.galleryUrls) ? (order.galleryUrls as string[]) : [];

  try {
    // 1. Text edit must reach the Event row the guest page renders from.
    await invitationOrderService.updateOrder(order.id, order.userId, { venueName: probeVenue });
    const afterText = await prisma.event.findUniqueOrThrow({ where: { id: order.eventId } });
    check("venue edit reaches live Event", afterText.venueName === probeVenue, afterText.venueName ?? "null");

    // 2. Adding an image must create the EventMedia row the guest gallery reads.
    await invitationOrderService.updateOrder(order.id, order.userId, {
      galleryUrls: [...baseGallery, probeImage],
    });
    const afterAdd = await prisma.eventMedia.findMany({
      where: { eventId: order.eventId },
      orderBy: { sortOrder: "asc" },
    });
    check(
      "added image reaches live gallery",
      afterAdd.some((m) => m.url === probeImage),
      `${afterAdd.length} media rows`
    );

    // 3. Removing it must delete the row again.
    await invitationOrderService.updateOrder(order.id, order.userId, { galleryUrls: baseGallery });
    const afterRemove = await prisma.eventMedia.findMany({ where: { eventId: order.eventId } });
    check(
      "deleted image disappears from live gallery",
      !afterRemove.some((m) => m.url === probeImage),
      `${afterRemove.length} media rows`
    );

    // 4. A design/CTA change must land on the Invitation snapshot.
    const baseDesign = (order.designConfig as Record<string, unknown>) ?? {};
    const baseExperience = (baseDesign.experience as Record<string, unknown>) ?? {};
    await invitationOrderService.updateOrder(order.id, order.userId, {
      designConfig: {
        ...baseDesign,
        experience: {
          ...baseExperience,
          experienceCustomized: true,
          outroExperience: "fireworks",
          buttonActions: { primary: "rsvp", secondary: "maps", tertiary: "none" },
        },
      },
    });
    const afterDesign = await prisma.invitation.findUniqueOrThrow({
      where: { id: order.invitationId },
    });
    const liveExperience =
      ((afterDesign.designConfig as Record<string, unknown>)?.experience as Record<string, unknown>) ??
      {};
    check(
      "outro + CTA mapping reach live Invitation",
      liveExperience.outroExperience === "fireworks" &&
        (liveExperience.buttonActions as Record<string, string>)?.secondary === "maps",
      JSON.stringify({
        outro: liveExperience.outroExperience,
        buttons: liveExperience.buttonActions,
      })
    );
  } finally {
    // Restore everything exactly as it was.
    await prisma.invitationOrder.update({
      where: { id: order.id },
      data: {
        venueName: snapshot.venueName,
        galleryUrls: snapshot.galleryUrls as never,
        designConfig: snapshot.designConfig as never,
      },
    });
    await prisma.event.update({
      where: { id: snapshot.event.id },
      data: {
        title: snapshot.event.title,
        description: snapshot.event.description,
        venueName: snapshot.event.venueName,
        landmark: snapshot.event.landmark,
        mapsLink: snapshot.event.mapsLink,
        dressCode: snapshot.event.dressCode,
        contactPhone: snapshot.event.contactPhone,
        coverImageUrl: snapshot.event.coverImageUrl,
        startDate: snapshot.event.startDate,
        hostName: snapshot.event.hostName,
      },
    });
    await prisma.eventMedia.deleteMany({ where: { eventId: snapshot.event.id } });
    if (snapshot.media.length > 0) {
      await prisma.eventMedia.createMany({
        data: snapshot.media.map((m) => ({
          id: m.id,
          eventId: m.eventId,
          url: m.url,
          type: m.type,
          caption: m.caption,
          sortOrder: m.sortOrder,
          createdAt: m.createdAt,
        })),
      });
    }
    await prisma.invitation.update({
      where: { id: snapshot.invitation.id },
      data: {
        name: snapshot.invitation.name,
        message: snapshot.invitation.message,
        designConfig: snapshot.invitation.designConfig as never,
      },
    });
    console.log("\nOriginal order / event / media / invitation state restored.");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
