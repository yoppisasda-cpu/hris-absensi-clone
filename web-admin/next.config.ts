import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  reactStrictMode: false, // Disable strict mode temporarily for easier debugging
};

export default nextConfig;
