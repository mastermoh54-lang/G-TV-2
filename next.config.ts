import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Garde bien ça pour Cloudflare
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        // Intercepte tout ce qui commence par /api/ sur ton frontend
        source: '/api/:path*',
        // Le relaie instantanément et silencieusement à Vercel
        destination: 'https://gmztv-live.vercel.app/api/:path*'
      }
    ]
  }
};

export default nextConfig;
