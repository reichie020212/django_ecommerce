/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes was on in scaffold but it complains about routes that haven't
  // landed yet (e.g. /p/[slug] referenced from ProductCard before the PDP ships
  // in task #8). Re-enable once all routes exist.
  experimental: {},
};

export default nextConfig;
