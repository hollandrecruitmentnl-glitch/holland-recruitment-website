/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pg', 'bcryptjs', 'nodemailer', 'sharp'],
  experimental: {
    serverActions: {
      bodySizeLimit: '11mb',
      allowedOrigins: ['www.holland-recruitment.nl', 'holland-recruitment.nl', 'app.holland-recruitment.nl'],
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
export default nextConfig;
