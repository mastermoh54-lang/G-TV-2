import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      // 1. Live TV, Xtream, Flux HLS, Segments et Proxy Images vers VERCEL
      {
        source: '/api/live/:path*',
        destination: 'https://g-tv-2.vercel.app/api/live/:path*',
      },
      {
        source: '/api/xtream/:path*',
        destination: 'https://g-tv-2.vercel.app/api/xtream/:path*',
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
        source: '/api/image-proxy',
        destination: 'https://g-tv-2.vercel.app/api/image-proxy',
      },
      {
        source: '/api/image-proxy/:path*',
        destination: 'https://g-tv-2.vercel.app/api/image-proxy/:path*',
      },
      // 2. Films, Séries et Transcodage VOD vers RAILWAY
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
    ];
  },
};

export default nextConfig;
