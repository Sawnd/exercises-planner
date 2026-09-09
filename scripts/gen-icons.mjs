// Génère les PNG d'icônes à partir des SVG sources.
// Usage ponctuel : `npm run gen-icons` (nécessite `npm i -D sharp`).
// Les PNG produits sont commités ; sharp n'est pas requis au build.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url));
const base = readFileSync(dir + 'icon.svg');
const maskable = readFileSync(dir + 'icon-maskable.svg');

const jobs = [
  [base, 192, 'icon-192.png'],
  [base, 512, 'icon-512.png'],
  [base, 180, 'apple-touch-icon.png'],
  [maskable, 512, 'icon-maskable-512.png'],
];

for (const [svg, size, name] of jobs) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(dir + name);
  console.log('écrit', name);
}
