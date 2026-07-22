const FONTS = [
  "Inter", "Poppins", "Montserrat", "Nunito", "Roboto", "Manrope",
  "Plus Jakarta Sans", "DM Sans", "Sora", "Space Grotesk",
  "Outfit", "Work Sans", "Playfair Display", "Bebas Neue",
];

// Portrait orientation (matches real phone screenshots / Apple's 6.5" spec).
const PRESETS = {
  ios: { width: 1284, height: 2778 },
  android: { width: 941, height: 1672 },
};

let slides = [];
let currentIndex = 0;
let renderToken = 0; // guards against out-of-order async preview renders

function uid() { return Math.random().toString(36).slice(2, 10); }

function newSlide(base) {
  const platform = (base && base.platform) || "ios";
  const preset = PRESETS[platform];
  return Object.assign({
    id: uid(),
    platform,
    width: preset.width,
    height: preset.height,
    title: "Dashboard Overview",
    subtitle: "Track projects, progress, and department status at a glance",
    fontFamily: "Inter",
    titleColor: "#ffffff",
    subtitleColor: "#c7cbe0",
    titleSize: null,
    subtitleSize: null,
    background: { type: "gradient", color1: "#1b2559", color2: "#0b1024", angle: 160 },
    screenshotUrl: "",
    fit: "cover",
    frameType: "procedural", // "procedural" | "real"
    bezelUrl: "",
    deviceZoom: 1,   // multiplier on the base device width (zoom in/out)
    deviceX: 0,      // horizontal offset in slide px (move left/right)
    deviceY: 0,      // vertical offset in slide px (move up/down)
  }, base || {});
}

function current() { return slides[currentIndex]; }

// ---------- font loading ----------
const loadedFonts = new Set();
function loadFont(family) {
  if (!family || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(family) + ":wght@400;500;600;700;800;900&display=swap";
  document.head.appendChild(link);
}
FONTS.forEach(loadFont);

// ---------- populate font select ----------
const fontSelect = document.getElementById("fontSelect");
FONTS.forEach((f) => {
  const opt = document.createElement("option");
  opt.value = f; opt.textContent = f;
  fontSelect.appendChild(opt);
});

// ---------- element refs ----------
const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
const titleInput = document.getElementById("titleInput");
const subtitleInput = document.getElementById("subtitleInput");
const titleColorInput = document.getElementById("titleColorInput");
const subtitleColorInput = document.getElementById("subtitleColorInput");
const titleSizeInput = document.getElementById("titleSizeInput");
const subtitleSizeInput = document.getElementById("subtitleSizeInput");
const bgColor1Input = document.getElementById("bgColor1Input");
const bgColor2Input = document.getElementById("bgColor2Input");
const bgColor2Row = document.getElementById("bgColor2Row");
const bgAngleInput = document.getElementById("bgAngleInput");
const bgAngleRow = document.getElementById("bgAngleRow");
const screenshotInput = document.getElementById("screenshotInput");
const uploadLabel = document.getElementById("uploadLabel");
const uploadDrop = document.getElementById("uploadDrop");
const bezelUploadRow = document.getElementById("bezelUploadRow");
const bezelUploadDrop = document.getElementById("bezelUploadDrop");
const bezelInput = document.getElementById("bezelInput");
const bezelUploadLabel = document.getElementById("bezelUploadLabel");
const deviceZoomInput = document.getElementById("deviceZoom");
const deviceXInput = document.getElementById("deviceX");
const deviceYInput = document.getElementById("deviceY");
const zoomVal = document.getElementById("zoomVal");
const deviceXVal = document.getElementById("deviceXVal");
const deviceYVal = document.getElementById("deviceYVal");

const stage = document.getElementById("stage");
const previewScale = document.getElementById("previewScale");
const previewViewport = document.getElementById("previewViewport");
const dimLabel = document.getElementById("dimLabel");
const slideList = document.getElementById("slideList");

// ---------- sync controls -> slide object ----------
function bindText(el, key, isNumber) {
  el.addEventListener("input", () => {
    current()[key] = isNumber ? (el.value === "" ? null : Number(el.value)) : el.value;
    renderPreview();
    renderSlideList();
  });
}
bindText(widthInput, "width", true);
bindText(heightInput, "height", true);
bindText(titleInput, "title");
bindText(subtitleInput, "subtitle");
bindText(titleColorInput, "titleColor");
bindText(subtitleColorInput, "subtitleColor");
bindText(titleSizeInput, "titleSize", true);
bindText(subtitleSizeInput, "subtitleSize", true);

fontSelect.addEventListener("change", () => {
  current().fontFamily = fontSelect.value;
  loadFont(fontSelect.value);
  renderPreview();
});

bgColor1Input.addEventListener("input", () => { current().background.color1 = bgColor1Input.value; renderPreview(); renderSlideList(); });
bgColor2Input.addEventListener("input", () => { current().background.color2 = bgColor2Input.value; renderPreview(); renderSlideList(); });
bgAngleInput.addEventListener("input", () => { current().background.angle = Number(bgAngleInput.value); renderPreview(); });

// platform segmented control
document.querySelectorAll('[data-platform]').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('[data-platform]').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const platform = btn.dataset.platform;
    const preset = PRESETS[platform];
    current().platform = platform;
    current().width = preset.width;
    current().height = preset.height;
    syncControlsFromSlide();
    renderPreview();
    renderSlideList();
  });
});

