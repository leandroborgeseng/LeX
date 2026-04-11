/**
 * Gera PNGs a partir dos SVGs da marca (requer sharp).
 * Executar a partir de apps/web: node scripts/render-brand-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');

async function rasterize(svgName, width, height, outName) {
  const input = path.join(pub, svgName);
  const out = path.join(pub, outName);
  const buf = fs.readFileSync(input);
  await sharp(buf, { density: 300 }).resize(width, height).png().toFile(out);
  console.log('wrote', outName);
}

await rasterize('logo.svg', 1024, 512, 'logo.png');
await rasterize('icon.svg', 512, 512, 'icon.png');
await rasterize('icon.svg', 32, 32, 'favicon.png');
await rasterize('icon.svg', 180, 180, 'apple-touch-icon.png');
