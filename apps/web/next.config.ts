import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import createNextIntlPlugin from "next-intl/plugin";

// Load monorepo root `.env` so CURRENT_SEASON and shared vars work from repo root.
const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "../..");
loadEnvConfig(monorepoRoot);

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const getLocalIPs = (): string[] => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = ["localhost", "127.0.0.1"];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
};

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TS_BUILD === "1" || process.env.NODE_ENV === "production",
  },
  // Pin workspace root so middleware and monorepo packages resolve in dev and on Vercel.
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  allowedDevOrigins: getLocalIPs(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.formula1.com",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