document.getElementById("presetIosBtn").addEventListener("click", () => {
  current().width = PRESETS.ios.width; current().height = PRESETS.ios.height;
  syncControlsFromSlide(); renderPreview();
});
document.getElementById("presetAndroidBtn").addEventListener("click", () => {
  current().width = PRESETS.android.width; current().height = PRESETS.android.height;
  syncControlsFromSlide(); renderPreview();
});

// background type segmented control
document.querySelectorAll('[data-bgtype]').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('[data-bgtype]').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const type = btn.dataset.bgtype;
    current().background.type = type;
    bgColor2Row.style.display = type === "solid" ? "none" : "block";
    bgAngleRow.style.display = type === "solid" ? "none" : "block";
    renderPreview();
    renderSlideList();
  });
});

// fit segmented control
document.querySelectorAll('[data-fit]').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('[data-fit]').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    current().fit = btn.dataset.fit;
    renderPreview();
  });
});

// frame type segmented control (procedural vs real bezel PNG)
document.querySelectorAll('[data-frametype]').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('[data-frametype]').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    current().frameType = btn.dataset.frametype;
    bezelUploadRow.style.display = current().frameType === "real" ? "block" : "none";
    renderPreview();
  });
});

// device position (zoom / move) sliders
function updateDeviceLabels() {
  const s = current();
  zoomVal.textContent = Math.round((s.deviceZoom || 1) * 100) + "%";
  deviceXVal.textContent = Math.round(s.deviceX || 0);
  deviceYVal.textContent = Math.round(s.deviceY || 0);
}
deviceZoomInput.addEventListener("input", () => {
  current().deviceZoom = parseFloat(deviceZoomInput.value);
  updateDeviceLabels();
  renderPreview();
});
deviceXInput.addEventListener("input", () => {
  current().deviceX = parseFloat(deviceXInput.value);
  updateDeviceLabels();
  renderPreview();
});
deviceYInput.addEventListener("input", () => {
  current().deviceY = parseFloat(deviceYInput.value);
  updateDeviceLabels();
  renderPreview();
});
document.getElementById("deviceResetBtn").addEventListener("click", () => {
  const s = current();
  s.deviceZoom = 1; s.deviceX = 0; s.deviceY = 0;
  syncControlsFromSlide();
  renderPreview();
});

