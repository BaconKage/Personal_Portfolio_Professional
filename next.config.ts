import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
};
export default config;
