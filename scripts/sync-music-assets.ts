/**
 * Bundle template music locally (Mixkit blocks automated downloads).
 * Uses SoundHelix royalty-free samples — run: npm run music:sync
 */
import fs from "fs";
import path from "path";
import https from "https";

const OUT_DIR = path.join(process.cwd(), "public", "music");

/** Catalog track id → downloadable source (SoundHelix examples, CC-friendly). */
export const CATALOG_ASSET_SOURCES: Record<string, { file: string; url: string }> = {
  "luxury-piano-romance": { file: "luxury-piano-romance.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  "piano-garden": { file: "piano-garden.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  "piano-elegance": { file: "piano-elegance.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  "violin-elegance": { file: "violin-elegance.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  "strings-garden": { file: "strings-garden.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  "strings-crystal": { file: "strings-crystal.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
  "orchestra-royal": { file: "orchestra-royal.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
  "jazz-soft-lounge": { file: "jazz-soft-lounge.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
  "jazz-midnight": { file: "jazz-midnight.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
  "acoustic-warm": { file: "acoustic-warm.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
  "party-edm-energy": { file: "party-edm-energy.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
  "happy-celebration": { file: "happy-celebration.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" },
  "african-drums-celebration": { file: "african-drums-celebration.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
  "corporate-summit": { file: "corporate-summit.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" },
  "ambient-cinematic": { file: "ambient-cinematic.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3" },
  "travel-wanderlust": { file: "travel-wanderlust.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
  "memorial-piano": { file: "memorial-piano.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  "memorial-violin": { file: "memorial-violin.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  "islamic-soft-instrumental": { file: "islamic-soft-instrumental.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  "nature-forest": { file: "nature-forest.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
  "nature-ocean": { file: "nature-ocean.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
  "wedding-romantic": { file: "wedding-romantic.mp3", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
};

function download(url: string, dest: string, attempt = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          download(res.headers.location, dest, attempt).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        if (attempt < 4) {
          setTimeout(() => download(url, dest, attempt + 1).then(resolve).catch(reject), attempt * 1500);
          return;
        }
        reject(err);
      });
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const seen = new Set<string>();
  let ok = 0;

  for (const [trackId, { file, url }] of Object.entries(CATALOG_ASSET_SOURCES)) {
    const dest = path.join(OUT_DIR, file);
    if (seen.has(file)) {
      if (fs.existsSync(dest)) {
        console.log(`link ${trackId} → ${file} (shared)`);
        ok++;
        continue;
      }
    }
    seen.add(file);

    if (fs.existsSync(dest) && fs.statSync(dest).size > 100_000) {
      console.log(`skip ${file}`);
      ok++;
      continue;
    }

    process.stdout.write(`${trackId} → ${file}… `);
    await download(url, dest);
    console.log(`${Math.round(fs.statSync(dest).size / 1024)} KB`);
    ok++;
  }

  console.log(`Synced ${ok} template music files → public/music/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