// screenshot upload
// NOTE: #screenshotInput is nested inside the <label id="uploadDrop">, so clicking
// the label already opens the file picker natively. A JS `.click()` here would fire
// the picker a SECOND time and swallow the change event — so we do NOT add one.
screenshotInput.addEventListener("change", async () => {
  const file = screenshotInput.files[0];
  console.log("[upload] change fired. file:", file);
  if (!file) { console.warn("[upload] no file selected"); return; }
  console.log("[upload] file details:", { name: file.name, type: file.type, size: file.size });
  uploadLabel.textContent = "Uploading…";
  const fd = new FormData();
  fd.append("file", file);
  try {
    console.log("[upload] POST /api/upload …");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    console.log("[upload] response status:", res.status, res.statusText);
    const json = await res.json();
    console.log("[upload] response json:", json);
    if (!json.url) { console.error("[upload] server returned no url!", json); }
    current().screenshotUrl = json.url;
    console.log("[upload] set current().screenshotUrl =", current().screenshotUrl, "| slide index:", currentIndex);
    uploadLabel.textContent = "Click to upload / swap screenshot ✓";
    await renderPreview();
    renderSlideList();
    console.log("[upload] renderPreview + renderSlideList done");
  } catch (e) {
    console.error("[upload] FAILED:", e);
    uploadLabel.textContent = "Upload failed — try again";
  }
});

// bezel (real device PNG) upload
// Same as the screenshot input: #bezelInput is nested in <label id="bezelUploadDrop">,
// so the label opens the picker natively — no JS `.click()` (it would double-fire).
bezelInput.addEventListener("change", async () => {
  const file = bezelInput.files[0];
  if (!file) return;
  bezelUploadLabel.textContent = "Uploading…";
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    current().bezelUrl = json.url;
    bezelUploadLabel.textContent = "Click to upload a bezel PNG ✓";
    renderPreview();
  } catch (e) {
    bezelUploadLabel.textContent = "Upload failed — try again";
  }
});

// ---------- preview rendering ----------
async function renderPreview() {
  const s = current();
  if (!s) return;
  const myToken = ++renderToken;
  console.log("[render] start. token:", myToken, "| screenshotUrl:", s.screenshotUrl, "| frameType:", s.frameType, "| platform:", s.platform);

  stage.style.width = s.width + "px";
  stage.style.height = s.height + "px";
  stage.style.background = s.background.type === "solid"
    ? s.background.color1
    : `linear-gradient(${s.background.angle}deg, ${s.background.color1}, ${s.background.color2})`;

  const titleEl = document.getElementById("title");
  const subEl = document.getElementById("subtitle");
  titleEl.textContent = s.title;
  subEl.textContent = s.subtitle;
  titleEl.style.fontFamily = `"${s.fontFamily}", sans-serif`;
  subEl.style.fontFamily = `"${s.fontFamily}", sans-serif`;
  titleEl.style.color = s.titleColor;
  subEl.style.color = s.subtitleColor;
  titleEl.style.fontSize = (s.titleSize || s.width * 0.078) + "px";
  subEl.style.fontSize = (s.subtitleSize || s.width * 0.032) + "px";

  const textBlock = document.getElementById("textBlock");
  textBlock.style.top = s.height * 0.065 + "px";
  textBlock.style.padding = `0 ${s.width * 0.07}px`;
  textBlock.style.gap = (s.height * 0.014) + "px";

  const zoom = s.deviceZoom || 1;
  const phoneW = s.width * 0.72 * zoom;
  const deviceAspect = 2778 / 1284;
  const phoneH = phoneW * deviceAspect;

  const phoneWrap = document.getElementById("phoneWrap");
  phoneWrap.style.top = (s.height * 0.30 + (s.deviceY || 0)) + "px";
  phoneWrap.style.width = phoneW + "px";
  phoneWrap.style.marginLeft = (-phoneW / 2 + (s.deviceX || 0)) + "px";

  console.log("[render] calling renderDeviceFrame with screenshotUrl:", s.screenshotUrl, "| phoneW:", phoneW, "phoneH:", phoneH);
  await renderDeviceFrame(document.getElementById("phone"), {
    platform: s.platform,
    width: phoneW,
    height: phoneH,
    screenshotUrl: s.screenshotUrl,
    fit: s.fit,
    bezelUrl: s.frameType === "real" ? s.bezelUrl : "",
  });
  const phoneImgs = document.getElementById("phone").querySelectorAll("img");
  console.log("[render] after renderDeviceFrame — <img> count in phone:", phoneImgs.length,
    [...phoneImgs].map(i => ({ src: i.getAttribute("src"), complete: i.complete, nat: i.naturalWidth + "x" + i.naturalHeight })));

  if (myToken !== renderToken) {
    console.warn("[render] DROPPED — newer render started (token", myToken, "!=", renderToken, ")");
    return; // a newer render started while we awaited — drop this one
  }

  // scale the whole stage to fit the viewport nicely.
  // Measure available space from stable, fixed-size chrome (top bar + side panels)
  // rather than #canvasArea's own clientWidth — that element centers the preview and
  // collapses to its (shrunk) content, creating a feedback loop that drives scale to 0.
  const sidebarW = document.getElementById("sidebar")?.offsetWidth || 0;
  const slidesW = document.getElementById("slides")?.offsetWidth || 0;
  const topbarH = document.getElementById("topbar")?.offsetHeight || 56;
  const maxW = window.innerWidth - sidebarW - slidesW - 60;
  const maxH = window.innerHeight - topbarH - 60;
  const scale = Math.max(0.05, Math.min(maxW / s.width, maxH / s.height, 1));
  previewScale.style.transform = `scale(${scale})`;
  previewScale.style.transformOrigin = "top left";
  previewViewport.style.width = (s.width * scale) + "px";
  previewViewport.style.height = (s.height * scale) + "px";

  dimLabel.textContent = `${s.width} × ${s.height}px — ${s.platform.toUpperCase()}`;
}

