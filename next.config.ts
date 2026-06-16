import type { NextConfig } from "next";

// Para GitHub Pages se compila con STATIC_EXPORT=1 y PAGES_BASE_PATH=/<repo>.
// Sin esas variables (p. ej. en Vercel) se compila normal.
const isExport = process.env.STATIC_EXPORT === "1";
let basePath = process.env.PAGES_BASE_PATH || "";
if (basePath && !basePath.startsWith("/")) basePath = "/" + basePath;

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  ...(isExport
    ? {
        output: "export",
        basePath: basePath || undefined,
        assetPrefix: basePath || undefined,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
