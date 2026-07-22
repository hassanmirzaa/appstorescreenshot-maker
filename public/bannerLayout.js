/**
 * Shared Play Store "feature graphic" banner builder (1024 x 500).
 * Used by BOTH the live editor preview and the server-side export (banner.html),
 * so what you see is exactly what gets exported.
 *
 * data = {
 *   appName, tagline, logoUrl,
 *   background: { type, color1, color2, angle },
 *   shots: [url, url, url],       // top 3 screenshots
 *   platform: "ios" | "android",
 *   fontFamily
 * }
 */
async function buildBanner(root, data) {
  const W = 1024, H = 500;
  const {
    appName = "Your App",
    tagline = "Everything you need, in one place.",
    logoUrl = "",
    background = { type: "gradient", color1: "#4f6df5", color2: "#7c3aed", angle: 135 },
    shots = [],
    platform = "ios",
    fontFamily = "Inter",
    logo = { x: 0, y: 0, scale: 1 },
    title = { x: 0, y: 0, scale: 1 },
    body = { x: 0, y: 0, scale: 1 },
  } = data || {};

  root.textContent = "";
  root.style.cssText = `
    position:relative; width:${W}px; height:${H}px; overflow:hidden;
    font-family:"${fontFamily}", -apple-system, BlinkMacSystemFont, sans-serif;
    background:${background.type === "solid"
      ? background.color1
      : `linear-gradient(${background.angle || 135}deg, ${background.color1}, ${background.color2})`};
  `;

  // subtle decorative glow, top-left, for depth
  const glow = document.createElement("div");
  glow.style.cssText = `
    position:absolute; top:-160px; left:-120px; width:520px; height:520px;
    border-radius:50%; pointer-events:none;
    background:radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 70%);
  `;
  root.appendChild(glow);

  // ---------- left: logo + text (each independently movable / zoomable) ----------
  // Base positions in banner space; per-element {x,y} offsets and {scale} are applied on top.
  const BASE = { logo: { x: 64, y: 150 }, title: { x: 64, y: 262 }, body: { x: 64, y: 340 } };

  function placeEl(el, key, cfg) {
    const b = BASE[key];
    el.setAttribute("data-el", key);
    el.style.position = "absolute";
    el.style.left = (b.x + (cfg.x || 0)) + "px";
    el.style.top = (b.y + (cfg.y || 0)) + "px";
    el.style.transform = `scale(${cfg.scale || 1})`;
    el.style.transformOrigin = "left top";
    el.style.zIndex = "3";
    el.style.cursor = "move";
    root.appendChild(el);
  }

  if (logoUrl) {
    const logoEl = document.createElement("img");
    logoEl.src = logoUrl;
    logoEl.style.cssText = `
      width:96px; height:96px; border-radius:22px; object-fit:cover; display:block;
      box-shadow:0 12px 30px rgba(0,0,0,0.35);
    `;
    placeEl(logoEl, "logo", logo);
  }

  const nameEl = document.createElement("div");
  nameEl.textContent = appName;
  nameEl.style.cssText = `
    color:#ffffff; font-weight:800; font-size:52px; line-height:1.05;
    letter-spacing:-0.5px; text-shadow:0 2px 12px rgba(0,0,0,0.25); white-space:nowrap;
  `;
  placeEl(nameEl, "title", title);

  const tagEl = document.createElement("div");
  tagEl.textContent = tagline;
  tagEl.style.cssText = `
    color:rgba(255,255,255,0.86); font-weight:500; font-size:22px; line-height:1.4;
    width:400px;
  `;
  placeEl(tagEl, "body", body);

  // ---------- right: 3 fanned phone mockups ----------
  const stageRight = document.createElement("div");
  stageRight.style.cssText = `position:absolute; inset:0; z-index:2;`;
  root.appendChild(stageRight);

  const deviceAspect = 2778 / 1284;
  const phoneW = 176;
  const phoneH = phoneW * deviceAspect;

  // center, then left/right behind it — offsets tuned for a clean fan
  const layout = [
    { cx: 660, cy: 250, rot: -10, scale: 0.86, z: 1, shot: shots[1] }, // left back
    { cx: 855, cy: 250, rot: 10, scale: 0.86, z: 1, shot: shots[2] },  // right back
    { cx: 758, cy: 250, rot: 0, scale: 1.0, z: 2, shot: shots[0] },    // center front
  ];

  for (const item of layout) {
    const wrap = document.createElement("div");
    const w = phoneW * item.scale;
    const h = phoneH * item.scale;
    wrap.style.cssText = `
      position:absolute; width:${w}px; height:${h}px;
      left:${item.cx - w / 2}px; top:${item.cy - h / 2}px;
      transform:rotate(${item.rot}deg); z-index:${item.z};
      filter:drop-shadow(0 22px 34px rgba(0,0,0,0.45));
    `;
    stageRight.appendChild(wrap);

    const phone = document.createElement("div");
    phone.style.cssText = `position:relative; width:${w}px; height:${h}px;`;
    wrap.appendChild(phone);

    await window.renderDeviceFrame(phone, {
      platform: platform === "android" ? "android" : "ios",
      width: w,
      height: h,
      screenshotUrl: item.shot || "",
      fit: "cover",
      bezelUrl: "",
    });
  }
}

if (typeof window !== "undefined") window.buildBanner = buildBanner;
