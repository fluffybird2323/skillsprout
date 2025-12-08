# PWA Icon Instructions

To complete the PWA setup, you need to add app icons to the `public` folder.

## Required Icons

1. **icon-192.png** (192x192 pixels)
2. **icon-512.png** (512x512 pixels)

## How to Create Icons

### Option 1: Use an Icon Generator
- Visit [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- Upload your logo or icon (recommended: 512x512 or larger)
- Download the generated icons
- Place `icon-192.png` and `icon-512.png` in the `public` folder

### Option 2: Manual Creation
1. Create a square logo/icon (512x512 recommended)
2. Use an image editor (Photoshop, Figma, Canva, etc.)
3. Export two versions:
   - 192x192 pixels → save as `icon-192.png`
   - 512x512 pixels → save as `icon-512.png`
4. Place both files in the `public` folder

### Option 3: Use ImageMagick (Command Line)
```bash
# If you have a source icon (e.g., logo.png)
convert logo.png -resize 192x192 public/icon-192.png
convert logo.png -resize 512x512 public/icon-512.png
```

## Design Guidelines

- **Simple & Clear**: Icons should be clear and recognizable at small sizes
- **Square Format**: Use square images (1:1 aspect ratio)
- **Safe Zone**: Keep important content within the center 80% of the icon
- **Solid Background**: Avoid transparent backgrounds if possible
- **Brand Colors**: Use your app's primary colors

## Current Theme Colors

Based on your app's theme:
- Primary: `#1A73E8` (Gravity Blue)
- Background Dark: `#121317`
- Background Light: `#FFFFFF`

## Testing Icons

After adding icons:
1. Build and deploy your app
2. Open on a mobile device
3. Check if the install prompt appears
4. Install and verify the icon appears correctly in the app drawer

## Optional: Add More Sizes

For better compatibility across devices, you can add more icon sizes to `manifest.json`:
- 72x72, 96x96, 128x128, 144x144, 152x152, 180x180, 384x384

Place these in the `public` folder and update `manifest.json` accordingly.
