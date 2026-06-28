/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The test-mode server uses its own build dir so it never contends with a dev server
  // on `.next` (two dev servers sharing one build cache can deadlock compilation).
  distDir: process.env.APTSCORE_TEST_MODE === '1' ? '.next-test' : '.next',
};

export default nextConfig;
