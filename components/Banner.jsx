"use client";

import { forwardRef, useRef } from "react";
import DeviceFrame from "./DeviceFrame";
import { DEVICE_ASPECT } from "@/lib/constants";

const BASE = {
  logo: { x: 64, y: 150 },
  title: { x: 64, y: 262 },
  body: { x: 64, y: 340 },
};

/**
 * Play Store feature graphic (1024 x 500).
 * `interactive` + `previewScale` + `onMoveElement` enable drag-to-move in the preview.
 * The same component (interactive=false) is rendered into the export node.
 */
const Banner = forwardRef(function Banner(
  { banner, shots = [], platform = "ios", interactive = false, previewScale = 1, onMoveElement },
  ref
) {
  const W = 1024;
  const H = 500;
  const drag = useRef(null);

  const bg =
    banner.background.type === "solid"
      ? banner.background.color1
      : `linear-gradient(${banner.background.angle || 135}deg, ${banner.background.color1}, ${banner.background.color2})`;

  function startDrag(key, e) {
    if (!interactive) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      key,
      startX: e.clientX,
      startY: e.clientY,
      origX: banner[key].x,
      origY: banner[key].y,
    };
  }
  function moveDrag(e) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / previewScale;
    const dy = (e.clientY - d.startY) / previewScale;
    onMoveElement && onMoveElement(d.key, Math.round(d.origX + dx), Math.round(d.origY + dy));
  }
  function endDrag(e) {
    if (drag.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      drag.current = null;
    }
  }

  function elPos(key, cfg) {
    const b = BASE[key];
    return {
      position: "absolute",
      left: b.x + (cfg.x || 0),
      top: b.y + (cfg.y || 0),
      transform: `scale(${cfg.scale || 1})`,
      transformOrigin: "left top",
      zIndex: 3,
      cursor: interactive ? "move" : "default",
      touchAction: "none",
    };
  }

  const dragHandlers = (key) =>
    interactive
      ? {
          onPointerDown: (e) => startDrag(key, e),
          onPointerMove: moveDrag,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
        }
      : {};

  const phoneW = 176;
  const phoneH = phoneW * DEVICE_ASPECT;
  const layout = [
    { cx: 660, cy: 250, rot: -10, scale: 0.86, z: 1, shot: shots[1] },
    { cx: 855, cy: 250, rot: 10, scale: 0.86, z: 1, shot: shots[2] },
    { cx: 758, cy: 250, rot: 0, scale: 1.0, z: 2, shot: shots[0] },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: W,
        height: H,
        overflow: "hidden",
        background: bg,
        fontFamily: `"${banner.fontFamily}", -apple-system, BlinkMacSystemFont, sans-serif`,
      }}
    >
      {/* decorative glow */}
      <div
        style={{
          position: "absolute",
          top: -160,
          left: -120,
          width: 520,
          height: 520,
          borderRadius: "50%",
          pointerEvents: "none",
          background: "radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 70%)",
        }}
      />

      {/* phones */}
      {layout.map((item, i) => {
        const w = phoneW * item.scale;
        const h = phoneH * item.scale;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: w,
              height: h,
              left: item.cx - w / 2,
              top: item.cy - h / 2,
              transform: `rotate(${item.rot}deg)`,
              zIndex: item.z,
              filter: "drop-shadow(0 22px 34px rgba(0,0,0,0.45))",
            }}
          >
            <DeviceFrame platform={platform} width={w} height={h} screenshotUrl={item.shot || ""} fit="cover" />
          </div>
        );
      })}

      {/* logo */}
      {banner.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={banner.logoUrl}
          alt=""
          {...dragHandlers("logo")}
          style={{
            ...elPos("logo", banner.logo),
            width: 96,
            height: 96,
            borderRadius: 22,
            objectFit: "cover",
            display: "block",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          }}
        />
      ) : null}

      {/* title */}
      <div
        {...dragHandlers("title")}
        style={{
          ...elPos("title", banner.title),
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 52,
          lineHeight: 1.05,
          letterSpacing: "-0.5px",
          textShadow: "0 2px 12px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap",
        }}
      >
        {banner.appName}
      </div>

      {/* tagline */}
      <div
        {...dragHandlers("body")}
        style={{
          ...elPos("body", banner.body),
          color: "rgba(255,255,255,0.86)",
          fontWeight: 500,
          fontSize: 22,
          lineHeight: 1.4,
          width: 400,
        }}
      >
        {banner.tagline}
      </div>
    </div>
  );
});

export default Banner;
