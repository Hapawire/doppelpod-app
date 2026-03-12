import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DoppelPod — Your AI Twin Runs Social 24/7",
  description:
    "Clone your voice, post, engage, grow — autopilot. Let your AI twin build your brand while you sleep.",
  metadataBase: new URL("https://doppelpod.com"),
  openGraph: {
    title: "DoppelPod — Your AI Twin Runs Social 24/7",
    description:
      "Clone your voice, post, engage, grow — autopilot. Let your AI twin build your brand while you sleep.",
    url: "https://doppelpod.com",
    siteName: "DoppelPod",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "DoppelPod — Your AI Twin Runs Social 24/7",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DoppelPod — Your AI Twin Runs Social 24/7",
    description:
      "Clone your voice, post, engage, grow — autopilot. Let your AI twin build your brand while you sleep.",
    images: ["/og-image.svg"],
  },
  keywords: [
    "AI twin",
    "social media automation",
    "voice cloning",
    "AI content creator",
    "autopilot social media",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
