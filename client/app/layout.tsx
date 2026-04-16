import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CollabX",
  description: "Real-time collaboration foundation with chat-first workspaces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
