import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.8.254"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/barthkosi/**",
      },
      {
        protocol: "https",
        hostname: "player.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
