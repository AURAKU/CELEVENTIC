/**
 * Seed Celeventic Experience Engine audio library from bundled catalog tracks.
 * Run: npm run db:seed-music
 */
import { PrismaClient } from "@prisma/client";
import { AUDIO_EXPERIENCE_CATALOG } from "../src/lib/music/audio-experience-catalog";

const prisma = new PrismaClient();

async function main() {
  let order = 0;
  for (const track of AUDIO_EXPERIENCE_CATALOG) {
    order += 1;
    const existing = await prisma.invitationMusicTrack.findFirst({
      where: { title: track.title, category: track.category },
    });
    const data = {
      title: track.title,
      artist: "Celeventic Library",
      category: track.category,
      url: track.url,
      durationSec: track.durationSec ?? 120,
      isActive: true,
      sortOrder: order,
      isPremium: false,
    };
    if (existing) {
      await prisma.invitationMusicTrack.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.invitationMusicTrack.create({ data });
    }
  }
  console.log(`Seeded ${AUDIO_EXPERIENCE_CATALOG.length} audio library tracks from bundled catalog.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
