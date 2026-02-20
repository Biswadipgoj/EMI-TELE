/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Prevents Vercel build failure when ESLint is not installed as a dev dependency
    ignoreDuringBuilds: true,
  },
  typescript: {
    // We fix all TS errors manually — this is a safety net only
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/adm', destination: '/admin', permanent: false },
      { source: '/ret', destination: '/retailer', permanent: false },
    ];
  },
};

module.exports = nextConfig;
