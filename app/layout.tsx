import type { Metadata, Viewport } from "next";
import { Bitter, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { LandscapeOrientationWarning } from "@/components/welcome/landscape-orientation-warning";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const bitter = Bitter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-bitter",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const ogImageUrl = `${appUrl}/logo/icon-512.png`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Nozzl - Your System Evolve",
    template: "%s | Nozzl",
  },
  description:
    "Evolusi Operasional SPBU Independen - SPBU Management System berbasis web untuk operasional, keuangan, dan pelaporan yang terintegrasi",
  keywords: [
    "SPBU",
    "Gas Station",
    "Management System",
    "Operational",
    "Financial",
    "Reporting",
  ],
  authors: [{ name: "Armanda Teruna" }],
  creator: "Armanda Teruna",
  publisher: "cnnct",
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
    locale: "id_ID",
    siteName: "Nozzl",
    title: "Nozzl - Your System Evolve",
    description: "Evolusi Operasional SPBU Independen",
    url: appUrl,
    images: [
      {
        url: ogImageUrl, // Absolute URL untuk Open Graph (WhatsApp, Facebook, dll)
        width: 512,
        height: 512,
        alt: "Nozzl Logo",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nozzl - Your System Evolve",
    description: "Evolusi Operasional SPBU Independen",
    images: [ogImageUrl], // Absolute URL untuk Twitter Card
  },
  icons: {
    icon: [
      { url: "/logo/NozzlLogomark.svg", type: "image/svg+xml" },
      { url: "/logo/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/logo/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/logo/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/logo/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/logo/NozzlLogomark.svg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${bitter.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <SessionProvider>
          <LandscapeOrientationWarning />
          {children}
          <Toaster richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
