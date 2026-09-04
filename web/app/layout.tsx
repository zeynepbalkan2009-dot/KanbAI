import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  metadataBase: new URL("https://kanb-ai.vercel.app"),
  title: "KanbAI Vision | AI Quality Inspection for Manufacturing",
  description:
    "Turn existing factory cameras into AI-powered visual quality inspection with human verification and continuous learning.",
  applicationName: "KanbAI Vision",
  keywords: [
    "industrial AI",
    "visual inspection",
    "quality control",
    "computer vision",
    "manufacturing AI",
    "factory automation",
  ],
  openGraph: {
    title: "KanbAI Vision | AI Quality Inspection for Manufacturing",
    description:
      "AI-powered visual quality inspection using the cameras factories already have.",
    url: "https://kanb-ai.vercel.app",
    siteName: "KanbAI Vision",
    type: "website",
    images: [
      {
        url: "/marketing/hero-factory.png",
        width: 1200,
        height: 630,
        alt: "KanbAI Vision industrial AI inspection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KanbAI Vision | AI Quality Inspection for Manufacturing",
    description:
      "AI-powered visual quality inspection using the cameras factories already have.",
    images: ["/marketing/hero-factory.png"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KanbAI",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#071016",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">
        <QueryProvider>
          <PWARegister />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1f2937",
                color: "#f9fafb",
                border: "1px solid #374151",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
