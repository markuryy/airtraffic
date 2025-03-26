/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/airtraffic',
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 