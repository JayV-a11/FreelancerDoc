import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode catches common React issues early
  reactStrictMode: true,

  // Standalone output for Docker / Render if needed
  output: 'standalone',

  // Forward requests to the Fastify API during development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/:path*`,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
