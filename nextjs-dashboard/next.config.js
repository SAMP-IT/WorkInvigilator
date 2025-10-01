/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    imageSizes: [16, 20, 24, 32, 48, 64, 96, 128],
    domains: [],
    unoptimized: true, // Required for Cloudflare Pages
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Silence workspace root warning
  outputFileTracingRoot: require('path').join(__dirname, '..'),
}

module.exports = nextConfig