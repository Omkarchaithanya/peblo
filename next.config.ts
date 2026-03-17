import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  turbopack: {
    // Force Turbopack to use the project directory as the root when multiple lockfiles exist.
    root: __dirname,
  },
};

export default nextConfig;
