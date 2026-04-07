import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  // Removed: output: 'export' (was causing /dashboard to show login page)
  // Removed: trailingSlash: true (not needed for SSR mode)
};

export default nextConfig;
