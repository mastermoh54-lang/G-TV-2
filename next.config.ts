import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      // --- VERCEL (Live TV, Xtream, EPG, HLS, HLSSEG, Image-Proxy) ---
      {
        source: '/api/live/:path*',
        destination: 'https://g-tv-2.vercel.app/api/live/:path*',
      },
      {
        source: '/api/xtream/:path*',
        destination: 'https://g-tv-2.vercel.app/api/xtream/:path*',
      },
      {
        source: '/api/epg/:path*',
        destination: 'https://g-tv-2.vercel.app/api/epg/:path*',
      },
      {
        source: '/api/hls/:path*',
        destination: 'https://g-tv-2.vercel.app/api/hls/:path*',
      },
      {
        source: '/api/hls',
        destination: 'https://g-tv-2.vercel.app/api/hls',
      },
      {
        source: '/api/hlsseg/:path*',
        destination: 'https://g-tv-2.vercel.app/api/hlsseg/:path*',
      },
      {
        source: '/api/hlsseg',
        destination: 'https://g-tv-2.vercel.app/api/hlsseg',
      },
      {
        source: '/api/image-proxy/:path*',
        destination: 'https://g-tv-2.vercel.app/api/image-proxy/:path*',
      },
      {
        source: '/api/image-proxy',
        destination: 'https://g-tv-2.vercel.app/api/image-proxy',
      },

      // --- RAILWAY (Films, Séries, Stream VOD) ---
      {
        source: '/api/vod/:path*',
        destination: 'https://g-tv-2-production.up.railway.app/api/vod/:path*',
      },
      {
        source: '/api/series/:path*',
        destination: 'https://g-tv-2-production.up.railway.app/api/series/:path*',
      },
      {
        source: '/api/stream/:path*',
        destination: 'https://g-tv-2-production.up.railway.app/api/stream/:path*',
      },
      {
        source: '/api/show/:path*',
        destination: 'https://g-tv-2-production.up.railway.app/api/show/:path*',
      },
    ];
  },
};

export default nextConfig;
