import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./card.css";

export const metadata: Metadata = {
  title: { default: "AI Multilingual Wedding Cards", template: "%s · AI Multilingual Wedding Cards" },
  description: "Design, personalise and publish a beautiful multilingual digital wedding invitation in minutes.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
