import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      // --- VERCEL : Xtream, Live TV, HLS, EPG ---
      {
        source: '/api/xtream',
        destination: 'https://g-tv-2.vercel.app/api/xtream',
      },
      {
        source: '/api/xtream/:path*',
        destination: 'https://g-tv-2.vercel.app/api/xtream/:path*',
      },
      {
        source: '/api/live',
        destination: 'https://g-tv-2.vercel.app/api/live',
      },
      {
        source: '/api/live/:path*',
        destination: 'https://g-tv-2.vercel.app/api/live/:path*',
      },
      {
        source: '/api/epg',
        destination: 'https://g-tv-2.vercel.app/api/epg',
      },
      {
        source: '/api/epg/:path*',
        destination: 'https://g-tv-2.vercel.app/api/epg/:path*',
      },
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

      // --- RAILWAY : VOD Films & Séries (Show) ---
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
      {
        source: '/api/stream',
        destination: 'https://g-tv-2-production.up.railway.app/api/stream',
      },
      {
        source: '/api/stream/:path*',
        destination: 'https://g-tv-2-production.up.railway.app/api/stream/:path*',
      },
    ];
  },
};

export default nextConfig;
