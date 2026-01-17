import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  webpack: (config) => {
    // Add aliases for replydb imports
    config.resolve.alias = {
      ...config.resolve.alias,
      "replydb": path.resolve(__dirname, "../../src/index.ts"),
      "replydb/adapters/x": path.resolve(__dirname, "../../src/adapters/x/index.ts"),
    };

    // Allow .js extensions to resolve to .ts files (for ESM compatibility)
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };

    return config;
  },
};

export default nextConfig;
