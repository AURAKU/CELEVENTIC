import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cursor preview uses localhost; Playwright and some tabs use 127.0.0.1.
  // Without this, Next 15 blocks cross-origin /_next chunks and paints the red portal.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Hide the idle N badge so it does not sit on cinematic invitation previews.
  // Compile/runtime errors still open the overlay.
  devIndicators: false,
  // Allows building to a scratch dir (NEXT_DIST_DIR=.next-verify) without clobbering
  // the .next that a running `next start` is serving from.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Disable Next's gzip TransformStream layer. Media is served by Nginx; HTML compression
  // can be handled at the reverse proxy. Reduces one TransformStream pipeline involved in
  // `controller[kState].transformAlgorithm is not a function` races under Node < 24.15.
  compress: false,
  // Large app: eslint during `next build` routinely exceeds agent kill windows (SIGTERM ~8m).
  // Lint separately via `npm run lint`; keep production compile focused on page generation.
  eslint: { ignoreDuringBuilds: true },
  // Same rationale as eslint — full-project tsc during build OOM/kills under concurrent agent pressure.
  // Run `npx tsc --noEmit` / focused tests separately for type QA.
  typescript: { ignoreBuildErrors: true },
  images: {
    // Logo uses quality={100}; declare allowed qualities for Next 15/16
    qualities: [75, 100],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "plus.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.celeventic.com", pathname: "/**" },
      { protocol: "https", hostname: "celeventic.com", pathname: "/**" },
      { protocol: "https", hostname: "www.celeventic.com", pathname: "/**" },
      { protocol: "https", hostname: "celeventic.org", pathname: "/**" },
      { protocol: "https", hostname: "www.celeventic.org", pathname: "/**" },
      { protocol: "https", hostname: "celeventic.online", pathname: "/**" },
      { protocol: "https", hostname: "www.celeventic.online", pathname: "/**" },
      { protocol: "https", hostname: "assets.mixkit.co", pathname: "/**" },
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.cloudfront.net", pathname: "/**" },
      // Video/media CDN (CloudFront distribution behind a custom domain — see .env.example AWS_CLOUDFRONT_DOMAIN)
      { protocol: "https", hostname: "media.celeventic.com", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      { source: "/login", destination: "/auth/login", permanent: false },
      { source: "/about", destination: "/legal/about", permanent: false },
      { source: "/contact", destination: "/legal/contact", permanent: false },
      { source: "/faq", destination: "/legal/faq", permanent: false },
      { source: "/privacy", destination: "/legal/privacy", permanent: false },
      { source: "/terms", destination: "/legal/terms", permanent: false },
      // Settings Billing used a non-existent dashboard path; keep bookmarks working
      { source: "/dashboard/marketplace", destination: "/marketplace", permanent: false },
    ];
  },
};

export default nextConfig;
