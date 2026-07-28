/**
 * Generates the PWA icon set for artifacts/kodetalent from a single source mark.
 *
 * Run: node scripts/generate-icons.mjs
 *
 * The mark is the KodeTalent lightning bolt in brand indigo. Three different
 * compositions are needed because each platform masks icons differently:
 *
 *   pwa-192 / pwa-512     rounded-rect background, drawn by us. Used where the
 *                         platform shows the icon as-authored.
 *   pwa-maskable-512      full-bleed square with the bolt shrunk into the
 *                         centre. Android crops maskable icons to a shape of
 *                         its choosing (circle, squircle, teardrop) and only
 *                         guarantees the middle 80% survives, so the bolt has
 *                         to clear that margin or it gets its tips sliced off.
 *   apple-touch-icon      full-bleed square, square corners, no alpha. iOS
 *                         applies its own squircle mask and renders any
 *                         transparency as black.
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "artifacts/kodetalent/public");

/** Brand indigo — must stay in sync with --color-brand in src/index.css. */
const BRAND = "#4A55C7";

/** The bolt, in the original 180x180 authoring space. */
const BOLT = "M101 28 L52 102 H92 L80 152 L132 76 H92 L101 28 Z";
/** Bounding box of BOLT in that space: x 52..132, y 28..152 -> centre (92, 90). */
const BOLT_CENTRE = { x: 92, y: 90 };
const BOLT_HEIGHT = 124;

/** Standard icon: rounded-rect background, bolt at authored scale. */
function standardSvg(size) {
  const radius = (40 / 180) * size;
  return `<svg width="${size}" height="${size}" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" rx="${(radius / size) * 180}" fill="${BRAND}"/>
  <path d="${BOLT}" fill="#FFFFFF"/>
</svg>`;
}

/**
 * Maskable icon: flat square, bolt scaled so its full diagonal sits inside the
 * 80%-diameter safe circle. Targeting 58% of the canvas height leaves the
 * diagonal at ~69% — comfortably clear of the 80% guarantee even on the most
 * aggressive circular mask.
 */
function maskableSvg(size) {
  const targetHeight = size * 0.58;
  const scale = targetHeight / BOLT_HEIGHT;
  const half = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${BRAND}"/>
  <g transform="translate(${half} ${half}) scale(${scale}) translate(${-BOLT_CENTRE.x} ${-BOLT_CENTRE.y})">
    <path d="${BOLT}" fill="#FFFFFF"/>
  </g>
</svg>`;
}

/** Apple touch icon: square corners (iOS masks), bolt at authored scale. */
function appleSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" fill="${BRAND}"/>
  <path d="${BOLT}" fill="#FFFFFF"/>
</svg>`;
}

const targets = [
  // Transparent corners are kept here on purpose — flattening them onto the
  // brand colour would silently square off the rounded rect we just drew.
  { file: "pwa-192x192.png", svg: standardSvg(192), size: 192, flatten: false },
  { file: "pwa-512x512.png", svg: standardSvg(512), size: 512, flatten: false },
  // Opaque by construction (full-bleed rect), so nothing to flatten.
  { file: "pwa-maskable-512x512.png", svg: maskableSvg(512), size: 512, flatten: false },
  // iOS renders any alpha channel as black, so this one must be flattened.
  { file: "apple-touch-icon.png", svg: appleSvg(180), size: 180, flatten: true },
];

for (const { file, svg, size, flatten } of targets) {
  const out = path.join(outDir, file);
  let pipeline = sharp(Buffer.from(svg)).resize(size, size);
  if (flatten) pipeline = pipeline.flatten({ background: BRAND });
  await pipeline.png().toFile(out);
  console.log(`wrote ${path.relative(root, out)} (${size}x${size})`);
}
