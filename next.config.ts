import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      // --- VERCEL (Live & Xtream) ---
      {
        source: '/api/hls',
        destination: 'https://g-tv-2.vercel.app/api/hls',
      },
      {
        source: '/api/hls/:path*',
        destination: 'https://g-tv-2.vercel.app/api/hls/:path*',
      },
      {
        source: '/api/hlsseg',
        destination: 'https://g-tv-2.vercel.app/api/hlsseg',
      },
      {
        source: '/api/hlsseg/:path*',
        destination: 'https://g-tv-2.vercel.app/api/hlsseg/:path*',
      },
      {
        source: '/api/live/:path*',
        destination: 'https://g-tv-2.vercel.app/api/live/:path*',
      },
      {
        source: '/api/xtream/:path*',
        destination: 'https://g-tv-2.vercel.app/api/xtream/:path*',
      },

      // --- RAILWAY (VOD & Show) ---
      {
        source: '/api/vod',
        destination: 'https://g-tv-2-production.up.railway.app/api/vod',
      },
      {
        source: '/api/vod/:path*',
        destination: 'https://g-tv-2-production.up.railway.app/api/vod/:path*',
      },
      {
        source: '/api/show',
        destination: 'https://g-tv-2-production.up.railway.app/api/show',
      },
      {
        source: '/api/show/:path*',
        destination: 'https://g-tv-2-production.up.railway.app/api/show/:path*',
      },
    ];
  },
};

export default nextConfig;
