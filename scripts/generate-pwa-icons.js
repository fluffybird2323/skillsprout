/**
 * Generate PWA Icons Script
 *
 * This script generates placeholder PWA icons using SVG.
 * For production, replace these with your actual app logo.
 *
 * Usage: node scripts/generate-pwa-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');

// SVG template for icon
const generateSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1A73E8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8AB4F8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#121317"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="url(#grad)"/>
  <text x="${size/2}" y="${size/2 + 20}" font-family="Arial, sans-serif" font-size="${size/8}" font-weight="bold" fill="white" text-anchor="middle">SS</text>
</svg>
`;

// Function to generate PNG from SVG (placeholder - just saves SVG for now)
const generateIcon = (size, filename) => {
  const svg = generateSVG(size);
  const filepath = path.join(publicDir, filename);

  // For now, save as SVG with PNG extension as placeholder
  // In production, use proper image conversion library
  fs.writeFileSync(filepath.replace('.png', '.svg'), svg);

  console.log(`✓ Generated ${filename.replace('.png', '.svg')} (${size}x${size})`);
  console.log(`  Note: This is an SVG placeholder. Convert to PNG for production.`);
};

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icon placeholders...\n');

// Generate icons
generateIcon(192, 'icon-192.png');
generateIcon(512, 'icon-512.png');

console.log('\n✨ Icon placeholders generated!');
console.log('\n📝 Next steps:');
console.log('1. Convert the SVG files to PNG using an image editor or online tool');
console.log('2. Or replace them with your own custom app icons');
console.log('3. See public/ICON_INSTRUCTIONS.md for detailed instructions\n');
