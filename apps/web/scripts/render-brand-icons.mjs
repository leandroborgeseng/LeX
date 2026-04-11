/**
 * Gera PNGs a partir do logótipo em `lex-logo.png` (LeX + swoosh).
 * Espera fundo branco (ou quase) no master — remove para transparência antes dos redimensionamentos.
 * Executar: pnpm icons (a partir de apps/web)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const SOURCE = 'lex-logo.png';

/** Pixels com R,G,B todos acima disto viram transparentes (fundo branco / anti-alias claro). */
const WHITE_CUTOFF = 248;

/**
 * Lê o master, torna o fundo branco transparente e grava de volta `lex-logo.png` (PNG RGBA).
 */
async function normalizeMasterToTransparentPng() {
  const input = path.join(pub, SOURCE);
  if (!fs.existsSync(input)) {
    throw new Error(`Falta ${SOURCE} em public/ — coloque o PNG/JPEG oficial da marca.`);
  }
  const buf = fs.readFileSync(input);
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= WHITE_CUTOFF && g >= WHITE_CUTOFF && b >= WHITE_CUTOFF) {
      data[i + 3] = 0;
    }
  }
  const outBuf = await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(input, outBuf);
  console.log('normalized', SOURCE, '→ PNG com fundo transparente');
}

async function containPng(outW, outH, outName, pad = 0.08) {
  const buf = fs.readFileSync(path.join(pub, SOURCE));
  const meta = await sharp(buf).metadata();
  const iw = meta.width ?? 1;
  const ih = meta.height ?? 1;
  const innerW = Math.round(outW * (1 - 2 * pad));
  const innerH = Math.round(outH * (1 - 2 * pad));
  const scale = Math.min(innerW / iw, innerH / ih);
  const rw = Math.max(1, Math.round(iw * scale));
  const rh = Math.max(1, Math.round(ih * scale));
  const resized = await sharp(buf).resize(rw, rh).png().toBuffer();
  const left = Math.round((outW - rw) / 2);
  const top = Math.round((outH - rh) / 2);
  const out = path.join(pub, outName);
  await sharp({
    create: {
      width: outW,
      height: outH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(out);
  console.log('wrote', outName);
}

await normalizeMasterToTransparentPng();
await containPng(1024, 512, 'logo.png', 0.06);
await containPng(512, 512, 'icon.png', 0.08);
await containPng(32, 32, 'favicon.png', 0.06);
await containPng(180, 180, 'apple-touch-icon.png', 0.08);
