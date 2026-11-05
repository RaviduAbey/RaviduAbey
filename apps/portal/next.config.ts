import type { NextConfig } from 'next';

// Every portal page depends on the signed-in staff member, so pages render per request.
const nextConfig: NextConfig = {
  transpilePackages: ['@tourist/core'],
};

export default nextConfig;
