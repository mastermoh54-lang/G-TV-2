import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Ignore les erreurs TypeScript uniquement pendant le build de production
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      // Redirection Live vers Vercel
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
      // Redirection VOD/Séries vers Railway
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
