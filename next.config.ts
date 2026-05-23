import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/barthkosi/**',
      },
      {
        protocol: 'https',
        hostname: 'player.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
