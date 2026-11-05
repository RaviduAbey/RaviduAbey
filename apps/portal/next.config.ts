import type { NextConfig } from 'next';

// Every portal page depends on the signed-in staff member, so pages render per request.
const nextConfig: NextConfig = {
  // Staff attach ETA approvals and permits (PDF or photo) through a server action.
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  transpilePackages: ['@tourist/core'],
};

export default nextConfig;
