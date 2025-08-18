import { Config } from '@remotion/cli/config';

// Remotion 설정
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// 번들링 설정
Config.overrideWebpackConfig((config) => {
  return {
    ...config,
    module: {
      ...config.module,
      rules: [
        ...(config.module?.rules ?? []),
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
      ],
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