# PWA Icon Conversion Instructions

## Quick Fix: Online Converter (Fastest - 5 minutes)

Since ImageMagick may not be installed, use this online tool:

1. Visit: https://cloudconvert.com/svg-to-png
2. Upload: `frontend/public/assets/loungenie-logo.svg`
3. Convert to PNG at these sizes (do 8 conversions):
   - 72x72, 96x96, 128x128, 144x144
   - 152x152, 192x192, 384x384, 512x512
4. Rename downloaded files to match manifest.json:
   - `icon-72x72.png`, `icon-96x96.png`, etc.
5. Save to: `frontend/public/assets/`

## Additional Required Icons

Also convert for favicons and Apple touch icon:
- **favicon-16x16.png** (16x16)
- **favicon-32x32.png** (32x32)  
- **apple-touch-icon.png** (180x180)

## Option 2: Automated Script (If ImageMagick installed)

### Windows (PowerShell):
```powershell
.\scripts\convert-icons.ps1
```

### Linux/Mac (Bash):
```bash
chmod +x scripts/convert-icons.sh
./scripts/convert-icons.sh
```

### Install ImageMagick (if needed):
- **Windows:** `winget install ImageMagick.ImageMagick`
- **Mac:** `brew install imagemagick`
- **Linux:** `sudo apt-get install imagemagick`

## Verification

After conversion, check that these files exist:
```
frontend/public/assets/
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
├── icon-512x512.png
├── favicon-16x16.png
├── favicon-32x32.png
└── apple-touch-icon.png
```

All files should be PNG format and have transparent backgrounds.

## Why This Matters

PWA manifest.json requires PNG icons for:
- ✅ Mobile app installation
- ✅ App store submissions
- ✅ Home screen icons
- ✅ Splash screens

SVG icons are NOT supported by most browsers for PWA installation.
