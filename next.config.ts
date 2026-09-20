import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Requis pour OpenNext/Cloudflare
  typescript: {
    ignoreBuildErrors: true,
  },
  // 👇 LE TUNNEL SECRET EST ICI 👇
  async rewrites() {
    return [
      {
        source: '/api/auth',
        destination: 'https://gmztv-live.vercel.app/api/auth'
      },
      {
        source: '/api/xtream',
        destination: 'https://gmztv-live.vercel.app/api/xtream'
      },
      {
        source: '/api/epg',
        destination: 'https://gmztv-live.vercel.app/api/epg'
      }
    ]
  }
};

export default nextConfig;
