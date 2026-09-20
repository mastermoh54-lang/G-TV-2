import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // <-- LA LIGNE MAGIQUE À AJOUTER
  typescript: {
    ignoreBuildErrors: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
