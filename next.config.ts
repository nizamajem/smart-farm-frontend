import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Menghasilkan .next/standalone/server.js untuk image Docker yang ramping
  output: 'standalone',
};

export default nextConfig;
