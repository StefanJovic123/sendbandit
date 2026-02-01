// Disable SSL verification for local development with self-signed certs
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sendbandit/api-client', '@sendbandit/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'media.sendbandit.com',
      },
    ],
  },
  // For Cloudflare Pages deployment
  output: 'standalone',
}

module.exports = nextConfig
