/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  reactStrictMode: false,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Exclude problematic pages from the build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-avatar', '@radix-ui/react-tabs'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Handle redirects for old Pages Router paths
  async redirects() {
    return []
  },
  
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
  
  // Proper validation - no longer ignoring errors
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Improve security by removing X-Powered-By header
  poweredByHeader: false,
}

module.exports = nextConfig