function syncControlsFromSlide() {
  const s = current();
  widthInput.value = s.width;
  heightInput.value = s.height;
  titleInput.value = s.title;
  subtitleInput.value = s.subtitle;
  fontSelect.value = s.fontFamily;
  titleColorInput.value = s.titleColor;
  subtitleColorInput.value = s.subtitleColor;
  titleSizeInput.value = s.titleSize || "";
  subtitleSizeInput.value = s.subtitleSize || "";
  bgColor1Input.value = s.background.color1;
  bgColor2Input.value = s.background.color2;
  bgAngleInput.value = s.background.angle;
  uploadLabel.textContent = s.screenshotUrl ? "Click to upload / swap screenshot ✓" : "Click to upload / swap screenshot";
  bezelUploadLabel.textContent = s.bezelUrl ? "Click to upload a bezel PNG ✓" : "Click to upload a bezel PNG";
  bezelUploadRow.style.display = s.frameType === "real" ? "block" : "none";
  deviceZoomInput.value = s.deviceZoom ?? 1;
  deviceXInput.value = s.deviceX ?? 0;
  deviceYInput.value = s.deviceY ?? 0;
  updateDeviceLabels();

  document.querySelectorAll('[data-platform]').forEach((b) => b.classList.toggle("active", b.dataset.platform === s.platform));
  document.querySelectorAll('[data-bgtype]').forEach((b) => b.classList.toggle("active", b.dataset.bgtype === s.background.type));
  document.querySelectorAll('[data-fit]').forEach((b) => b.classList.toggle("active", b.dataset.fit === s.fit));
  document.querySelectorAll('[data-frametype]').forEach((b) => b.classList.toggle("active", b.dataset.frametype === s.frameType));
  bgColor2Row.style.display = s.background.type === "solid" ? "none" : "block";
  bgAngleRow.style.display = s.background.type === "solid" ? "none" : "block";
}

// ---------- slide list ----------
function renderSlideList() {
  slideList.innerHTML = "";
  slides.forEach((s, i) => {
    const card = document.createElement("div");
    card.className = "slide-card" + (i === currentIndex ? " active" : "");
    card.innerHTML = `
      <div class="thumb" style="background:${s.background.type === 'solid' ? s.background.color1 : `linear-gradient(${s.background.angle}deg, ${s.background.color1}, ${s.background.color2})`}">
        ${s.screenshotUrl ? `<img src="${s.screenshotUrl}" />` : `<span>no image</span>`}
      </div>
      <div class="label">${s.title || "Untitled"}</div>
      <button class="del" title="Delete slide">×</button>
    `;
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("del")) return;
      currentIndex = i;
      syncControlsFromSlide();
      renderPreview();
      renderSlideList();
    });
    card.querySelector(".del").addEventListener("click", () => {
      if (slides.length === 1) return;
      slides.splice(i, 1);
      currentIndex = Math.max(0, Math.min(currentIndex, slides.length - 1));
      syncControlsFromSlide();
      renderPreview();
      renderSlideList();
    });
    slideList.appendChild(card);
  });
}

