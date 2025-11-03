#!/bin/bash
# Script to convert SVG icons to PNG for PWA manifest compliance
# Requires ImageMagick or Inkscape installed

# Navigate to assets directory
cd "$(dirname "$0")/../frontend/public/assets"

echo "Converting SVG icons to PNG for PWA..."

# Icon sizes needed for manifest.json
SIZES=(72 96 128 144 152 192 384 512)

for size in "${SIZES[@]}"; do
  echo "Generating icon-${size}x${size}.png..."
  
  # Using ImageMagick (if available)
  if command -v convert &> /dev/null; then
    convert -background none -resize ${size}x${size} \
      "loungenie-logo.svg" "icon-${size}x${size}.png"
  
  # Using Inkscape (if available)
  elif command -v inkscape &> /dev/null; then
    inkscape "loungenie-logo.svg" \
      --export-filename="icon-${size}x${size}.png" \
      --export-width=${size} --export-height=${size}
  
  else
    echo "ERROR: Neither ImageMagick nor Inkscape found."
    echo "Please install one of these tools or use an online converter:"
    echo "  - https://cloudconvert.com/svg-to-png"
    echo "  - https://svgtopng.com/"
    exit 1
  fi
done

# Generate favicon sizes
echo "Generating favicon-16x16.png..."
if command -v convert &> /dev/null; then
  convert -background none -resize 16x16 "loungenie-logo.svg" "favicon-16x16.png"
  convert -background none -resize 32x32 "loungenie-logo.svg" "favicon-32x32.png"
  convert -background none -resize 180x180 "loungenie-logo.svg" "apple-touch-icon.png"
elif command -v inkscape &> /dev/null; then
  inkscape "loungenie-logo.svg" --export-filename="favicon-16x16.png" --export-width=16 --export-height=16
  inkscape "loungenie-logo.svg" --export-filename="favicon-32x32.png" --export-width=32 --export-height=32
  inkscape "loungenie-logo.svg" --export-filename="apple-touch-icon.png" --export-width=180 --export-height=180
fi

echo "✓ PNG icon generation complete!"
echo ""
echo "Generated files:"
ls -lh icon-*.png favicon-*.png apple-touch-icon.png 2>/dev/null || echo "Check assets directory for PNG files"
