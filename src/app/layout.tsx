import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Peblo AI",
  description: "Peblo AI - Content Ingestion and Adaptive Quiz Engine built with Next.js, Prisma, and AI-powered question generation.",
  keywords: ["Peblo AI", "Next.js", "Prisma", "TypeScript", "Adaptive Quiz", "PDF ingestion", "AI"],
  authors: [{ name: "Peblo AI Team" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Peblo AI",
    description: "Content ingestion and adaptive quiz generation platform",
    url: "http://localhost:3001",
    siteName: "Peblo AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Peblo AI",
    description: "Content ingestion and adaptive quiz generation platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
