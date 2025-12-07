const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_ICON = path.join(__dirname, '..', 'public', 'pisscord-purple.png');
const ANDROID_RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

// Android icon sizes
const ICON_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Foreground sizes (for adaptive icons - need padding)
const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function generateIcons() {
  console.log('Generating Android icons from:', SOURCE_ICON);

  for (const [folder, size] of Object.entries(ICON_SIZES)) {
    const outputDir = path.join(ANDROID_RES, folder);

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate ic_launcher.png (standard icon)
    await sharp(SOURCE_ICON)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, 'ic_launcher.png'));
    console.log(`  Created ${folder}/ic_launcher.png (${size}x${size})`);

    // Generate ic_launcher_round.png (circular icon)
    // Create a circular mask
    const roundedCorners = Buffer.from(
      `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    );

    await sharp(SOURCE_ICON)
      .resize(size, size)
      .composite([{
        input: roundedCorners,
        blend: 'dest-in'
      }])
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_round.png'));
    console.log(`  Created ${folder}/ic_launcher_round.png (${size}x${size})`);
  }

  // Generate foreground icons (for adaptive icons)
  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const outputDir = path.join(ANDROID_RES, folder);

    // The foreground needs to be smaller within the canvas to account for safe zone
    // Safe zone is ~66% of the total size
    const iconSize = Math.round(size * 0.66);
    const padding = Math.round((size - iconSize) / 2);

    await sharp(SOURCE_ICON)
      .resize(iconSize, iconSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, 'ic_launcher_foreground.png'));
    console.log(`  Created ${folder}/ic_launcher_foreground.png (${size}x${size}, icon: ${iconSize}x${iconSize})`);
  }

  console.log('\nDone! Android icons generated successfully.');
}

generateIcons().catch(console.error);
