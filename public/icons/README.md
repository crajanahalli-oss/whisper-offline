# PWA Icons

This directory contains the PWA icons for Whisper Offline.

## Required Icons

The following icon files are required for full PWA support:

1. **icon-192.png** (192x192) - Android minimum size
2. **icon-512.png** (512x512) - Android recommended size
3. **icon-maskable-192.png** (192x192) - Android adaptive icon with safe zone
4. **icon-maskable-512.png** (512x512) - Android adaptive icon with safe zone
5. **apple-touch-icon.png** (180x180) - iOS home screen icon (should also be copied to `public/` root)

## Icon Design Guidelines

### Standard Icons (icon-192.png, icon-512.png)
- Design: Blue microphone symbol on white or transparent background
- Simple, recognizable design
- Full bleed (use entire canvas)

### Maskable Icons (icon-maskable-192.png, icon-maskable-512.png)
- Same design as standard icons but with 40px safe zone padding on all sides
- Important content must stay within the safe zone (80% of canvas)
- Can have a solid background color (#007bff recommended)
- Safe zone ensures icon looks good on all Android devices with different masks

### iOS Icon (apple-touch-icon.png)
- 180x180 pixels
- PNG format only (no transparency)
- Rounded corners will be applied automatically by iOS
- Should match standard icon design

## Generating Icons

### Option 1: Online Generator (Recommended)
Use https://realfavicongenerator.net/ to generate all icons from a single base image:
1. Upload your 512x512 base icon
2. Configure iOS, Android, and maskable options
3. Download the generated icon package
4. Extract icons to this directory

### Option 2: Manual Creation
1. Create a 512x512 base icon in your image editor (Photoshop, GIMP, Figma, etc.)
2. Export as PNG
3. Resize to create smaller variants
4. For maskable icons, add 40px padding on all sides and center the design

### Option 3: Use Placeholder Icons (Temporary)
For testing purposes, you can use solid color squares with text:
- Use any online icon generator or create simple colored squares
- Ensures PWA functionality works while waiting for final design

## Current Status

**⚠️ Icons Not Generated Yet**

The icon files referenced in `manifest.json` do not exist yet. To complete Phase 7:

1. Generate the 5 required icon files using one of the methods above
2. Place them in this directory
3. Copy `apple-touch-icon.png` to `public/` root directory
4. Test in Chrome DevTools > Application > Manifest

## Testing Icons

After generating icons:

1. **Desktop Chrome**:
   - Open DevTools > Application > Manifest
   - Verify all icons load correctly
   - Check for warnings about sizes or formats

2. **Android Chrome**:
   - Install the app to home screen
   - Check icon appearance on home screen
   - Check splash screen icon

3. **iOS Safari**:
   - Add to home screen via Share button
   - Verify 180x180 icon appears sharp and centered
   - Check standalone mode appearance

## File Size Recommendations

- 192x192 PNG: ~5-15 KB (optimize for web)
- 512x512 PNG: ~20-50 KB (optimize for web)
- Use PNG compression tools like TinyPNG or ImageOptim to reduce file sizes
