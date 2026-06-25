/**
 * Seed Celeventic Experience Engine audio library samples.
 * Run: npx tsx scripts/seed-music-library.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LIBRARY_SAMPLES = [
  { title: "Violin Wedding Intro", category: "violin", url: "https://assets.mixkit.co/music/preview/mixkit-romantic-whispers-34.mp3", isPremium: false },
  { title: "Luxury Wedding Intro", category: "wedding", url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3", isPremium: true },
  { title: "Soft Piano Wedding", category: "piano", url: "https://assets.mixkit.co/music/preview/mixkit-piano-reflections-22.mp3", isPremium: false },
  { title: "Royal Orchestral Wedding", category: "strings", url: "https://assets.mixkit.co/music/preview/mixkit-silent-descent-ambient-442.mp3", isPremium: true },
  { title: "African Celebration Intro", category: "african", url: "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3", isPremium: false },
  { title: "Traditional Drums Intro", category: "traditional", url: "https://assets.mixkit.co/music/preview/mixkit-tribal-drums-443.mp3", isPremium: false },
  { title: "Funeral Solemn Piano", category: "funeral", url: "https://assets.mixkit.co/music/preview/mixkit-silent-descent-ambient-442.mp3", isPremium: false },
  { title: "Funeral Violin Tribute", category: "funeral", url: "https://assets.mixkit.co/music/preview/mixkit-romantic-whispers-34.mp3", isPremium: false },
  { title: "Gospel Memorial Intro", category: "gospel", url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3", isPremium: false },
  { title: "Birthday Celebration", category: "birthday", url: "https://assets.mixkit.co/music/preview/mixkit-happy-celebration-438.mp3", isPremium: false },
  { title: "Corporate Event Intro", category: "corporate", url: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3", isPremium: false },
  { title: "Concert Hype Intro", category: "celebration", url: "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3", isPremium: true },
  { title: "Romantic Ambient Intro", category: "instrumentals", url: "https://assets.mixkit.co/music/preview/mixkit-romantic-whispers-34.mp3", isPremium: false },
  { title: "Luxury Harp Intro", category: "strings", url: "https://assets.mixkit.co/music/preview/mixkit-piano-reflections-22.mp3", isPremium: true },
  { title: "Soft Choir Intro", category: "church", url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3", isPremium: false },
];

async function main() {
  let order = 0;
  for (const track of LIBRARY_SAMPLES) {
    order += 1;
    const existing = await prisma.invitationMusicTrack.findFirst({
      where: { title: track.title, category: track.category },
    });
    if (existing) {
      await prisma.invitationMusicTrack.update({
        where: { id: existing.id },
        data: { url: track.url, isActive: true, sortOrder: order } as Parameters<typeof prisma.invitationMusicTrack.update>[0]["data"],
      });
    } else {
      await prisma.invitationMusicTrack.create({
        data: {
          title: track.title,
          artist: "Celeventic Experience Engine",
          category: track.category,
          url: track.url,
          durationSec: 60,
          isActive: true,
          sortOrder: order,
        } as Parameters<typeof prisma.invitationMusicTrack.create>[0]["data"],
      });
    }
  }
  console.log(`Seeded ${LIBRARY_SAMPLES.length} audio library tracks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
