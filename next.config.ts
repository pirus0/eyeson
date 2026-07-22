import type { NextConfig } from "next";

// Set at build time by the GitHub Pages workflow (repo name as the path prefix).
// Empty locally, so `next dev` keeps serving from the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
