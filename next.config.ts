import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4mb" } }, // import pliku z katalogiem
};

export default nextConfig;
