import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fpzfxuteayzlgoehirpd.supabase.co',
      },
    ],
  },
};

export default nextConfig;
