export const FONTS = [
  "Inter", "Poppins", "Montserrat", "Nunito", "Roboto", "Manrope",
  "Plus Jakarta Sans", "DM Sans", "Sora", "Space Grotesk",
  "Outfit", "Work Sans", "Playfair Display", "Bebas Neue",
];

// Portrait orientation (matches real phone screenshots / Apple's 6.5" spec).
export const PRESETS = {
  ios: { width: 1284, height: 2778 },
  android: { width: 941, height: 1672 },
};

export const DEVICE_ASPECT = 2778 / 1284;

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function newSlide(base) {
  const platform = (base && base.platform) || "ios";
  const preset = PRESETS[platform];
  return {
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
    screenshotUrl: "", // data URL
    fit: "cover",
    deviceZoom: 1,
    deviceX: 0,
    deviceY: 0,
    ...(base || {}),
  };
}

export const DEFAULT_BANNER = {
  appName: "Your App",
  tagline: "Everything you need, in one place.",
  logoUrl: "",
  fontFamily: "Inter",
  background: { type: "gradient", color1: "#4f6df5", color2: "#7c3aed", angle: 135 },
  logo: { x: 0, y: 0, scale: 1 },
  title: { x: 0, y: 0, scale: 1 },
  body: { x: 0, y: 0, scale: 1 },
};
