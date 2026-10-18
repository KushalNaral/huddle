import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A static site for GitHub Pages; the live state comes from the Worker API.
  output: "export",
  trailingSlash: true,
  // GitHub project pages are served under /<repo>.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  images: { unoptimized: true },
  // Lets a second "device" on 127.0.0.1 load dev assets while testing a huddle locally.
  allowedDevOrigins: ["127.0.0.1"],
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
