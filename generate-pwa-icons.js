import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Master SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <rect x="20" y="20" width="472" height="472" rx="76" fill="none" stroke="#f59e0b" stroke-width="12" stroke-dasharray="16 8"/>
  <circle cx="256" cy="256" r="180" fill="#1e293b" stroke="#334155" stroke-width="8"/>
  
  {/* Heavy equipment icon */}
  <path d="M140 330 h232 l24 -60 h-280 z" fill="#f59e0b" stroke="#d97706" stroke-width="6"/>
  <path d="M180 270 h152 l16 -40 h-184 z" fill="#38bdf8"/>
  <circle cx="180" cy="340" r="26" fill="#020617" stroke="#f59e0b" stroke-width="8"/>
  <circle cx="332" cy="340" r="26" fill="#020617" stroke="#f59e0b" stroke-width="8"/>
  
  <text x="256" y="170" font-family="Arial, sans-serif" font-weight="900" font-size="64" fill="#f59e0b" text-anchor="middle">RBS APPS</text>
  <text x="256" y="210" font-family="Arial, sans-serif" font-weight="700" font-size="24" fill="#94a3b8" text-anchor="middle">HEAVY EQUIPMENT</text>
</svg>`;

const svgBuffer = Buffer.from(svgContent);

async function generateIcons() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');
  console.log('Written public/icon.svg');

  // pwa-192x192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // pwa-512x512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // pwa-maskable-512x512.png (with safe zone padding)
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" fill="#0f172a"/>
    <g transform="translate(51, 51) scale(0.8)">
      ${svgContent.replace(/<svg[^>]*>|<\/svg>/g, '')}
    </g>
  </svg>`;
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Created pwa-maskable-512x512.png');

  // apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // favicon.ico / favicon.png (64x64)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Created favicon.ico');
}

generateIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
