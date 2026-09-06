import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KanbAI Demo | Visual Inspection Workflow",
  description:
    "Explore KanbAI's public visual quality workflow demo with input validation, human review and traceable inspection evidence.",
  alternates: {
    canonical: "https://kanb-ai.vercel.app/demo",
  },
  openGraph: {
    title: "KanbAI Demo | Visual Inspection Workflow",
    description:
      "A browser-based walkthrough of KanbAI's manufacturing quality workflow, including input validation and human review.",
    url: "https://kanb-ai.vercel.app/demo",
    type: "website",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
