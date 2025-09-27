#!/usr/bin/env node

// Favicon and icon generator for Pool Safe Inc Portal
// This script creates placeholder icons in various sizes for PWA and branding

const fs = require("fs");
const path = require("path");

// Create assets directory
const assetsDir = path.join(__dirname, "../public/assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Icon sizes needed for PWA and various platforms
const iconSizes = [
  { size: 16, name: "favicon-16x16.png" },
  { size: 32, name: "favicon-32x32.png" },
  { size: 72, name: "icon-72x72.png" },
  { size: 96, name: "icon-96x96.png" },
  { size: 128, name: "icon-128x128.png" },
  { size: 144, name: "icon-144x144.png" },
  { size: 152, name: "icon-152x152.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 192, name: "icon-192x192.png" },
  { size: 384, name: "icon-384x384.png" },
  { size: 512, name: "icon-512x512.png" },
];

// Generate SVG template for Pool Safe Inc
function generateSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="poolGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0066cc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#004499;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="url(#poolGradient)" stroke="#ffffff" stroke-width="2"/>
  
  <!-- Pool water representation -->
  <ellipse cx="${size / 2}" cy="${size / 2 + size * 0.1}" rx="${size * 0.35}" ry="${size * 0.25}" fill="#66b3ff" opacity="0.8"/>
  
  <!-- Pool Safe text (for larger sizes) -->
  ${
    size >= 72
      ? `
  <text x="${size / 2}" y="${size / 2 - size * 0.1}" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="${size * 0.12}" font-weight="bold" fill="white">POOL</text>
  <text x="${size / 2}" y="${size / 2 + size * 0.05}" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="${size * 0.12}" font-weight="bold" fill="white">SAFE</text>
  `
      : `
  <text x="${size / 2}" y="${size / 2 + size * 0.08}" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="${size * 0.2}" font-weight="bold" fill="white">P</text>
  `
  }
  
  <!-- Safety ring accent -->
  <circle cx="${size * 0.75}" cy="${size * 0.25}" r="${size * 0.08}" fill="none" stroke="#ffffff" stroke-width="${Math.max(1, size * 0.02)}"/>
  <circle cx="${size * 0.75}" cy="${size * 0.25}" r="${size * 0.05}" fill="none" stroke="#ff6b6b" stroke-width="${Math.max(1, size * 0.015)}"/>
</svg>`;
}

// Create ICO file header (simplified)
function createICOFile() {
  const icoPath = path.join(__dirname, "../public/favicon.ico");
  const svgContent = generateSVG(32);

  // For now, create a simple SVG file as favicon.ico
  // In production, you'd want to use a proper ICO conversion tool
  fs.writeFileSync(icoPath.replace(".ico", ".svg"), svgContent);

  console.log("Created favicon.svg (rename to favicon.ico or convert using online tool)");
}

// Generate all icon files
function generateIcons() {
  console.log("Generating Pool Safe Inc branding assets...\n");

  iconSizes.forEach(({ size, name }) => {
    const svgContent = generateSVG(size);
    const filePath = path.join(assetsDir, name.replace(".png", ".svg"));

    fs.writeFileSync(filePath, svgContent);
    console.log(`Created: ${name} (${size}x${size}) - SVG format`);
  });

  // Create favicon
  createICOFile();

  // Create additional assets
  createSocialMediaAssets();
  createBrandingAssets();

  console.log("\n✅ All branding assets created!");
  console.log("\n📋 Next steps:");
  console.log("1. Convert SVG files to PNG format using online tools or design software");
  console.log("2. Replace placeholder designs with actual Pool Safe Inc branding");
  console.log("3. Optimize images for web (consider using tools like TinyPNG)");
  console.log("4. Test icons across different devices and platforms");
}

// Create social media sharing images
function createSocialMediaAssets() {
  const socialSizes = [
    { width: 1200, height: 630, name: "social-share-facebook.svg" },
    { width: 1200, height: 600, name: "social-share-twitter.svg" },
    { width: 1200, height: 630, name: "social-share-linkedin.svg" },
  ];

  socialSizes.forEach(({ width, height, name }) => {
    const socialSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0066cc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#004499;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  
  <!-- Logo area -->
  <circle cx="200" cy="${height / 2}" r="80" fill="#ffffff" opacity="0.9"/>
  <text x="200" y="${height / 2 - 10}" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="28" font-weight="bold" fill="#0066cc">POOL</text>
  <text x="200" y="${height / 2 + 20}" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="28" font-weight="bold" fill="#0066cc">SAFE</text>
  
  <!-- Title -->
  <text x="320" y="${height / 2 - 40}" font-family="Arial, sans-serif" 
        font-size="48" font-weight="bold" fill="white">Pool Safe Inc Portal</text>
  <text x="320" y="${height / 2 + 10}" font-family="Arial, sans-serif" 
        font-size="32" font-weight="normal" fill="#e6f3ff">Professional Pool Equipment Support</text>
  <text x="320" y="${height / 2 + 50}" font-family="Arial, sans-serif" 
        font-size="24" font-weight="normal" fill="#b3d9ff">Partner & Customer Management System</text>
</svg>`;

    const filePath = path.join(assetsDir, name);
    fs.writeFileSync(filePath, socialSVG);
    console.log(`Created: ${name} (${width}x${height}) - Social media asset`);
  });
}

