/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "replicate.com",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: ['*']
    },
    optimizePackageImports: ['@vercel/analytics'],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  reactStrictMode: true
};

export default nextConfig;
