import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      // Polyfill Node.js modules not needed in the browser (Turbopack handles these natively)
      "pino-pretty": "pino-pretty",
    },
  },
  webpack: (config) => {
    // Kept for production builds (non-Turbopack)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
