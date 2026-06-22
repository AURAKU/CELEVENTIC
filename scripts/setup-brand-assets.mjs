/**
 * Generate Celeventic brand assets from the official source logo.
 *
 * Place your official logo file at:
 *   brand-source/celeventic-official.png
 *
 * Run: npm run brand:assets
 */
import sharp from "sharp";
import { mkdir, copyFile, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourcePath = path.join(root, "brand-source", "celeventic-official.png");
const publicBrand = path.join(root, "public", "brand");
const appDir = path.join(root, "src", "app");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeIcon(buffer, size, outPath, pad = 0.08) {
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? size;
  const h = meta.height ?? size;
  const inner = Math.round(size * (1 - pad * 2));
  const resized = await sharp(buffer)
    .resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .png()
    .toFile(outPath);
}

async function generatePlaceholderBuffer() {
  const BRAND_DARK = "#0B8A83";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="96" fill="${BRAND_DARK}"/>
    <text x="256" y="340" font-family="Georgia,serif" font-size="280" font-weight="700" fill="#FFFFFF" text-anchor="middle">C</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function generatePlaceholderFull() {
  const BRAND_DARK = "#0B8A83";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="200" viewBox="0 0 560 200">
    <rect width="560" height="200" rx="24" fill="#FFFFFF"/>
    <circle cx="88" cy="100" r="64" fill="${BRAND_DARK}"/>
    <text x="88" y="118" font-family="Georgia,serif" font-size="72" font-weight="700" fill="#FFFFFF" text-anchor="middle">C</text>
    <text x="180" y="118" font-family="Georgia,serif" font-size="52" font-weight="700" fill="#0F172A">Celeventic</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  await mkdir(publicBrand, { recursive: true });
  await mkdir(appDir, { recursive: true });

  let markBuffer;

  if (!(await exists(sourcePath))) {
    console.warn(
      "\nNo brand-source/celeventic-official.png — generating placeholder brand assets.\n" +
        "Replace with your official logo and run: npm run brand:assets\n"
    );
    markBuffer = await generatePlaceholderBuffer();
    const fullBuffer = await generatePlaceholderFull();
    await sharp(fullBuffer).png({ compressionLevel: 9 }).toFile(path.join(publicBrand, "logo-full.png"));
    await sharp(markBuffer)
      .resize({ width: 512, height: 512, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicBrand, "logo-mark.png"));
  } else {
    const source = sharp(sourcePath);
    const meta = await source.metadata();
    const fullW = meta.width ?? 800;
    const fullH = meta.height ?? 1000;

    await source
      .clone()
      .resize({ width: 560, withoutEnlargement: false })
      .png({ compressionLevel: 9 })
      .toFile(path.join(publicBrand, "logo-full.png"));

    const markHeight = Math.round(fullH * 0.58);
    markBuffer = await sharp(sourcePath)
      .extract({ left: 0, top: 0, width: fullW, height: Math.min(markHeight, fullH) })
      .png()
      .toBuffer();

    await sharp(markBuffer)
      .resize({ width: 512, height: 512, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicBrand, "logo-mark.png"));
  }

  const icon512 = path.join(publicBrand, "icon.png");
  await writeIcon(markBuffer, 512, icon512);
  await writeIcon(markBuffer, 180, path.join(publicBrand, "apple-icon.png"));
  await writeIcon(markBuffer, 32, path.join(publicBrand, "favicon.png"));

  await copyFile(icon512, path.join(appDir, "icon.png"));
  await copyFile(path.join(publicBrand, "apple-icon.png"), path.join(appDir, "apple-icon.png"));

  console.log("Brand assets generated:");
  console.log("  public/brand/logo-full.png");
  console.log("  public/brand/logo-mark.png");
  console.log("  public/brand/icon.png (512)");
  console.log("  public/brand/apple-icon.png (180)");
  console.log("  public/brand/favicon.png (32)");
  console.log("  src/app/icon.png");
  console.log("  src/app/apple-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
