import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "KanbAI",
  description: "Industrial AI quality control with continuous learning",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KanbAI",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#090B10",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
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
