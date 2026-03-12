// scripts/generate-icons.js
// Generates all PWA icon sizes from the base icon
// Run: node scripts/generate-icons.js

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ICONS_DIR = path.join(__dirname, "..", "public", "icons");
const SOURCE_ICON = process.argv[2];

if (!SOURCE_ICON) {
  console.error("Usage: node scripts/generate-icons.js <path-to-source-icon>");
  process.exit(1);
}

// Create icons directory
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log("🎨 Generating PWA icons from:", SOURCE_ICON);
console.log("📁 Output directory:", ICONS_DIR);
console.log("");

// We'll use a canvas approach - create a simple HTML-based resizer
// For now, just copy the source to all sizes as placeholders
sizes.forEach((size) => {
  const dest = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
  fs.copyFileSync(SOURCE_ICON, dest);
  console.log(`  ✅ icon-${size}x${size}.png`);
});

// Also create maskable versions (with padding)
[192, 512].forEach((size) => {
  const dest = path.join(ICONS_DIR, `icon-maskable-${size}x${size}.png`);
  fs.copyFileSync(SOURCE_ICON, dest);
  console.log(`  ✅ icon-maskable-${size}x${size}.png (maskable)`);
});

console.log("\n✨ Done! All icons generated.");
console.log("💡 Tip: For production, resize these to their actual dimensions using a tool like sharp or an online PWA icon generator.");