document.getElementById("addSlideBtn").addEventListener("click", () => {
  const s = newSlide(Object.assign({}, current(), { background: Object.assign({}, current().background) }));
  s.id = uid();
  slides.push(s);
  currentIndex = slides.length - 1;
  syncControlsFromSlide();
  renderPreview();
  renderSlideList();
});

// ---------- export ----------
function slideForExport(s) {
  const copy = Object.assign({}, s);
  copy.bezelUrl = s.frameType === "real" ? s.bezelUrl : "";
  return copy;
}

async function exportSlides(slidesToExport) {
  const btn = slidesToExport.length > 1 ? document.getElementById("exportAllBtn") : document.getElementById("exportCurrentBtn");
  const original = btn.textContent;
  btn.textContent = "Rendering…";
  btn.disabled = true;
  try {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: slidesToExport.map(slideForExport) }),
    });
    if (!res.ok) throw new Error("export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = slidesToExport.length > 1 ? "screenshots.zip" : `screenshot-${slidesToExport[0].platform}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Export failed: " + e.message);
  } finally {
    btn.textContent = original;
    btn.disabled = false;
  }
}

document.getElementById("exportCurrentBtn").addEventListener("click", () => exportSlides([current()]));
document.getElementById("exportAllBtn").addEventListener("click", () => exportSlides(slides));

// ========================================================================
//  Play Store banner (1024 x 500 feature graphic)
// ========================================================================
let mode = "screens"; // "screens" | "banner"
const banner = {
  appName: "Your App",
  tagline: "Everything you need, in one place.",
  logoUrl: "",
  fontFamily: "Inter",
  background: { type: "gradient", color1: "#4f6df5", color2: "#7c3aed", angle: 135 },
  logo: { x: 0, y: 0, scale: 1 },
  title: { x: 0, y: 0, scale: 1 },
  body: { x: 0, y: 0, scale: 1 },
};

// element refs
const bannerViewport = document.getElementById("bannerViewport");
const bannerScale = document.getElementById("bannerScale");
const bannerStage = document.getElementById("bannerStage");
const bannerAppName = document.getElementById("bannerAppName");
const bannerTagline = document.getElementById("bannerTagline");
const bannerFontSelect = document.getElementById("bannerFontSelect");
const bannerBgColor1 = document.getElementById("bannerBgColor1");
const bannerBgColor2 = document.getElementById("bannerBgColor2");
const bannerBgColor2Row = document.getElementById("bannerBgColor2Row");
const bannerBgAngle = document.getElementById("bannerBgAngle");
const bannerBgAngleRow = document.getElementById("bannerBgAngleRow");
const bannerShotStatus = document.getElementById("bannerShotStatus");
const logoInput = document.getElementById("logoInput");
const logoUploadLabel = document.getElementById("logoUploadLabel");
const logoScaleInput = document.getElementById("logoScale");
const titleScaleInput = document.getElementById("titleScale");
const bodyScaleInput = document.getElementById("bodyScale");
const logoScaleVal = document.getElementById("logoScaleVal");
const titleScaleVal = document.getElementById("titleScaleVal");
const bodyScaleVal = document.getElementById("bodyScaleVal");

// populate banner font select
FONTS.forEach((f) => {
  const opt = document.createElement("option");
  opt.value = f; opt.textContent = f;
  bannerFontSelect.appendChild(opt);
});

// first 3 slide screenshots (auto-fed into the banner mockups)
function topShots() {
  return slides.map((s) => s.screenshotUrl).filter(Boolean).slice(0, 3);
}

function bannerData() {
  return {
    appName: banner.appName,
    tagline: banner.tagline,
    logoUrl: banner.logoUrl,
    fontFamily: banner.fontFamily,
    background: banner.background,
    platform: (slides[0] && slides[0].platform) || "ios",
    shots: topShots(),
    logo: banner.logo,
    title: banner.title,
    body: banner.body,
  };
}

