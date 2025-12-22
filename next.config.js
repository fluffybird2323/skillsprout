/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker/Cloud Run deployment
  // Comment this out for Vercel deployment
  output: process.env.VERCEL ? undefined : 'standalone',

  // Optimize production builds
  reactStrictMode: true,

  experimental: {
    serverActions: {
      allowedOrigins: ['168.138.42.133', '168.138.42.133:3000', 'localhost:3000', 'skillsprout.artiestudio.org'],
    },
  },

  // Configure compression
  compress: true,

  // PWA and offline capabilities
  // The app has a service worker (sw.js) and manifest

  // Environment variables that should be exposed to the browser
  env: {
    NEXT_PUBLIC_API_ENDPOINT: process.env.NEXT_PUBLIC_API_ENDPOINT,
  },

  // Image optimization configuration
  images: {
    domains: [],
    unoptimized: false,
  },

  // Custom webpack configuration (if needed)
  webpack: (config, { isServer }) => {
    // Add any custom webpack config here
    return config;
  },
};

export default nextConfig;
