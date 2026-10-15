import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep the dev badge away from the bottom tab bar.
  devIndicators: { position: "top-right" },
  // Let a phone on the same network use the dev server through the PC's private IP.
  allowedDevOrigins: ["10.*.*.*", "172.*.*.*", "192.168.*.*"],
  async headers() {
    return [{ source: "/:path*", headers: [...SECURITY_HEADERS] }];
  },
};

export default nextConfig;
