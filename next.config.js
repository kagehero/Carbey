/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Turbopack fails on .venv symlink pointing outside project; exclude from tracing
  outputFileTracingExcludes: {
    '*': ['.venv/**'],
  },
}

module.exports = nextConfig
