import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "down-tw.img.susercontent.com",
        pathname: "/file/**",
      },
      {
        protocol: "https",
        hostname: "cf.shopee.tw",
        pathname: "/file/**",
      },
      {
        protocol: "https",
        hostname: "**.img.susercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.shopee.tw",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
