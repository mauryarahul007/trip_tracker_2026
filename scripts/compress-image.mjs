import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPath = join(__dirname, '..', 'src', 'assets', 'travel-bg.jpg');
const outputPath = join(__dirname, '..', 'src', 'assets', 'travel-bg.jpg');

async function compress() {
  const stats = readFileSync(inputPath);
  console.log(`Original size: ${(stats.length / 1024).toFixed(1)} KB`);

  const buffer = await sharp(inputPath)
    .resize(1200, null, { withoutEnlargement: true })
    .jpeg({ quality: 70, progressive: true, mozjpeg: true })
    .toBuffer();

  writeFileSync(outputPath, buffer);
  console.log(`Compressed size: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log(`Savings: ${((1 - buffer.length / stats.length) * 100).toFixed(1)}%`);
}

compress().catch((err) => {
  console.error('Compression failed:', err);
  process.exit(1);
});
