import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  serverExternalPackages: ["dockerode", "@prisma/client", "bcrypt"],
};

export default nextConfig;