// Create additional branding assets
function createBrandingAssets() {
  // App screenshots placeholder
  const screenshotSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="screenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1280" height="720" fill="url(#screenGradient)"/>
  
  <!-- Header -->
  <rect width="1280" height="80" fill="#0066cc"/>
  <text x="40" y="50" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">Pool Safe Inc Portal</text>
  
  <!-- Dashboard mockup -->
  <rect x="40" y="120" width="300" height="200" rx="8" fill="white" stroke="#dee2e6"/>
  <text x="60" y="150" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#495057">Dashboard</text>
  <rect x="60" y="160" width="260" height="4" fill="#0066cc"/>
  
  <rect x="360" y="120" width="300" height="200" rx="8" fill="white" stroke="#dee2e6"/>
  <text x="380" y="150" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#495057">Support Tickets</text>
  <rect x="380" y="160" width="260" height="4" fill="#28a745"/>
  
  <rect x="680" y="120" width="300" height="200" rx="8" fill="white" stroke="#dee2e6"/>
  <text x="700" y="150" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#495057">Partner Network</text>
  <rect x="700" y="160" width="260" height="4" fill="#ffc107"/>
  
  <!-- Footer -->
  <text x="640" y="680" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6c757d">
    Professional Pool Equipment Support &amp; Management
  </text>
</svg>`;

  const screenshotPath = path.join(assetsDir, "screenshot-desktop.svg");
  fs.writeFileSync(screenshotPath, screenshotSVG);
  console.log("Created: screenshot-desktop.svg - App screenshot mockup");

  // Mobile screenshot
  const mobileScreenshotSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="375" height="667" viewBox="0 0 375 667" xmlns="http://www.w3.org/2000/svg">
  <rect width="375" height="667" fill="#f8f9fa"/>
  <rect width="375" height="60" fill="#0066cc"/>
  <text x="187.5" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white">Pool Safe Portal</text>
  
  <!-- Mobile content mockup -->
  <rect x="20" y="80" width="335" height="120" rx="8" fill="white" stroke="#dee2e6"/>
  <text x="40" y="110" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#495057">Quick Actions</text>
  
  <rect x="20" y="220" width="335" height="200" rx="8" fill="white" stroke="#dee2e6"/>
  <text x="40" y="250" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#495057">Recent Activity</text>
  
  <text x="187.5" y="640" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6c757d">
    Pool Safe Inc Mobile Portal
  </text>
</svg>`;

  const mobileScreenshotPath = path.join(assetsDir, "screenshot-mobile.svg");
  fs.writeFileSync(mobileScreenshotPath, mobileScreenshotSVG);
  console.log("Created: screenshot-mobile.svg - Mobile app screenshot");

  // Shortcut icons
  const shortcuts = ["ticket", "dashboard", "map"];
  shortcuts.forEach((shortcut) => {
    const shortcutSVG = generateSVG(96);
    const filePath = path.join(assetsDir, `shortcut-${shortcut}.svg`);
    fs.writeFileSync(filePath, shortcutSVG);
    console.log(`Created: shortcut-${shortcut}.svg - PWA shortcut icon`);
  });
}

// Create robots.txt
function createRobotsTxt() {
  const robotsContent = `# Pool Safe Inc Portal - Robots.txt
User-agent: *
Allow: /

# Sitemaps
Sitemap: ${process.env.VITE_APP_URL || "https://portal.poolsafeinc.com"}/sitemap.xml

# Disallow sensitive areas
Disallow: /admin/
Disallow: /api/
Disallow: /uploads/
Disallow: /.well-known/
Disallow: /cypress/

# Allow crawling of public pages
Allow: /
Allow: /partners
Allow: /contact
Allow: /about

# Crawl delay (optional)
Crawl-delay: 1`;

  const robotsPath = path.join(__dirname, "../public/robots.txt");
  fs.writeFileSync(robotsPath, robotsContent);
  console.log("Created: robots.txt - Search engine crawler instructions");
}

// Create sitemap.xml
function createSitemap() {
  const baseUrl = process.env.VITE_APP_URL || "https://portal.poolsafeinc.com";
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/partners</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/dashboard</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/tickets</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  
</urlset>`;

  const sitemapPath = path.join(__dirname, "../public/sitemap.xml");
  fs.writeFileSync(sitemapPath, sitemapContent);
  console.log("Created: sitemap.xml - Search engine sitemap");
}

// Main execution
if (require.main === module) {
  generateIcons();
  createRobotsTxt();
  createSitemap();

  console.log("\n🎨 Branding assets generation complete!");
  console.log("\n⚡ Ready for the next step: Accessibility compliance implementation");
}

module.exports = {
  generateIcons,
  createRobotsTxt,
  createSitemap,
};
