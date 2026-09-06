/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig = {
  // Next 16.3.x + Vercel's build adapter currently fails when standalone
  // output is enabled because the adapter suppresses root NFT trace files
  // that standalone finalization still expects. Vercel does not need the
  // standalone folder, so keep it only for local/self-hosted builds.
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
