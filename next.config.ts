import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  allowedDevOrigins: ["192.168.1.62", "192.168.1.76"],
};

export default nextConfig;
