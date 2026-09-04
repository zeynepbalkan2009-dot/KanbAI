import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  metadataBase: new URL("https://kanb-ai.vercel.app"),
  title: "KanbAI | Visual Quality Management for Manufacturing",
  description:
    "Manage camera-based inspection, operator review and visual quality analytics in one workspace built for manufacturing teams.",
  applicationName: "KanbAI",
  keywords: [
    "visual quality management",
    "quality control software",
    "industrial computer vision",
    "manufacturing quality",
    "factory inspection",
  ],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "KanbAI | Visual Quality Management for Manufacturing",
    description: "Camera inspection, human review and quality analytics in one manufacturing workspace.",
    url: "https://kanb-ai.vercel.app",
    siteName: "KanbAI",
    type: "website",
    images: [
      {
        url: "/marketing/hero-factory.png",
        width: 1200,
        height: 630,
        alt: "KanbAI manufacturing quality platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KanbAI | Visual Quality Management for Manufacturing",
    description: "Camera inspection, human review and quality analytics in one manufacturing workspace.",
    images: ["/marketing/hero-factory.png"],
  },
  appleWebApp: {
    capable: true,
    title: "KanbAI",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
