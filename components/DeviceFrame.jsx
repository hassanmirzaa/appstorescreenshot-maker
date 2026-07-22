"use client";

/**
 * Procedural device frame (iOS / Android), code-drawn and sized to `width`/`height`.
 * Faithful React port of the original canvas-free bezel artwork.
 */
export default function DeviceFrame({ platform = "ios", width, height, screenshotUrl = "", fit = "cover" }) {
  const isIOS = platform === "ios";
  const bezel = (isIOS ? 0.021 : 0.014) * width;
  const outerRadius = (isIOS ? 0.115 : 0.085) * width;
  const innerRadius = Math.max(outerRadius - bezel * 0.7, 0);

  const sideButtons = isIOS
    ? [
        { side: "left", top: 0.11, len: 0.028, thick: bezel * 0.9 },
        { side: "left", top: 0.165, len: 0.05, thick: bezel * 0.9 },
        { side: "left", top: 0.225, len: 0.05, thick: bezel * 0.9 },
        { side: "right", top: 0.16, len: 0.075, thick: bezel * 0.9 },
      ]
    : [
        { side: "right", top: 0.15, len: 0.06, thick: bezel * 0.85 },
        { side: "right", top: 0.225, len: 0.09, thick: bezel * 0.85 },
      ];

  const islandW = width * 0.262;
  const islandH = islandW * 0.34;
  const holeD = width * 0.028;

  return (
    <div style={{ position: "relative", width, height }}>
      {/* side buttons (behind the body) */}
      {sideButtons.map((b, i) => {
        const h = height * b.len;
        const offset = -b.thick * 0.55;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: height * b.top,
              [b.side]: offset,
              width: b.thick,
              height: h,
              borderRadius: b.thick * 0.5,
              background: `linear-gradient(${b.side === "left" ? "270deg" : "90deg"}, #1a1b1d, #4a4b50)`,
              boxShadow: `0 0 0 ${Math.max(width * 0.0008, 0.4)}px rgba(0,0,0,0.4)`,
              zIndex: 1,
            }}
          />
        );
      })}

      {/* device body */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: outerRadius,
          background: "linear-gradient(160deg,#2b2c30 0%,#111214 45%,#3a3b40 100%)",
          boxShadow: `inset 0 0 0 ${Math.max(width * 0.003, 1)}px rgba(255,255,255,0.18), inset 0 0 ${width * 0.01}px rgba(0,0,0,0.6)`,
        }}
      >
        {/* screen */}
        <div
          style={{
            position: "absolute",
            top: bezel,
            left: bezel,
            right: bezel,
            bottom: bezel,
            borderRadius: innerRadius,
            overflow: "hidden",
            background: "#000",
          }}
        >
          {screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={screenshotUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: fit, objectPosition: "top center", display: "block" }}
            />
          ) : null}
          {/* glare */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 18%)",
            }}
          />
        </div>

        {/* notch / island / hole punch */}
        {isIOS ? (
          <div
            style={{
              position: "absolute",
              top: bezel + height * 0.014,
              left: "50%",
              transform: "translateX(-50%)",
              width: islandW,
              height: islandH,
              borderRadius: islandH,
              background: "#000",
              boxShadow: `inset 0 0 0 ${Math.max(width * 0.001, 0.5)}px rgba(255,255,255,0.06)`,
              zIndex: 5,
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: bezel + height * 0.016,
              left: "50%",
              transform: "translateX(-50%)",
              width: holeD,
              height: holeD,
              borderRadius: "50%",
              background: "#000",
              boxShadow: `inset 0 0 0 ${Math.max(width * 0.0015, 0.5)}px rgba(255,255,255,0.12)`,
              zIndex: 5,
            }}
          />
        )}
      </div>
    </div>
  );
}
