import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
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
    
    // Remotion babylon 경고 해결
    config.resolve.alias = {
      ...config.resolve.alias,
      'babylon': require.resolve('babylon'),
    };
    
    return config;
  },
  
  // 서버 컴포넌트에서 외부 패키지 처리
  serverExternalPackages: [
    '@remotion/lambda',
    '@remotion/bundler',
    '@remotion/renderer',
  ],
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "voguegrop",
  project: "voguedrop",
});