let bannerRenderToken = 0;
async function renderBanner() {
  const myToken = ++bannerRenderToken;
  const data = bannerData();

  const count = data.shots.length;
  bannerShotStatus.textContent = count === 0
    ? "⚠ No screenshots yet — upload some in Screenshots mode."
    : `Using ${count} screenshot${count > 1 ? "s" : ""} from your slides.`;

  await window.buildBanner(bannerStage, data);
  if (myToken !== bannerRenderToken) return;

  // scale 1024x500 to fit the canvas
  const sidebarW = document.getElementById("sidebar")?.offsetWidth || 0;
  const slidesW = document.getElementById("slides")?.offsetWidth || 0;
  const topbarH = document.getElementById("topbar")?.offsetHeight || 56;
  const maxW = window.innerWidth - sidebarW - slidesW - 60;
  const maxH = window.innerHeight - topbarH - 60;
  const scale = Math.max(0.05, Math.min(maxW / 1024, maxH / 500, 1));
  bannerPreviewScale = scale;
  bannerScale.style.transform = `scale(${scale})`;
  bannerScale.style.transformOrigin = "top left";
  bannerViewport.style.width = (1024 * scale) + "px";
  bannerViewport.style.height = (500 * scale) + "px";

  attachBannerDrag();
  dimLabel.textContent = "1024 × 500px — Play Store feature graphic";
}

// drag-to-move for logo / title / body inside the banner preview
let bannerPreviewScale = 1;
function attachBannerDrag() {
  bannerStage.querySelectorAll("[data-el]").forEach((el) => {
    const key = el.getAttribute("data-el"); // "logo" | "title" | "body"
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const startX = e.clientX, startY = e.clientY;
      const orig = { x: banner[key].x, y: banner[key].y };
      el.setPointerCapture(e.pointerId);
      const onMove = (ev) => {
        // convert screen delta to banner-space delta (undo the preview scale)
        const dx = (ev.clientX - startX) / bannerPreviewScale;
        const dy = (ev.clientY - startY) / bannerPreviewScale;
        banner[key].x = Math.round(orig.x + dx);
        banner[key].y = Math.round(orig.y + dy);
        const b = { logo: { x: 64, y: 150 }, title: { x: 64, y: 262 }, body: { x: 64, y: 340 } }[key];
        el.style.left = (b.x + banner[key].x) + "px";
        el.style.top = (b.y + banner[key].y) + "px";
        syncBannerLayoutLabels();
      };
      const onUp = (ev) => {
        el.releasePointerCapture(e.pointerId);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    });
  });
}

function syncBannerControls() {
  bannerAppName.value = banner.appName;
  bannerTagline.value = banner.tagline;
  bannerFontSelect.value = banner.fontFamily;
  bannerBgColor1.value = banner.background.color1;
  bannerBgColor2.value = banner.background.color2;
  bannerBgAngle.value = banner.background.angle;
  bannerBgColor2Row.style.display = banner.background.type === "solid" ? "none" : "block";
  bannerBgAngleRow.style.display = banner.background.type === "solid" ? "none" : "block";
  document.querySelectorAll('[data-bannerbgtype]').forEach((b) =>
    b.classList.toggle("active", b.dataset.bannerbgtype === banner.background.type));
  logoUploadLabel.textContent = banner.logoUrl ? "Click to swap app logo ✓" : "Click to upload app logo";
  logoScaleInput.value = banner.logo.scale;
  titleScaleInput.value = banner.title.scale;
  bodyScaleInput.value = banner.body.scale;
  syncBannerLayoutLabels();
}

// banner control bindings
bannerAppName.addEventListener("input", () => { banner.appName = bannerAppName.value; renderBanner(); });
bannerTagline.addEventListener("input", () => { banner.tagline = bannerTagline.value; renderBanner(); });
bannerFontSelect.addEventListener("change", () => {
  banner.fontFamily = bannerFontSelect.value; loadFont(banner.fontFamily); renderBanner();
});
bannerBgColor1.addEventListener("input", () => { banner.background.color1 = bannerBgColor1.value; renderBanner(); });
bannerBgColor2.addEventListener("input", () => { banner.background.color2 = bannerBgColor2.value; renderBanner(); });
bannerBgAngle.addEventListener("input", () => { banner.background.angle = parseInt(bannerBgAngle.value, 10); renderBanner(); });
document.querySelectorAll('[data-bannerbgtype]').forEach((btn) => {
  btn.addEventListener("click", () => {
    banner.background.type = btn.dataset.bannerbgtype;
    syncBannerControls();
    renderBanner();
  });
});

