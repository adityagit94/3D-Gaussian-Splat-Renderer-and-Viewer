# 3D Gaussian Splat Renderer and Viewer

A lightweight, **local-first** WebGL application for viewing **3D Gaussian splats** directly in the browser.

- **No server-side processing**: your files stay on your device.
- **Fast on low-end hardware**: performance presets and GPU-friendly rendering settings.
- **Portable**: builds to static files (`dist/`) and can be hosted anywhere.

Built with **Vite**, **Three.js**, and **Spark**.

---

## Why this project

3D Gaussian splats can be huge and demanding to render. This project focuses on:

- **Practical performance** on laptops and integrated GPUs
- **Simple, clean UI** for everyday viewing and inspection
- **Offline-friendly workflow** (load a file, view immediately)
- **Export tools** (screenshot + shareable view state)

---

## Features

### Viewing
- Load local files (drag & drop or file picker)
- Supported formats:
  - `.ply` `.spz` `.sog` `.splat` `.ksplat`
- Camera:
  - **Orbit** mode (rotate/pan/zoom + double-click focus)
  - **FPS** mode (WASD + mouse) + **Q/E for down/up**
- Orientation helpers:
  - **Axis selector**: `Z-up` / `Y-up`
  - **Flip** (180°) for stubborn datasets
- **Fit** and **Home** actions

### Output / Sharing
- **Screenshot** export (PNG)
- **Export State** / **Import State** (JSON) for sharing camera + UI settings

### Performance controls (good for low-end devices)
- **Render presets** reduce resolution safely (pixel ratio scaling)
- **LOD presets** adjust renderer quality/performance knobs
- Anti-aliasing is disabled by default for speed (recommended for splats)

---

## Controls

### Orbit mode
- Rotate: left mouse drag / 1-finger drag
- Pan: right mouse drag (or Shift + left drag) / 2-finger drag
- Zoom: mouse wheel / trackpad pinch
- Focus: double-click (sets orbit center to clicked point)

### FPS mode
- Move: W / A / S / D
- Down / Up: Q / E
- Look: mouse drag on canvas
- Scroll wheel: forward/back (device/browser dependent)

---

## Getting started

### Requirements
- Node.js 18+ recommended

### Install & run
```bash
npm install
npm run dev
```

This repo binds the dev server to **127.0.0.1** by default (avoids `localhost` cookie/header issues). Open:
- `http://127.0.0.1:5173/`

---

## Build & preview

```bash
npm run build
npm run preview
```

Output is written to `dist/`.

---

## Deploy to Cloudflare Pages

You can deploy the static `dist/` folder to Cloudflare Pages.

### Option A: GitHub integration (recommended)
1. Push this repo to GitHub.
2. Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages**.
3. Connect your GitHub repo.
4. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Deploy.

### Option B: Deploy from your machine (Wrangler CLI)
```bash
npm run build
npm i -g wrangler
wrangler login
wrangler pages project create <your-project-name>
wrangler pages deploy dist --project-name <your-project-name>
```

### Hosting under a subpath
If your site is hosted under a subpath (example: `https://example.com/viewer/`), set the Vite base path:

```js
// vite.config.js
export default defineConfig({
  base: "/viewer/",
});
```

---

## Performance tips (low-end devices)

- Start with:
  - **Render: Balanced** (or **Low** on iGPU)
  - **LOD: Balanced** (or **Low** on iGPU)
- Close other GPU-heavy tabs/apps (video players, WebGL demos).
- If panning/zooming feels laggy:
  - drop **Render** preset first (biggest FPS gain),
  - then drop **LOD** preset.
- Very large scenes may exceed GPU memory; if the browser tab crashes:
  - try a smaller/optimized file (compressed formats help),
  - or reduce resolution.

---

## Roadmap (optional)

- True hierarchical LoD (budget-based splat selection)
- More export options (zip package, embedded viewer state)
- Better metadata panel (splat count, memory estimate)

---

## Contributing

PRs are welcome. If you add features, prefer:
- small, focused commits
- clear UI labels
- keeping the app usable on lower-end devices

---

## License

Add a `LICENSE` file (MIT/Apache-2.0/etc.) to finalize open-source distribution.
