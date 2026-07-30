import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
