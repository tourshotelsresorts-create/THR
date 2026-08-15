/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@thr/shared"],
};
module.exports = nextConfig;
