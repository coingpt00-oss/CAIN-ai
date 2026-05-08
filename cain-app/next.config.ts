import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,   // ✅ 이 줄 추가
  reactCompiler: true,
};

export default nextConfig;
