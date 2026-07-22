import "./globals.css";
import { FONTS } from "@/lib/constants";

export const metadata = {
  title: "Screenshot Studio",
  description: "Generate App Store / Play Store screenshots and feature graphics.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Combined Google Fonts stylesheet for every selectable family.
const fontsHref =
  "https://fonts.googleapis.com/css2?" +
  FONTS.map((f) => "family=" + encodeURIComponent(f) + ":wght@400;500;600;700;800;900").join("&") +
  "&display=swap";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={fontsHref} />
      </head>
      <body>{children}</body>
    </html>
  );
}
