import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Obligatoire pour le build Docker sur Railway (.next/standalone)
  output: 'standalone',

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
