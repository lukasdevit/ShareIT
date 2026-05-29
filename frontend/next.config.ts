import type { NextConfig } from 'next';

const API_URL =
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000';

const nextConfig: NextConfig = {
  outputFileTracingRoot: new URL('.', import.meta.url).pathname,
  transpilePackages: ['isomorphic-dompurify'],
  async rewrites() {
    return [
      {
        source: '/file/:filename',
        destination: `${API_URL}/file/:filename`,
      },
    ];
  },
};

export default nextConfig;
