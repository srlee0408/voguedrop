import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind';

// Remotion 설정
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Chromium 설정 - 폰트 렌더링 개선
Config.setChromiumOpenGlRenderer('angle');
Config.setChromiumDisableWebSecurity(true);

// 번들링 설정
Config.overrideWebpackConfig((config) => {
  // Tailwind 활성화
  const withTailwind = enableTailwind(config);
  
  return {
    ...withTailwind,
    module: {
      ...withTailwind.module,
      rules: [
        ...(withTailwind.module?.rules ?? []),
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        // 폰트 파일 처리
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
        },
      ],
    },
    // 폰트 관련 모듈 해결
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...withTailwind.resolve?.alias,
        '@remotion/fonts': require.resolve('@remotion/fonts'),
      },
    },
  };
});

// Lambda 렌더링 설정
export const RENDER_CONFIG = {
  codec: 'h264' as const,
  imageFormat: 'jpeg' as const,
  jpegQuality: 80,
  audioCodec: 'aac' as const,
  videoBitrate: '4M',
  audioBitrate: '128k',
  frameRate: 30,
  chromiumOptions: {
    disableWebSecurity: true,
    gl: 'angle' as const, // GPU 렌더링 활성화 - 폰트 렌더링 개선
    args: [
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu', // Lambda 환경에서 GPU 비활성화
      '--font-render-hinting=none', // 폰트 렌더링 힌팅 비활성화
    ],
  },
  timeoutInMilliseconds: 900000, // 15분
  maxRetries: 3,
};

// S3 버킷 설정
export const S3_CONFIG = {
  bucketName: process.env.AWS_S3_BUCKET_NAME || 'voguedrop-renders',
  region: process.env.AWS_REGION || 'us-east-1',
  privacy: 'public' as const,
};

// Lambda 함수 설정
export const LAMBDA_CONFIG = {
  functionName: process.env.LAMBDA_FUNCTION_NAME || 'voguedrop-render',
  region: process.env.AWS_REGION || 'us-east-1',
  memorySizeInMb: 3008,
  diskSizeInMb: 2048,
  timeoutInSeconds: 900, // 15분
};