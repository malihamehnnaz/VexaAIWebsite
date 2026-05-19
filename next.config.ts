import type {NextConfig} from 'next';

const isDev = process.env.NODE_ENV === 'development';

// Content-Security-Policy
// script-src: 'unsafe-inline' required for Next.js hydration chunks.
//             'unsafe-eval' only added in dev for webpack HMR.
// connect-src: all Supabase calls go through /api/* (server-side), so no
//              direct browser→Supabase connections are needed.
const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://placehold.co https://images.unsplash.com https://picsum.photos https://videos.pexels.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://www.openstreetmap.org",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(!isDev ? ["upgrade-insecure-requests"] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // frame-ancestors in CSP supersedes this, but keep for older browsers
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'videos.pexels.com', port: '', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Admin pages — never cache, never index
        source: '/admin(.*)',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        // Admin API routes
        source: '/api/admin(.*)',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
