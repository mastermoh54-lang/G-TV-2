// next.config.ts sur gtv-cloudflare
import type { NextConfig } from 'next';

const VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_URL || 'https://g-tv-2.vercel.app';
const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL || 'https://g-tv-2-production.up.railway.app';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      // --- VERCEL (Gestion Xtream, Live TV & EPG pour éviter la surcharge RAM Cloudflare) ---
      { source: '/api/xtream', destination: `${VERCEL_URL}/api/xtream` },
      { source: '/api/xtream/:path*', destination: `${VERCEL_URL}/api/xtream/:path*` },
      { source: '/api/live', destination: `${VERCEL_URL}/api/live` },
      { source: '/api/live/:path*', destination: `${VERCEL_URL}/api/live/:path*` },
      { source: '/api/hls', destination: `${VERCEL_URL}/api/hls` },
      { source: '/api/hls/:path*', destination: `${VERCEL_URL}/api/hls/:path*` },
      { source: '/api/hlsseg', destination: `${VERCEL_URL}/api/hlsseg` },
      { source: '/api/hlsseg/:path*', destination: `${VERCEL_URL}/api/hlsseg/:path*` },
      { source: '/api/epg', destination: `${VERCEL_URL}/api/epg` },
      { source: '/api/epg/:path*', destination: `${VERCEL_URL}/api/epg/:path*` },

      // --- RAILWAY (VOD Films, Séries & FFmpeg) ---
      { source: '/api/vod', destination: `${RAILWAY_URL}/api/vod` },
      { source: '/api/vod/:path*', destination: `${RAILWAY_URL}/api/vod/:path*` },
      { source: '/api/show', destination: `${RAILWAY_URL}/api/show` },
      { source: '/api/show/:path*', destination: `${RAILWAY_URL}/api/show/:path*` },
      { source: '/api/stream', destination: `${RAILWAY_URL}/api/stream` },
      { source: '/api/stream/:path*', destination: `${RAILWAY_URL}/api/stream/:path*` },
    ];
  },
};

export default nextConfig;
