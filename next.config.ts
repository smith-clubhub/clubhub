import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ClubHub is an authenticated dashboard end-to-end (cookie-based Supabase
  // auth on almost every route) — there's no meaningful static shell to
  // partially prerender, and Cache Components would otherwise require a
  // Suspense boundary around every per-request query in every page.
  cacheComponents: false,
};

export default nextConfig;
