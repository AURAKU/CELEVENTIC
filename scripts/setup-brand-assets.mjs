/**
 * Generate Celeventic brand assets from the official source logo.
 * Full logo is never cropped — icons use letterboxing with padding.
 *
 * Source: brand-source/celeventic-official.png
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

const PNG_OPTS = { compressionLevel: 6, quality: 100, effort: 10 };

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Fit entire logo inside a square canvas — no cropping */
async function writeContainedSquare(sourceBuffer, size, outPath, pad = 0.06) {
  const inner = Math.round(size * (1 - pad * 2));
  const resized = await sharp(sourceBuffer)
    .resize(inner, inner, { fit: "inside", withoutEnlargement: false })
    .png(PNG_OPTS)
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const rw = meta.width ?? inner;
  const rh = meta.height ?? inner;
  const left = Math.round((size - rw) / 2);
  const top = Math.round((size - rh) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png(PNG_OPTS)
    .toFile(outPath);
}

async function generatePlaceholderBuffer() {
  const BRAND_DARK = "#0B8A83";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
    <rect width="1536" height="1024" fill="#FFFFFF"/>
    <circle cx="768" cy="380" r="200" fill="${BRAND_DARK}"/>
    <text x="768" y="420" font-family="Georgia,serif" font-size="220" font-weight="700" fill="#FFFFFF" text-anchor="middle">C</text>
    <text x="768" y="680" font-family="Georgia,serif" font-size="120" font-weight="700" fill="#0F172A" text-anchor="middle">Celeventic</text>
    <text x="768" y="780" font-family="sans-serif" font-size="36" fill="#64748B" text-anchor="middle">CELEBRATE • EVENT • TICKET</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png(PNG_OPTS).toBuffer();
}

async function main() {
  await mkdir(publicBrand, { recursive: true });
  await mkdir(appDir, { recursive: true });

  let fullBuffer;

  if (!(await exists(sourcePath))) {
    console.warn(
      "\nNo brand-source/celeventic-official.png — generating placeholder brand assets.\n" +
        "Replace with your official logo and run: npm run brand:assets\n"
    );
    fullBuffer = await generatePlaceholderBuffer();
  } else {
    fullBuffer = await sharp(sourcePath).png(PNG_OPTS).toBuffer();
  }

  // High-res full logo for headers, footers, auth (width 900px, crisp on retina)
  await sharp(fullBuffer)
    .resize({ width: 900, withoutEnlargement: false })
    .png(PNG_OPTS)
    .toFile(path.join(publicBrand, "logo-full.png"));

  // Square variant — full logo contained, for sidebars / compact slots
  await writeContainedSquare(fullBuffer, 512, path.join(publicBrand, "logo-mark.png"), 0.05);

  // App / PWA icons — full logo visible, extra padding for maskable safe zone
  const icon512 = path.join(publicBrand, "icon.png");
  await writeContainedSquare(fullBuffer, 512, icon512, 0.06);
  await writeContainedSquare(fullBuffer, 512, path.join(publicBrand, "icon-maskable.png"), 0.14);
  await writeContainedSquare(fullBuffer, 192, path.join(publicBrand, "apple-icon.png"), 0.06);
  await writeContainedSquare(fullBuffer, 48, path.join(publicBrand, "favicon.png"), 0.04);
  await writeContainedSquare(fullBuffer, 1024, path.join(publicBrand, "social-icon.png"), 0.08);

  await copyFile(icon512, path.join(appDir, "icon.png"));
  await copyFile(path.join(publicBrand, "apple-icon.png"), path.join(appDir, "apple-icon.png"));

  const meta = await sharp(fullBuffer).metadata();
  console.log("Brand assets generated (source %dx%d):", meta.width, meta.height);
  console.log("  public/brand/logo-full.png (900w, full artwork)");
  console.log("  public/brand/logo-mark.png (512, contained full logo)");
  console.log("  public/brand/icon.png (512, full logo — no crop)");
  console.log("  public/brand/icon-maskable.png (512, safe-zone padding)");
  console.log("  public/brand/apple-icon.png (192)");
  console.log("  public/brand/favicon.png (48)");
  console.log("  public/brand/social-icon.png (1024)");
  console.log("  src/app/icon.png");
  console.log("  src/app/apple-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
