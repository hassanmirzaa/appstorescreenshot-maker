import { toPng } from "html-to-image";
import JSZip from "jszip";

async function nodeToPngBlob(node, width, height) {
  // ensure fonts are ready so text renders in the chosen family
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {}
  }
  const dataUrl = await toPng(node, {
    width,
    height,
    pixelRatio: 1,
    cacheBust: true,
    // node is rendered at native size already; no extra scaling
    style: { transform: "none", margin: "0" },
  });
  const res = await fetch(dataUrl);
  return await res.blob();
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportSlidePng(node, slide) {
  const blob = await nodeToPngBlob(node, slide.width, slide.height);
  triggerDownload(blob, `screenshot-${slide.platform}.png`);
}

export async function exportAllZip(nodesWithSlides) {
  const zip = new JSZip();
  for (let i = 0; i < nodesWithSlides.length; i++) {
    const { node, slide } = nodesWithSlides[i];
    const blob = await nodeToPngBlob(node, slide.width, slide.height);
    const name = `screenshot-${String(i + 1).padStart(2, "0")}-${slide.platform}.png`;
    zip.file(name, blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, "screenshots.zip");
}

export async function exportBannerPng(node) {
  const blob = await nodeToPngBlob(node, 1024, 500);
  triggerDownload(blob, "playstore-banner-1024x500.png");
}
