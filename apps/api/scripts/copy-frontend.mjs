import { cpSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const webDist = join(root, '..', 'web', 'dist');
const publicDir = join(root, 'public');

if (!existsSync(webDist)) {
  console.warn('[copy-frontend] Pasta web/dist não encontrada. Rode pnpm build na raiz ou build do frontend antes.');
  mkdirSync(publicDir, { recursive: true });
  process.exit(0);
}

mkdirSync(publicDir, { recursive: true });
cpSync(webDist, publicDir, { recursive: true });
console.log('[copy-frontend] Frontend copiado para apps/api/public');
