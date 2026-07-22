/**
 * Device frame builder.
 *
 * Two modes:
 *  1. Procedural (default / fallback) — an original, code-drawn bezel sized
 *     exactly to the export resolution. No bitmap assets required.
 *  2. Real bezel image — drop in an official device PNG (e.g. Apple's own
 *     "Product Bezels" from developer.apple.com/design/resources, which ship
 *     with a transparent cutout where the screen goes) and this will:
 *       - detect the transparent "screen window" by scanning the image's
 *         alpha channel (no manual coordinate tuning needed, works with any
 *         bezel PNG that has a real alpha cutout)
 *       - place the screenshot into that window
 *       - draw the bezel image on top, so its opaque pixels (including the
 *         rounded screen corners) naturally mask the screenshot's edges
 */

// ---------------- procedural frame (original artwork) ----------------

function buildDeviceFrame(root, opts) {
  const {
    platform = "ios", // "ios" | "android"
    width,
    height,
    screenshotUrl = "",
    fit = "cover", // "cover" | "contain"
  } = opts;

  root.innerHTML = "";
  root.style.position = "relative";
  root.style.width = width + "px";
  root.style.height = height + "px";

  const isIOS = platform === "ios";

  const bezel = (isIOS ? 0.021 : 0.014) * width;
  const outerRadius = (isIOS ? 0.115 : 0.085) * width;
  const innerRadius = Math.max(outerRadius - bezel * 0.7, 0);

  const device = document.createElement("div");
  device.style.cssText = `
    position:absolute; inset:0;
    border-radius:${outerRadius}px;
    background:linear-gradient(160deg,#2b2c30 0%,#111214 45%,#3a3b40 100%);
    box-shadow:
      inset 0 0 0 ${Math.max(width * 0.003, 1)}px rgba(255,255,255,0.18),
      inset 0 0 ${width * 0.01}px rgba(0,0,0,0.6);
  `;
  root.appendChild(device);

  const screen = document.createElement("div");
  screen.style.cssText = `
    position:absolute;
    top:${bezel}px; left:${bezel}px; right:${bezel}px; bottom:${bezel}px;
    border-radius:${innerRadius}px;
    overflow:hidden;
    background:#000;
  `;
  device.appendChild(screen);

  if (screenshotUrl) {
    console.log("[deviceFrame:builtin] appending screenshot img:", screenshotUrl);
    const img = document.createElement("img");
    img.onload = () => console.log("[deviceFrame:builtin] IMG LOADED:", screenshotUrl, img.naturalWidth + "x" + img.naturalHeight);
    img.onerror = (e) => console.error("[deviceFrame:builtin] IMG FAILED to load:", screenshotUrl, e);
    img.src = screenshotUrl;
    img.style.cssText = `
      width:100%; height:100%;
      object-fit:${fit};
      object-position:top center;
      display:block;
    `;
    screen.appendChild(img);
  } else {
    console.log("[deviceFrame:builtin] no screenshotUrl — screen left black");
  }

  const glare = document.createElement("div");
  glare.style.cssText = `
    position:absolute; inset:0; pointer-events:none;
    background:linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 18%);
  `;
  screen.appendChild(glare);

  if (isIOS) {
    const islandW = width * 0.262;
    const islandH = islandW * 0.34;
    const island = document.createElement("div");
    island.style.cssText = `
      position:absolute;
      top:${bezel + height * 0.014}px;
      left:50%; transform:translateX(-50%);
      width:${islandW}px; height:${islandH}px;
      border-radius:${islandH}px;
      background:#000;
      box-shadow:inset 0 0 0 ${Math.max(width * 0.001, 0.5)}px rgba(255,255,255,0.06);
      z-index:5;
    `;
    device.appendChild(island);

    addSideButton(device, width, height, { side: "left", top: 0.11, len: 0.028, thick: bezel * 0.9 });
    addSideButton(device, width, height, { side: "left", top: 0.165, len: 0.05, thick: bezel * 0.9 });
    addSideButton(device, width, height, { side: "left", top: 0.225, len: 0.05, thick: bezel * 0.9 });
    addSideButton(device, width, height, { side: "right", top: 0.16, len: 0.075, thick: bezel * 0.9 });
  } else {
    const hole = document.createElement("div");
    const holeD = width * 0.028;
    hole.style.cssText = `
      position:absolute;
      top:${bezel + height * 0.016}px;
      left:50%; transform:translateX(-50%);
      width:${holeD}px; height:${holeD}px;
      border-radius:50%;
      background:#000;
      box-shadow:inset 0 0 0 ${Math.max(width * 0.0015, 0.5)}px rgba(255,255,255,0.12);
      z-index:5;
    `;
    device.appendChild(hole);

    addSideButton(device, width, height, { side: "right", top: 0.15, len: 0.06, thick: bezel * 0.85 });
    addSideButton(device, width, height, { side: "right", top: 0.225, len: 0.09, thick: bezel * 0.85 });
  }

  return root;
}

