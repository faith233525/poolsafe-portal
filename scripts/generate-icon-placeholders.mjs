// Node.js script to generate simple PNG placeholders for PWA icons
// Run with: node scripts/generate-icon-placeholders.mjs

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsPath = join(__dirname, '../frontend/public/assets');

// Sizes needed for manifest.json
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const additionalSizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 }
];

// Shortcut icons and screenshots referenced in manifest.json
const extraAssets = [
  // Shortcuts
  { name: 'shortcut-ticket.png' },
  { name: 'shortcut-dashboard.png' },
  { name: 'shortcut-map.png' },
  // Screenshots
  { name: 'screenshot-desktop.png' },
  { name: 'screenshot-mobile.png' }
];

// Simple PNG header (1x1 transparent pixel)
function createMinimalPNG(size) {
  // This creates a minimal valid PNG file (1x1 transparent)
  // In production, replace with actual converted icons from SVG
  const header = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);
  return header;
}

console.log('Generating PNG placeholder icons for PWA...\n');

// Generate icon files
sizes.forEach(size => {
  const filename = `icon-${size}x${size}.png`;
  const filepath = join(assetsPath, filename);
  
  try {
    writeFileSync(filepath, createMinimalPNG(size));
    console.log(`✓ Created ${filename}`);
  } catch (error) {
    console.error(`✗ Failed to create ${filename}:`, error.message);
  }
});

// Generate additional icons
additionalSizes.forEach(({ name, size }) => {
  const filepath = join(assetsPath, name);
  
  try {
    writeFileSync(filepath, createMinimalPNG(size));
    console.log(`✓ Created ${name}`);
  } catch (error) {
    console.error(`✗ Failed to create ${name}:`, error.message);
  }
});

console.log('\n✅ Placeholder PNG icons generated!');
console.log('\n⚠️  NOTE: These are 1x1 transparent placeholders.');
console.log('For production, replace with actual icons using:');
console.log('  - ImageMagick: .\\scripts\\convert-icons.ps1');
console.log('  - Online tool: https://cloudconvert.com/svg-to-png');
console.log('\nThe placeholders allow PWA installation to work while you prepare final assets.\n');

// Generate placeholders for manifest shortcut icons and screenshots
console.log('Generating additional placeholders for shortcuts and screenshots...');
extraAssets.forEach(({ name }) => {
  const filepath = join(assetsPath, name);
  try {
    writeFileSync(filepath, createMinimalPNG(1));
    console.log(`✓ Created ${name}`);
  } catch (error) {
    console.error(`✗ Failed to create ${name}:`, error.message);
  }
});

console.log('\n✅ All PWA asset placeholders are in place.');
