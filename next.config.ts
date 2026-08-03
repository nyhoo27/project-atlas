import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Item photos are uploaded through a server action. The browser
      // downscales them first, but leave headroom for a large original.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
