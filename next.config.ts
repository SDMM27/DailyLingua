import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the dev badge away from the bottom tab bar.
  devIndicators: { position: "top-right" },
  // Let a phone on the same network use the dev server through the PC's private IP.
  allowedDevOrigins: ["10.*.*.*", "172.*.*.*", "192.168.*.*"],
};

export default nextConfig;
