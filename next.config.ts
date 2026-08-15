import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enables forbidden()/unauthorized() so the DAL can raise a real 403 that
    // renders forbidden.tsx, instead of bouncing an authenticated-but-
    // unauthorised user back to the login page as if they were signed out.
    authInterrupts: true,
  },
  // The Prisma client and the pg driver are Node-only; keep them out of any
  // bundle Turbopack builds for the browser.
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
};

export default nextConfig;
