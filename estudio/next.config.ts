import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // O Estúdio vive numa subpasta do repositório; isto evita que o Next
  // confunda o lockfile da raiz com o deste projeto.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
