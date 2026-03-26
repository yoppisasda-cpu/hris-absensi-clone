import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  /* Force restart to fix Tailwind v4 JIT */
  reactStrictMode: true,
  trailingSlash: true,
  output: 'export',
};

export default nextConfig;
