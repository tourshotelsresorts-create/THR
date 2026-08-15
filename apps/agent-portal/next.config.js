/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@thr/shared"],
  async rewrites() {
    const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000";
    return [{ source: "/thr-api/:path*", destination: `${api}/:path*` }];
  },
};
module.exports = nextConfig;