// text & logo layout (zoom sliders + labels)
function syncBannerLayoutLabels() {
  logoScaleVal.textContent = Math.round((banner.logo.scale || 1) * 100) + "%";
  titleScaleVal.textContent = Math.round((banner.title.scale || 1) * 100) + "%";
  bodyScaleVal.textContent = Math.round((banner.body.scale || 1) * 100) + "%";
}
logoScaleInput.addEventListener("input", () => { banner.logo.scale = parseFloat(logoScaleInput.value); syncBannerLayoutLabels(); renderBanner(); });
titleScaleInput.addEventListener("input", () => { banner.title.scale = parseFloat(titleScaleInput.value); syncBannerLayoutLabels(); renderBanner(); });
bodyScaleInput.addEventListener("input", () => { banner.body.scale = parseFloat(bodyScaleInput.value); syncBannerLayoutLabels(); renderBanner(); });
document.getElementById("bannerLayoutResetBtn").addEventListener("click", () => {
  banner.logo = { x: 0, y: 0, scale: 1 };
  banner.title = { x: 0, y: 0, scale: 1 };
  banner.body = { x: 0, y: 0, scale: 1 };
  logoScaleInput.value = 1; titleScaleInput.value = 1; bodyScaleInput.value = 1;
  syncBannerLayoutLabels();
  renderBanner();
});

// logo upload (label wraps the input → native picker, no JS .click())
logoInput.addEventListener("change", async () => {
  const file = logoInput.files[0];
  if (!file) return;
  logoUploadLabel.textContent = "Uploading…";
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    banner.logoUrl = json.url;
    logoUploadLabel.textContent = "Click to swap app logo ✓";
    renderBanner();
  } catch (e) {
    console.error("[logo] upload failed:", e);
    logoUploadLabel.textContent = "Upload failed — try again";
  }
});

// mode switching
function setMode(next) {
  mode = next;
  const isBanner = mode === "banner";
  document.getElementById("screenshotControls").style.display = isBanner ? "none" : "block";
  document.getElementById("bannerControls").style.display = isBanner ? "block" : "none";
  document.getElementById("previewViewport").style.display = isBanner ? "none" : "block";
  bannerViewport.style.display = isBanner ? "block" : "none";
  document.getElementById("slides").style.display = isBanner ? "none" : "block";
  document.getElementById("exportCurrentBtn").style.display = isBanner ? "none" : "inline-block";
  document.getElementById("exportAllBtn").style.display = isBanner ? "none" : "inline-block";
  document.getElementById("exportBannerBtn").style.display = isBanner ? "inline-block" : "none";
  document.querySelectorAll('[data-mode]').forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === mode));
  if (isBanner) { syncBannerControls(); renderBanner(); }
  else { renderPreview(); }
}
document.querySelectorAll('[data-mode]').forEach((btn) => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

// banner export
document.getElementById("exportBannerBtn").addEventListener("click", async () => {
  const btn = document.getElementById("exportBannerBtn");
  const original = btn.textContent;
  btn.textContent = "Rendering…"; btn.disabled = true;
  try {
    const res = await fetch("/api/export-banner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banner: bannerData() }),
    });
    if (!res.ok) throw new Error("export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "playstore-banner-1024x500.png";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("Banner export failed: " + e.message);
  } finally {
    btn.textContent = original; btn.disabled = false;
  }
});

// keep the scaling correct on resize for whichever mode is active
window.addEventListener("resize", () => { mode === "banner" ? renderBanner() : renderPreview(); });

// ---------- init ----------
slides = [newSlide()];
syncControlsFromSlide();
renderPreview();
renderSlideList();
