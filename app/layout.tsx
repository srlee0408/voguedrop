import type { Metadata } from "next";
import { 
  Geist, 
  Geist_Mono,
  Roboto,
  Open_Sans,
  Montserrat,
  Poppins,
  Playfair_Display,
  Merriweather,
  Dancing_Script,
  Pacifico,
  Lobster,
  Bebas_Neue,
  Oswald,
  Noto_Sans_KR
} from "next/font/google";
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

// Additional fonts for text editor
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-roboto",
});

const openSans = Open_Sans({
  weight: ['300', '400', '600', '700'],
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-open-sans",
});

const montserrat = Montserrat({
  weight: ['300', '400', '600', '700'],
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-montserrat",
});

const poppins = Poppins({
  weight: ['300', '400', '600', '700'],
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-poppins",
});

const playfairDisplay = Playfair_Display({
  weight: ['400', '700'],
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-playfair",
});

const merriweather = Merriweather({
  weight: ['300', '400', '700'],
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-merriweather",
});

const dancingScript = Dancing_Script({
  weight: ['400', '700'],
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-dancing-script",
});

const pacifico = Pacifico({
  weight: '400',
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-pacifico",
});

const lobster = Lobster({
  weight: '400',
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-lobster",
});

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-bebas-neue",
});

const oswald = Oswald({
  weight: ['300', '400', '600', '700'],
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-oswald",
});

const notoSansKR = Noto_Sans_KR({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-noto-sans-kr",
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
        className={`${geistSans.variable} ${geistMono.variable} ${roboto.variable} ${openSans.variable} ${montserrat.variable} ${poppins.variable} ${playfairDisplay.variable} ${merriweather.variable} ${dancingScript.variable} ${pacifico.variable} ${lobster.variable} ${bebasNeue.variable} ${oswald.variable} ${notoSansKR.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />

      </body>
    </html>
  );
}
