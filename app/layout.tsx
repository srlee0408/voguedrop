import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./external-imports.css";
import "./globals.css";

import { StagewiseToolbar } from "@stagewise/toolbar-next";
import ReactPlugin from "@stagewise-plugins/react";
import { AuthProvider } from "@/lib/auth/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VogueDrop - AI Video Editor",
  description: "Create stunning fashion videos from static images with AI-powered effects and transitions",
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
        <AuthProvider>
          {children}
        </AuthProvider>
        <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />

      </body>
    </html>
  );
}
