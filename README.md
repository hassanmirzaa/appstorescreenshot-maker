# Screenshot Studio

Internal tool for producing App Store / Play Store screenshots: editable title + subtitle,
swappable font, swappable screenshot per slide, multiple slides, exact-pixel PNG export.

## Setup (one time)

```
npm install
npx playwright install chromium
```

## Run

```
npm start
```

Then open **http://localhost:4173** in your browser.

## Device frames

There are two frame modes, per slide, under **Device frame** in the left panel:

- **Built-in** — an original, code-drawn bezel (Dynamic Island + buttons for iOS,
  punch-hole + buttons for Android). No assets needed, works out of the box.
- **Real device PNG** — drop in an actual device mockup image and it'll be used instead.
  Free official ones:
  - **iOS**: developer.apple.com/design/resources → "Product Bezels" section → e.g.
    iPhone 17 / iPhone 16 (Photoshop + PNG, free, no login). Use the flattened PNG —
    it ships with a transparent cutout where the screen goes, made for exactly this.
  - Community Figma files (e.g. "Apple Devices" by Andre Soares) also work if exported
    as PNG with a transparent screen area.
  - When using Apple's bezels in anything customer-facing, check Apple's
    [Marketing Resources and Identity Guidelines](https://developer.apple.com/app-store/marketing/guidelines/#section-products).

  The app scans the PNG's alpha channel to find the transparent window automatically —
  no manual coordinate tuning. Any bezel PNG with a real alpha cutout works, so this
  also covers future device models or an Android equivalent you find/make.

## Using it

- Pick iOS or Android at the top of the left panel. Defaults: iOS 1284×2778 (Apple's
  6.5" screenshot spec, portrait), Android 941×1672. Both are plain number fields, so
  you can type any custom resolution.
- Edit the title/subtitle text, pick a font, set colors, pick solid/gradient background.
- Upload your app screenshot — it fills the phone screen, cropped or fitted per the
  Fill/Fit toggle.
- "+ Add" creates another slide (starts as a copy of the current one). Click a
  thumbnail to edit it, the × to delete it.
- **Export current PNG** downloads the slide you're viewing. **Export all as ZIP**
  renders every slide server-side (headless Chromium) at its exact target resolution —
  this is what guarantees pixel-perfect output regardless of your screen or zoom.

## Notes

- Everything runs locally; nothing leaves your machine.
- Uploaded screenshots/bezels live in `public/uploads/` — safe to clear out periodically.
- If you ever run this inside a locked-down Linux container where the bundled Chromium
  won't launch, set `PLAYWRIGHT_EXECUTABLE_PATH` to a working Chromium binary before
  `npm start`. Not needed on a normal Mac/Windows/Linux desktop.
