"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ScreenshotStage from "@/components/ScreenshotStage";
import Banner from "@/components/Banner";
import { FONTS, PRESETS, newSlide, DEFAULT_BANNER } from "@/lib/constants";
import { exportSlidePng, exportAllZip, exportBannerPng } from "@/lib/exporter";

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function Page() {
  const [mode, setMode] = useState("screens");
  const [slides, setSlides] = useState([newSlide()]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [banner, setBanner] = useState(DEFAULT_BANNER);
  const [scale, setScale] = useState(0.3);
  const [busy, setBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const exportRefs = useRef({}); // slide.id -> DOM node
  const bannerExportRef = useRef(null);
  const canvasRef = useRef(null);

  const slide = slides[currentIndex] || slides[0];

  // ---- update helpers ----
  const updateSlide = useCallback(
    (patch) => {
      setSlides((prev) => prev.map((s, i) => (i === currentIndex ? { ...s, ...patch } : s)));
    },
    [currentIndex]
  );
  const updateSlideBg = useCallback(
    (patch) => {
      setSlides((prev) =>
        prev.map((s, i) => (i === currentIndex ? { ...s, background: { ...s.background, ...patch } } : s))
      );
    },
    [currentIndex]
  );
  const updateBanner = useCallback((patch) => setBanner((b) => ({ ...b, ...patch })), []);
  const updateBannerBg = useCallback(
    (patch) => setBanner((b) => ({ ...b, background: { ...b.background, ...patch } })),
    []
  );
  const moveBannerElement = useCallback((key, x, y) => {
    setBanner((b) => ({ ...b, [key]: { ...b[key], x, y } }));
  }, []);

  // ---- preview scaling (measures the actual canvas area, so it works for any
  //      layout — desktop 3-column or mobile stacked) ----
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    function recompute() {
      const w = mode === "banner" ? 1024 : slide.width;
      const h = mode === "banner" ? 500 : slide.height;
      const availW = Math.max(40, el.clientWidth - 40);
      const availH = Math.max(40, el.clientHeight - 40);
      setScale(Math.max(0.05, Math.min(availW / w, availH / h, 1)));
      setIsMobile(window.innerWidth <= 820);
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, [mode, slide.width, slide.height]);

  // ---- top 3 screenshots for the banner ----
  const shots = useMemo(() => slides.map((s) => s.screenshotUrl).filter(Boolean).slice(0, 3), [slides]);
  const bannerPlatform = slides[0]?.platform || "ios";

  // ---- uploads ----
  async function onUploadScreenshot(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await readFileAsDataURL(file);
    updateSlide({ screenshotUrl: url });
  }
  async function onUploadLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await readFileAsDataURL(file);
    updateBanner({ logoUrl: url });
  }

  // ---- slides ----
  function addSlide() {
    setSlides((prev) => {
      const base = prev[currentIndex];
      const s = newSlide({ platform: base.platform, width: base.width, height: base.height, background: { ...base.background } });
      return [...prev, s];
    });
    setCurrentIndex(slides.length);
  }
  function deleteSlide(i) {
    if (slides.length === 1) return;
    setSlides((prev) => prev.filter((_, idx) => idx !== i));
    setCurrentIndex((ci) => Math.max(0, ci >= i ? ci - 1 : ci));
  }

  function applyPreset(platform) {
    const p = PRESETS[platform];
    updateSlide({ platform, width: p.width, height: p.height });
  }

  // ---- exports ----
  async function doExportCurrent() {
    setBusy(true);
    try {
      const node = exportRefs.current[slide.id];
      if (node) await exportSlidePng(node, slide);
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setBusy(false);
    }
  }
  async function doExportAll() {
    setBusy(true);
    try {
      const list = slides.map((s) => ({ node: exportRefs.current[s.id], slide: s })).filter((x) => x.node);
      await exportAllZip(list);
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setBusy(false);
    }
  }
  async function doExportBanner() {
    setBusy(true);
    try {
      if (bannerExportRef.current) await exportBannerPng(bannerExportRef.current);
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  const isBanner = mode === "banner";

  return (
    <div id="app">
      <header id="topbar">
        <div className="brand">Screenshot Studio</div>
        <div className="mode-switch">
          <button className={"mode-btn" + (!isBanner ? " active" : "")} onClick={() => setMode("screens")}>Screenshots</button>
          <button className={"mode-btn" + (isBanner ? " active" : "")} onClick={() => setMode("banner")}>Play Store Banner</button>
        </div>
        <div className="topbar-actions">
          {!isBanner ? (
            <>
              <button className="btn ghost" onClick={doExportCurrent} disabled={busy}>{busy ? "Rendering…" : "Export current PNG"}</button>
              <button className="btn primary" onClick={doExportAll} disabled={busy}>{busy ? "Rendering…" : "Export all as ZIP"}</button>
            </>
          ) : (
            <button className="btn primary" onClick={doExportBanner} disabled={busy}>{busy ? "Rendering…" : "Export banner PNG"}</button>
          )}
        </div>
      </header>

      <div id="main">
        {/* ---------- sidebar ---------- */}
        <aside id="sidebar">
          {!isBanner ? (
            <ScreenshotControls
              slide={slide}
              updateSlide={updateSlide}
              updateSlideBg={updateSlideBg}
              applyPreset={applyPreset}
              onUploadScreenshot={onUploadScreenshot}
            />
          ) : (
            <BannerControls
              banner={banner}
              updateBanner={updateBanner}
              updateBannerBg={updateBannerBg}
              onUploadLogo={onUploadLogo}
              shotCount={shots.length}
            />
          )}
        </aside>

        {/* ---------- canvas ---------- */}
        <main id="canvasArea" ref={canvasRef}>
          <div className="preview-frame" style={{ width: (isBanner ? 1024 : slide.width) * scale, height: (isBanner ? 500 : slide.height) * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
              {isBanner ? (
                <Banner
                  banner={banner}
                  shots={shots}
                  platform={bannerPlatform}
                  interactive
                  previewScale={scale}
                  onMoveElement={moveBannerElement}
                />
              ) : (
                <ScreenshotStage slide={slide} />
              )}
            </div>
          </div>
          <div id="dimLabel">
            {isBanner ? "1024 × 500px — Play Store feature graphic" : `${slide.width} × ${slide.height}px — ${slide.platform.toUpperCase()}`}
          </div>
        </main>

        {/* ---------- slides ---------- */}
        {!isBanner && (
          <aside id="slides">
            <div className="slides-header">
              <h3>Slides</h3>
              <button className="btn tiny primary" onClick={addSlide}>+ Add</button>
            </div>
            <div id="slideList">
              {slides.map((s, i) => (
                <div key={s.id} className={"slide-card" + (i === currentIndex ? " active" : "")} onClick={() => setCurrentIndex(i)}>
                  {slides.length > 1 && (
                    <button className="del" onClick={(e) => { e.stopPropagation(); deleteSlide(i); }}>×</button>
                  )}
                  <div className="thumb">
                    <div className="thumb-inner" style={{ transform: `scale(${(isMobile ? 80 : 172) / s.width})` }}>
                      <ScreenshotStage slide={s} />
                    </div>
                  </div>
                  <div className="caption">{s.title || "Untitled"}</div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* ---------- hidden full-size export nodes ---------- */}
      <div className="export-node-host" aria-hidden>
        {slides.map((s) => (
          <ScreenshotStage key={s.id} slide={s} ref={(el) => (exportRefs.current[s.id] = el)} />
        ))}
        <Banner ref={bannerExportRef} banner={banner} shots={shots} platform={bannerPlatform} />
      </div>
    </div>
  );
}

/* ============================ Screenshot controls ============================ */
function ScreenshotControls({ slide: s, updateSlide, updateSlideBg, applyPreset, onUploadScreenshot }) {
  return (
    <>
      <section className="panel">
        <h3>Platform &amp; size</h3>
        <div className="row seg">
          <button className={"seg-btn" + (s.platform === "ios" ? " active" : "")} onClick={() => applyPreset("ios")}>iOS</button>
          <button className={"seg-btn" + (s.platform === "android" ? " active" : "")} onClick={() => applyPreset("android")}>Android</button>
        </div>
        <div className="row two-col">
          <label>Width<input type="number" value={s.width} onChange={(e) => updateSlide({ width: +e.target.value || s.width })} /></label>
          <label>Height<input type="number" value={s.height} onChange={(e) => updateSlide({ height: +e.target.value || s.height })} /></label>
        </div>
        <div className="row preset-row">
          <button className="btn tiny ghost" onClick={() => applyPreset("ios")}>iOS default (1284×2778)</button>
          <button className="btn tiny ghost" onClick={() => applyPreset("android")}>Android default (941×1672)</button>
        </div>
      </section>

      <section className="panel">
        <h3>Text</h3>
        <label>Title<input type="text" value={s.title} onChange={(e) => updateSlide({ title: e.target.value })} /></label>
        <label>Subtitle<textarea rows={2} value={s.subtitle} onChange={(e) => updateSlide({ subtitle: e.target.value })} /></label>
        <label>Font family
          <select value={s.fontFamily} onChange={(e) => updateSlide({ fontFamily: e.target.value })}>
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <div className="row two-col">
          <label>Title color<input type="color" value={s.titleColor} onChange={(e) => updateSlide({ titleColor: e.target.value })} /></label>
          <label>Subtitle color<input type="color" value={s.subtitleColor} onChange={(e) => updateSlide({ subtitleColor: e.target.value })} /></label>
        </div>
        <div className="row two-col">
          <label>Title size (px)<input type="number" value={s.titleSize || ""} onChange={(e) => updateSlide({ titleSize: e.target.value ? +e.target.value : null })} /></label>
          <label>Subtitle size (px)<input type="number" value={s.subtitleSize || ""} onChange={(e) => updateSlide({ subtitleSize: e.target.value ? +e.target.value : null })} /></label>
        </div>
      </section>

      <section className="panel">
        <h3>Background</h3>
        <div className="row seg">
          <button className={"seg-btn" + (s.background.type === "gradient" ? " active" : "")} onClick={() => updateSlideBg({ type: "gradient" })}>Gradient</button>
          <button className={"seg-btn" + (s.background.type === "solid" ? " active" : "")} onClick={() => updateSlideBg({ type: "solid" })}>Solid</button>
        </div>
        <div className="row two-col">
          <label>Color 1<input type="color" value={s.background.color1} onChange={(e) => updateSlideBg({ color1: e.target.value })} /></label>
          {s.background.type !== "solid" && (
            <label>Color 2<input type="color" value={s.background.color2} onChange={(e) => updateSlideBg({ color2: e.target.value })} /></label>
          )}
        </div>
        {s.background.type !== "solid" && (
          <label>Gradient angle<input type="range" min={0} max={360} value={s.background.angle} onChange={(e) => updateSlideBg({ angle: +e.target.value })} /></label>
        )}
      </section>

      <section className="panel">
        <h3>Screenshot</h3>
        <label className="upload-drop">
          {s.screenshotUrl ? "Click to upload / swap screenshot ✓" : "Click to upload / swap screenshot"}
          <input type="file" accept="image/*" hidden onChange={onUploadScreenshot} />
        </label>
        <div className="row seg">
          <button className={"seg-btn" + (s.fit === "cover" ? " active" : "")} onClick={() => updateSlide({ fit: "cover" })}>Fill (crop)</button>
          <button className={"seg-btn" + (s.fit === "contain" ? " active" : "")} onClick={() => updateSlide({ fit: "contain" })}>Fit (no crop)</button>
        </div>
      </section>

      <section className="panel">
        <h3>Device position</h3>
        <label>Zoom <span className="range-val">{Math.round((s.deviceZoom || 1) * 100)}%</span>
          <input type="range" min={0.4} max={1.6} step={0.01} value={s.deviceZoom} onChange={(e) => updateSlide({ deviceZoom: +e.target.value })} />
        </label>
        <label>Horizontal <span className="range-val">{Math.round(s.deviceX)}</span>
          <input type="range" min={-600} max={600} step={1} value={s.deviceX} onChange={(e) => updateSlide({ deviceX: +e.target.value })} />
        </label>
        <label>Vertical <span className="range-val">{Math.round(s.deviceY)}</span>
          <input type="range" min={-800} max={800} step={1} value={s.deviceY} onChange={(e) => updateSlide({ deviceY: +e.target.value })} />
        </label>
        <button className="btn tiny reset-btn" onClick={() => updateSlide({ deviceZoom: 1, deviceX: 0, deviceY: 0 })}>Reset position</button>
      </section>
    </>
  );
}

/* ============================ Banner controls ============================ */
function BannerControls({ banner, updateBanner, updateBannerBg, onUploadLogo, shotCount }) {
  const setEl = (key, patch) => updateBanner({ [key]: { ...banner[key], ...patch } });
  return (
    <>
      <section className="panel">
        <h3>Play Store banner · 1024×500</h3>
        <p className="hint" style={{ marginBottom: 12 }}>
          Modern feature graphic with 3 device mockups. It automatically uses the <strong>first 3 screenshots</strong> from your Screenshots slides.
        </p>
        <label>App name<input type="text" value={banner.appName} onChange={(e) => updateBanner({ appName: e.target.value })} /></label>
        <label>Tagline<textarea rows={2} value={banner.tagline} onChange={(e) => updateBanner({ tagline: e.target.value })} /></label>
        <label>Font family
          <select value={banner.fontFamily} onChange={(e) => updateBanner({ fontFamily: e.target.value })}>
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      </section>

      <section className="panel">
        <h3>App logo</h3>
        <label className="upload-drop">
          {banner.logoUrl ? "Click to swap app logo ✓" : "Click to upload app logo"}
          <input type="file" accept="image/*" hidden onChange={onUploadLogo} />
        </label>
        <p className="hint">Square PNG works best (shown at 96×96, rounded).</p>
      </section>

      <section className="panel">
        <h3>Background</h3>
        <div className="row seg">
          <button className={"seg-btn" + (banner.background.type === "gradient" ? " active" : "")} onClick={() => updateBannerBg({ type: "gradient" })}>Gradient</button>
          <button className={"seg-btn" + (banner.background.type === "solid" ? " active" : "")} onClick={() => updateBannerBg({ type: "solid" })}>Solid</button>
        </div>
        <div className="row two-col">
          <label>Color 1<input type="color" value={banner.background.color1} onChange={(e) => updateBannerBg({ color1: e.target.value })} /></label>
          {banner.background.type !== "solid" && (
            <label>Color 2<input type="color" value={banner.background.color2} onChange={(e) => updateBannerBg({ color2: e.target.value })} /></label>
          )}
        </div>
        {banner.background.type !== "solid" && (
          <label>Gradient angle<input type="range" min={0} max={360} value={banner.background.angle} onChange={(e) => updateBannerBg({ angle: +e.target.value })} /></label>
        )}
      </section>

      <section className="panel">
        <h3>Text &amp; logo layout</h3>
        <p className="hint" style={{ marginBottom: 12 }}>Tip: drag the logo, title, or tagline directly on the banner to move them. Use the sliders to resize.</p>
        <label>Logo zoom <span className="range-val">{Math.round(banner.logo.scale * 100)}%</span>
          <input type="range" min={0.3} max={2.5} step={0.01} value={banner.logo.scale} onChange={(e) => setEl("logo", { scale: +e.target.value })} />
        </label>
        <label>Title zoom <span className="range-val">{Math.round(banner.title.scale * 100)}%</span>
          <input type="range" min={0.4} max={2.2} step={0.01} value={banner.title.scale} onChange={(e) => setEl("title", { scale: +e.target.value })} />
        </label>
        <label>Tagline zoom <span className="range-val">{Math.round(banner.body.scale * 100)}%</span>
          <input type="range" min={0.4} max={2.2} step={0.01} value={banner.body.scale} onChange={(e) => setEl("body", { scale: +e.target.value })} />
        </label>
        <button className="btn tiny reset-btn" onClick={() => updateBanner({ logo: { x: 0, y: 0, scale: 1 }, title: { x: 0, y: 0, scale: 1 }, body: { x: 0, y: 0, scale: 1 } })}>Reset layout</button>
      </section>

      <section className="panel">
        <h3>Screenshots used</h3>
        <p className="hint">Pulled live from your slides. Add or reorder slides in Screenshots mode to change what appears here.</p>
        <div className="hint" style={{ marginTop: 8 }}>
          {shotCount === 0 ? "⚠ No screenshots yet — upload some in Screenshots mode." : `Using ${shotCount} screenshot${shotCount > 1 ? "s" : ""} from your slides.`}
        </div>
      </section>
    </>
  );
}
