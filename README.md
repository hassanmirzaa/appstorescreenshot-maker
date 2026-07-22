# Screenshot Studio

Generate **App Store / Play Store screenshots** and a **Play Store feature graphic (1024×500)** with device mockups — all in the browser.

Built with **Next.js (App Router)**. Fully **client-side**: uploads, rendering, and PNG/ZIP export all happen in the browser, so it deploys to **Vercel** (or any static host) with zero server infrastructure.

## Features

- **Screenshots mode** — multiple slides, iOS/Android device frames, title/subtitle, fonts, colors, gradient/solid backgrounds, and per-slide device zoom + position.
- **Play Store Banner mode** — 1024×500 feature graphic with 3 fanned device mockups (auto-filled from your first 3 screenshots), app logo upload, and draggable + zoomable logo/title/tagline.
- **Export** — per-screenshot PNG, all screenshots as a ZIP, and the banner PNG — rendered client-side via `html-to-image`.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, **New Project → Import** the repo.
3. Framework preset: **Next.js** (auto-detected). No env vars, no build overrides needed.
4. Deploy. Done.

> No serverless functions, no browser binaries, no file storage — everything runs in the
> visitor's browser, which is why the old Playwright/Express version failed on Vercel and
> this one doesn't.

## Notes

- The previous Express + Playwright implementation is archived in `legacy/` for reference (not used by the build).
- Fonts load from Google Fonts; images are handled as in-browser data URLs (never uploaded to any server).