function addSideButton(device, width, height, { side, top, len, thick }) {
  const btn = document.createElement("div");
  const h = height * len;
  const offset = -thick * 0.55;
  btn.style.cssText = `
    position:absolute;
    top:${height * top}px;
    ${side}:${offset}px;
    width:${thick}px; height:${h}px;
    border-radius:${thick * 0.5}px;
    background:linear-gradient(${side === "left" ? "270deg" : "90deg"}, #1a1b1d, #4a4b50);
    box-shadow:0 0 0 ${Math.max(width * 0.0008, 0.4)}px rgba(0,0,0,0.4);
    z-index:1;
  `;
  device.appendChild(btn);
}

// ---------------- real bezel image frame (official assets) ----------------

const bezelWindowCache = new Map();

function loadImageEl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load bezel image: " + url));
    img.src = url;
  });
}

// Scans the bezel PNG's alpha channel to find the transparent "screen window".
// Cached per URL so this only runs once per bezel asset.
async function getBezelWindow(url) {
  if (bezelWindowCache.has(url)) return bezelWindowCache.get(url);
  const promise = (async () => {
    const img = await loadImageEl(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const step = 2; // sample every 2px for speed, plenty precise for a bounding box
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha < 16) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) {
      return { imgEl: img, naturalWidth: canvas.width, naturalHeight: canvas.height, window: null };
    }

    // nudge the box out very slightly — better to slightly overshoot (the
    // opaque bezel on top will mask the excess) than to undershoot and leave
    // a sliver of background peeking through at the seam.
    const padX = (maxX - minX) * 0.008;
    const padY = (maxY - minY) * 0.008;
    const window_ = {
      x: Math.max(0, minX - padX),
      y: Math.max(0, minY - padY),
      width: Math.min(canvas.width, maxX - minX + padX * 2),
      height: Math.min(canvas.height, maxY - minY + padY * 2),
    };
    return { imgEl: img, naturalWidth: canvas.width, naturalHeight: canvas.height, window: window_ };
  })();
  bezelWindowCache.set(url, promise);
  return promise;
}

async function buildRealBezelFrame(root, opts) {
  const { width, height, screenshotUrl = "", fit = "cover", bezelUrl } = opts;

  root.innerHTML = "";
  root.style.position = "relative";
  root.style.width = width + "px";
  root.style.height = height + "px";

  const info = await getBezelWindow(bezelUrl);
  const bezelAspect = info.naturalWidth / info.naturalHeight;
  const containerAspect = width / height;

  let drawW, drawH;
  if (bezelAspect > containerAspect) {
    drawW = width;
    drawH = width / bezelAspect;
  } else {
    drawH = height;
    drawW = height * bezelAspect;
  }
  const offsetX = (width - drawW) / 2;
  const offsetY = (height - drawH) / 2;
  const scale = drawW / info.naturalWidth;

  if (info.window) {
    const shot = document.createElement("div");
    shot.style.cssText = `
      position:absolute;
      left:${offsetX + info.window.x * scale}px;
      top:${offsetY + info.window.y * scale}px;
      width:${info.window.width * scale}px;
      height:${info.window.height * scale}px;
      overflow:hidden;
      background:#000;
    `;
    if (screenshotUrl) {
      const img = document.createElement("img");
      img.src = screenshotUrl;
      img.style.cssText = `width:100%;height:100%;object-fit:${fit};object-position:top center;display:block;`;
      shot.appendChild(img);
    }
    root.appendChild(shot);
  }

  const bezelImg = document.createElement("img");
  bezelImg.src = bezelUrl;
  bezelImg.style.cssText = `
    position:absolute; left:${offsetX}px; top:${offsetY}px;
    width:${drawW}px; height:${drawH}px; z-index:5; pointer-events:none;
  `;
  root.appendChild(bezelImg);

  return root;
}

// ---------------- unified entry point ----------------
// Uses the real bezel image when one is supplied, otherwise falls back to
// the procedural frame. Always async so callers can use one code path.
async function renderDeviceFrame(root, opts) {
  if (opts.bezelUrl) {
    return buildRealBezelFrame(root, opts);
  }
  return buildDeviceFrame(root, opts);
}

if (typeof module !== "undefined") {
  module.exports = { buildDeviceFrame, buildRealBezelFrame, renderDeviceFrame, getBezelWindow };
}
