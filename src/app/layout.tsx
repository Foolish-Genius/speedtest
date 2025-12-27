import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Speed Labs",
  description: "Professional internet speed test tool. Measure your download speed, upload speed, ping latency and jitter with detailed analytics, performance benchmarks, and smart insights.",
  keywords: ["speed test", "internet speed", "bandwidth test", "download speed", "upload speed", "ping test", "latency", "jitter", "network diagnostics", "wifi speed", "broadband test", "connection test"],
  authors: [{ name: "Speed Labs" }],
  creator: "Speed Labs",
  publisher: "Speed Labs",
  applicationName: "Speed Labs",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Speed Labs",
    title: "Speed Labs - Professional Internet Speed Test",
    description: "Test your internet connection speed with detailed analytics. Measure download, upload, ping, and jitter with professional-grade accuracy.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Speed Labs - Internet Speed Test",
    description: "Professional speed test with detailed analytics, benchmarks, and smart insights for your internet connection.",
    creator: "@speedlabs",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  category: "technology",
  classification: "Internet Tools",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
