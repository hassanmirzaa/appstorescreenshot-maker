const path = require("path");
const fs = require("fs");
const os = require("os");
const express = require("express");
const multer = require("multer");
const archiver = require("archiver");
const { chromium } = require("playwright");

const PORT = process.env.PORT || 4173;
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
const EXPORT_DIR = path.join(__dirname, "exports");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(EXPORT_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: "25mb" }));

// log every request for an uploaded image, so we can see if the browser
// successfully re-fetches the screenshot after upload (200) or not (404)
app.use("/uploads", (req, res, next) => {
  const filePath = path.join(UPLOAD_DIR, req.path);
  const exists = fs.existsSync(filePath);
  console.log(`[STATIC] GET /uploads${req.path} — file ${exists ? "EXISTS ✅" : "MISSING ❌"}`);
  next();
});

app.use(express.static(PUBLIC_DIR));

// ---------- upload (used for both screenshots and bezel frame images) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({ storage });

app.post("/api/upload", upload.single("file"), (req, res) => {
  console.log("\n[UPLOAD] request received at", new Date().toISOString());
  if (!req.file) {
    console.error("[UPLOAD] ❌ NO FILE in request — field name mismatch or empty body");
    return res.status(400).json({ error: "no file" });
  }
  console.log("[UPLOAD] ✅ saved file:", {
    originalName: req.file.originalname,
    savedAs: req.file.filename,
    mimetype: req.file.mimetype,
    sizeKB: (req.file.size / 1024).toFixed(1),
    path: req.file.path,
  });
  const url = `/uploads/${req.file.filename}`;
  console.log("[UPLOAD] returning url:", url, "\n");
  res.json({ url });
});
// backwards-compatible field name
app.post("/api/upload-legacy", upload.single("screenshot"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ---------- browser (shared instance) ----------
let browserPromise;
function getBrowser() {
  if (!browserPromise) {
    const launchOpts = { headless: true };
    // Optional overrides — only needed in constrained/sandboxed Linux environments
    // where the bundled Chromium can't be used directly. Not needed on a normal
    // developer machine after `npx playwright install chromium`.
    if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
      launchOpts.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
    }
    browserPromise = chromium.launch(launchOpts);
  }
  return browserPromise;
}

async function renderSlideToPng(browser, slide) {
  const width = Math.round(slide.width);
  const height = Math.round(slide.height);
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const json = JSON.stringify(slide);
  const hash = encodeURIComponent(json);
  const url = `http://localhost:${PORT}/render.html#${hash}`;

  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction("window.__RENDER_READY__ === true", { timeout: 20000 }).catch(() => {});
  // small settle delay for web font / image paint
  await page.waitForTimeout(150);

  const buffer = await page.screenshot({ type: "png" });
  await context.close();
  return buffer;
}

// ---------- export ----------
app.post("/api/export", async (req, res) => {
  const slides = req.body && req.body.slides;
  if (!Array.isArray(slides) || slides.length === 0) {
    return res.status(400).json({ error: "no slides supplied" });
  }

  try {
    const browser = await getBrowser();

    if (slides.length === 1) {
      const buffer = await renderSlideToPng(browser, slides[0]);
      res.set("Content-Type", "image/png");
      res.set("Content-Disposition", `attachment; filename="screenshot-${slides[0].platform}.png"`);
      return res.send(buffer);
    }

    const zipPath = path.join(os.tmpdir(), `export-${Date.now()}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    const zipDone = new Promise((resolve, reject) => {
      output.on("close", resolve);
      archive.on("error", reject);
    });
    archive.pipe(output);

    for (let i = 0; i < slides.length; i++) {
      const buffer = await renderSlideToPng(browser, slides[i]);
      const name = `screenshot-${String(i + 1).padStart(2, "0")}-${slides[i].platform}.png`;
      archive.append(buffer, { name });
    }

    await archive.finalize();
    await zipDone;

    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", `attachment; filename="screenshots.zip"`);
    const stream = fs.createReadStream(zipPath);
    stream.pipe(res);
    stream.on("close", () => fs.unlink(zipPath, () => {}));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
});

// ---------- Play Store banner export (1024 x 500 feature graphic) ----------
app.post("/api/export-banner", async (req, res) => {
  const banner = req.body && req.body.banner;
  if (!banner) return res.status(400).json({ error: "no banner supplied" });

  try {
    const browser = await getBrowser();
    const width = 1024, height = 500;
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    const hash = encodeURIComponent(JSON.stringify(banner));
    await page.goto(`http://localhost:${PORT}/banner.html#${hash}`, { waitUntil: "load" });
    await page.waitForFunction("window.__RENDER_READY__ === true", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(150);

    const buffer = await page.screenshot({ type: "png" });
    await context.close();

    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", `attachment; filename="playstore-banner-1024x500.png"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`\nScreenshot Studio running at http://localhost:${PORT}\n`);
});
