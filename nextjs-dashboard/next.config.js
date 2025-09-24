/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    imageSizes: [16, 20, 24, 32, 48, 64, 96, 128],
    domains: [],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig