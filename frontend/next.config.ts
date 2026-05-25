import type { NextConfig } from "next";

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const nextConfig: NextConfig = {
  outputFileTracingRoot: new URL(".", import.meta.url).pathname,
  async rewrites() {
    return [
      {
        source: "/file/:filename",
        destination: `${API_URL}/file/:filename`,
      },
      {
        source: "/gallery",
        destination: `${API_URL}/gallery`,
      },
    ];
  },
};

export default nextConfig;
