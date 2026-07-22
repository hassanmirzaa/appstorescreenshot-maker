"use client";

import { forwardRef } from "react";
import DeviceFrame from "./DeviceFrame";
import { DEVICE_ASPECT } from "@/lib/constants";

/**
 * A full app-store screenshot slide at native resolution (s.width x s.height).
 * Rendered both in the scaled preview and (unscaled) into the export node.
 */
const ScreenshotStage = forwardRef(function ScreenshotStage({ slide: s }, ref) {
  const bg =
    s.background.type === "solid"
      ? s.background.color1
      : `linear-gradient(${s.background.angle}deg, ${s.background.color1}, ${s.background.color2})`;

  const zoom = s.deviceZoom || 1;
  const phoneW = s.width * 0.72 * zoom;
  const phoneH = phoneW * DEVICE_ASPECT;

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: s.width,
        height: s.height,
        overflow: "hidden",
        background: bg,
        fontFamily: `"${s.fontFamily}", sans-serif`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: s.height * 0.065,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: `0 ${s.width * 0.07}px`,
          gap: s.height * 0.014,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontWeight: 800,
            lineHeight: 1.08,
            color: s.titleColor,
            fontFamily: `"${s.fontFamily}", sans-serif`,
            fontSize: s.titleSize || s.width * 0.078,
          }}
        >
          {s.title}
        </h1>
        <p
          style={{
            margin: 0,
            fontWeight: 500,
            lineHeight: 1.35,
            color: s.subtitleColor,
            fontFamily: `"${s.fontFamily}", sans-serif`,
            fontSize: s.subtitleSize || s.width * 0.032,
          }}
        >
          {s.subtitle}
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: s.height * 0.3 + (s.deviceY || 0),
          width: phoneW,
          marginLeft: -phoneW / 2 + (s.deviceX || 0),
        }}
      >
        <DeviceFrame
          platform={s.platform}
          width={phoneW}
          height={phoneH}
          screenshotUrl={s.screenshotUrl}
          fit={s.fit}
        />
      </div>
    </div>
  );
});

export default ScreenshotStage;
