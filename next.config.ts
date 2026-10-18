import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second "device" on 127.0.0.1 load dev assets while testing a huddle locally.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
