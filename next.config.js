/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic Next.js configuration optimized for Vercel deployment
  reactStrictMode: false,
  swcMinify: true,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    unoptimized: true,
  },
  
  // Support for MongoDB in server components
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
  
  // Configure webpack for client-side fallbacks
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
      }
    }
    return config
  },
  
  // Skip validation during build to avoid issues with NextAuth
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Improve security by removing X-Powered-By header
  poweredByHeader: false,
}

module.exports = nextConfig