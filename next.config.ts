import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'readdy.ai',
        port: '',
        pathname: '/api/search-image**',
      },
      {
        protocol: 'https',
        hostname: 'static.readdy.ai',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // Webpack 설정 추가
  webpack: (config, { isServer }) => {
    // README.md 파일 처리
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    
    // esbuild 관련 모듈 제외
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
  
  // 서버 컴포넌트에서 외부 패키지 처리
  experimental: {
    serverComponentsExternalPackages: [
      '@remotion/lambda',
      '@remotion/bundler',
      '@remotion/renderer',
    ],
  },
};

export default nextConfig;
