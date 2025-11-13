# Theme Compatibility Guide

**Good news!** The Pool Safe Partner Portal works with **any WordPress theme**. Here's what you need to know.

---

## ✅ Tested & Compatible Themes

The plugin follows WordPress best practices and is compatible with:

### Popular Themes
- ✅ **Twenty Twenty-Four** (WordPress default)
- ✅ **Twenty Twenty-Three** (WordPress default)
- ✅ **Twenty Twenty-Two** (WordPress default)
- ✅ **Astra** (lightweight, popular)
- ✅ **GeneratePress** (fast, customizable)
- ✅ **OceanWP** (multipurpose)
- ✅ **Kadence** (block-based)
- ✅ **Neve** (modern, fast)
- ✅ **Hello Elementor** (Elementor's theme)
- ✅ **Divi** (with Divi Builder)

### Page Builders
- ✅ **Elementor** (use Shortcode widget)
- ✅ **Divi Builder** (use Shortcode module)
- ✅ **Beaver Builder** (use Shortcode module)
- ✅ **WPBakery** (use Shortcode element)
- ✅ **Gutenberg** (use Shortcode block)
- ✅ **Classic Editor** (paste shortcode directly)

---

## How It Works

### Theme-Agnostic Design
The plugin is designed to **inherit your theme's styling**:

1. **Colors:** Uses your theme's link colors, backgrounds, and text colors
2. **Fonts:** Inherits your theme's typography
3. **Layout:** Respects your theme's content width
4. **Spacing:** Adapts to your theme's padding/margins
5. **Responsive:** Works on mobile, tablet, desktop (any screen size)

### Minimal CSS
The plugin includes only essential styles:
- Map container dimensions
- Form field spacing
- Button basic styling
- List layout structure

Everything else comes from **your theme**, so it looks native!

---

## Using with Page Builders

### Elementor
1. Edit page with Elementor
2. Add a **Shortcode** widget
3. Paste: `[poolsafe_portal]`
4. Style the widget container if desired
5. Publish

### Divi Builder
1. Add a new **Row**
2. Add a **Shortcode** module
3. Paste: `[poolsafe_portal]`
4. Customize module spacing/background
5. Save

### Gutenberg (Block Editor)
1. Add a **Shortcode** block
2. Paste: `[poolsafe_portal]`
3. Done!

---

## Customizing the Look

### Option 1: Use Your Theme's Customizer
Most themes have built-in styling options:
1. Go to **Appearance → Customize**
2. Change colors, fonts, buttons globally
3. The portal inherits these changes automatically!

### Option 2: Custom CSS (No Coding Required)
1. Go to **Appearance → Customize → Additional CSS**
2. Add custom styles:

```css
/* Change portal background */
.psp-portal {
    background: #f9f9f9;
    padding: 30px;
    border-radius: 8px;
}

/* Style the map */
.psp-map {
    border: 3px solid #0073aa;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* Customize buttons */
.psp-portal button {
    background: #ff6600;
    color: white;
    border-radius: 5px;
    padding: 12px 24px;
}

/* Ticket list styling */
.psp-list-item {
    background: white;
    padding: 15px;
    margin-bottom: 10px;
    border-left: 4px solid #0073aa;
}
```

### Option 3: Theme-Specific Classes
Target specific themes:

```css
/* For Astra theme */
.ast-container .psp-portal {
    max-width: 1200px;
}

/* For GeneratePress */
.inside-article .psp-portal {
    padding: 20px;
}
```

---

## Common Customizations

### Full-Width Layout
Make the portal full-width in your theme:

```css
.psp-portal {
    max-width: 100%;
    width: 100%;
}
```

### Centered Content
Center the portal with max-width:

```css
.psp-portal {
    max-width: 1200px;
    margin: 0 auto;
}
```

### Dark Mode Support
Add dark mode styling:

```css
@media (prefers-color-scheme: dark) {
    .psp-portal {
        background: #1e1e1e;
        color: #ffffff;
    }
    .psp-map {
        filter: brightness(0.9);
    }
}
```

### Match Your Brand Colors
Use CSS variables for easy theming:

```css
:root {
    --psp-primary: #0073aa;
    --psp-secondary: #00a32a;
    --psp-text: #333333;
}

.psp-portal button {
    background: var(--psp-primary);
}
```

---

## Responsive Design

### Mobile-First
The plugin is fully responsive:
- Map adapts to screen size
- Forms stack vertically on mobile
- Buttons become full-width on small screens
- Touch-friendly interactive elements

### Custom Breakpoints
Adjust for your theme's breakpoints:

```css
/* Mobile */
@media (max-width: 768px) {
    .psp-portal {
        padding: 15px;
    }
    .psp-map {
        height: 300px;
    }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
    .psp-portal {
        padding: 20px;
    }
}

/* Desktop */
@media (min-width: 1025px) {
    .psp-portal {
        padding: 30px;
    }
    .psp-map {
        height: 500px;
    }
}
```

---

## Advanced: Custom Template

For full control, create a custom page template:

1. Create file `page-portal.php` in your theme:
```php
<?php
/**
 * Template Name: Pool Safe Portal
 */
get_header();
?>

<div class="custom-portal-wrapper">
    <?php echo do_shortcode('[poolsafe_portal]'); ?>
</div>

<?php get_footer(); ?>
```

2. Assign template to your portal page
3. Style `.custom-portal-wrapper` as needed

---

## Accessibility

The plugin follows WCAG 2.1 standards:
- ✅ Proper ARIA labels
- ✅ Keyboard navigation
- ✅ Screen reader friendly
- ✅ Focus indicators
- ✅ Semantic HTML

Ensure your theme also supports accessibility!

---

## Testing Your Theme

### Quick Test Checklist
1. ✅ Add shortcode to a page
2. ✅ View on desktop - looks good?
3. ✅ View on mobile - responsive?
4. ✅ Click all buttons - working?
5. ✅ Test with logged-in user
6. ✅ Test with different roles (partner, support, admin)
7. ✅ Check map displays correctly
8. ✅ Verify forms are readable

### Browser Testing
Test in multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari (Mac/iOS)
- Mobile browsers

---

## Troubleshooting

### Problem: Styling looks broken
**Solution:** Your theme may have aggressive CSS. Add this:
```css
.psp-portal * {
    box-sizing: border-box;
}
```

### Problem: Map doesn't fit container
**Solution:** Set explicit height:
```css
.psp-map {
    height: 400px !important;
    width: 100% !important;
}
```

### Problem: Buttons inherit theme's ugly style
**Solution:** Override button styles:
```css
.psp-portal button {
    all: initial;
    background: #0073aa;
    color: white;
    padding: 10px 20px;
    border: none;
    cursor: pointer;
}
```

### Problem: Content too wide/narrow
**Solution:** Adjust wrapper width:
```css
.psp-portal {
    max-width: 1200px;
    margin: 0 auto;
}
```

---

## Support

If your theme has compatibility issues:

1. **Check theme documentation** for shortcode styling
2. **Use Custom CSS** to override conflicts
3. **Contact theme author** if theme breaks standard WordPress features
4. **Switch to a popular theme** from the compatible list above

---

## Best Practices

1. ✅ **Choose a well-coded theme** (check reviews, ratings)
2. ✅ **Keep theme updated** for security and compatibility
3. ✅ **Test shortcode** on a staging site before going live
4. ✅ **Use child theme** if making heavy customizations
5. ✅ **Minimize plugin conflicts** (deactivate unused plugins)

---

**Bottom Line:** The plugin works with **any** standard WordPress theme. If you encounter issues, it's usually a theme CSS conflict that's easy to fix with custom CSS!

Need help? Check the README.md or contact support.
