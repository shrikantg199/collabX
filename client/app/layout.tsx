import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: {
    default: "CollabX | Instant Sync. Real-time Collaboration.",
    template: "%s | CollabX",
  },
  description: "CollabX is a high-performance real-time collaboration platform with sub-50ms latency chat-first workspaces. Built for engineering teams who need instant sync and zero lag.",
  keywords: ["collaboration", "real-time", "chat", "workspace", "engineering", "sync", "socket.io", "redis", "teamwork"],
  authors: [{ name: "CollabX Team" }],
  creator: "CollabX Team",
  publisher: "CollabX",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://collabx.app",
    siteName: "CollabX",
    title: "CollabX | Instant Sync. Real-time Collaboration.",
    description: "High-performance real-time collaboration for engineering teams. Chat-first workspaces with zero lag.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CollabX - Instant Sync. Real-time Collaboration.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CollabX | Instant Sync. Real-time Collaboration.",
    description: "High-performance real-time collaboration for engineering teams. Chat-first workspaces with zero lag.",
    images: ["/og-image.png"],
    creator: "@collabx",
  },
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
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export const viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
