# 비디오 렌더링 시스템 완벽 가이드 (초보자용)

## 📌 개요
이 가이드는 AWS Lambda와 Remotion을 사용하여 비디오를 MP4로 렌더링하는 시스템을 처음부터 끝까지 설정하는 방법을 설명합니다.

## 🎯 시스템 아키텍처
```
사용자 → Next.js 앱 → API Route → AWS Lambda → Remotion 렌더링 → S3 저장 → MP4 다운로드
```

---

## 📦 Part 1: 로컬 환경 설정

### 1.1 필요한 패키지 설치

프로젝트 루트에서 실행:
```bash
npm install
```

설치가 완료되면 다음 패키지들이 추가됩니다:
- `@remotion/cli` - Remotion 명령줄 도구
- `@remotion/lambda` - Lambda 렌더링 지원
- `@remotion/bundler` - 비디오 번들링
- `@remotion/renderer` - 비디오 렌더링 엔진
- `@aws-sdk/client-s3` - AWS S3 클라이언트

### 1.2 Remotion Studio에서 테스트

먼저 로컬에서 비디오가 제대로 렌더링되는지 확인합니다:

```bash
# Remotion Studio 실행
npm run remotion:studio
```

브라우저가 열리면:
1. 왼쪽 메뉴에서 `video-mobile`, `video-square`, `video-wide` 중 하나 선택
2. 우측 Props 패널에서 테스트 데이터 입력
3. 재생 버튼으로 미리보기 확인

### 1.3 로컬 렌더링 테스트

```bash
# 테스트 비디오 렌더링 (output.mp4 파일 생성)
npx remotion render src/remotion/index.ts video-mobile output.mp4
```

성공하면 `output.mp4` 파일이 생성됩니다.

---

## 🔧 Part 2: AWS 계정 설정

### 2.1 AWS 계정 생성

1. [AWS 콘솔](https://aws.amazon.com) 접속
2. 계정이 없다면 "Create an AWS Account" 클릭
3. 이메일, 비밀번호, 계정 이름 입력
4. 신용카드 정보 입력 (무료 티어 사용 가능)

### 2.2 IAM 사용자 생성 (보안을 위해 필수)

1. AWS 콘솔에서 **IAM** 서비스 검색
2. 좌측 메뉴에서 **Users** → **Add users** 클릭
3. 사용자 이름: `voguedrop-lambda-user`
4. **Attach policies directly** 선택하고 다음 정책 추가:
   - `AWSLambda_FullAccess`
   - `AmazonS3FullAccess`
   - `CloudWatchLogsFullAccess`
5. **Create user** 클릭

### 2.3 Access Key 생성

1. 생성한 사용자 클릭
2. **Security credentials** 탭
3. **Create access key** 클릭
4. **Command Line Interface (CLI)** 선택
5. Access Key ID와 Secret Access Key 저장 (⚠️ 한 번만 표시됨!)

### 2.4 AWS CLI 설치 및 설정

macOS:
```bash
# Homebrew 사용
brew install awscli

# 또는 공식 설치 프로그램 다운로드
# https://aws.amazon.com/cli/
```

Windows:
```bash
# 공식 설치 프로그램 다운로드
# https://aws.amazon.com/cli/
```

설정:
```bash
aws configure

# 입력할 내용:
AWS Access Key ID [None]: (위에서 받은 Access Key ID)
AWS Secret Access Key [None]: (위에서 받은 Secret Access Key)
Default region name [None]: us-east-1
Default output format [None]: json
```

---

## 🚀 Part 3: AWS 리소스 생성

### 3.1 S3 버킷 생성 (비디오 저장소)

```bash
# 버킷 생성 (이름은 전세계적으로 유일해야 함)
aws s3 mb s3://voguedrop-renders-{your-unique-id}

# 예시:
aws s3 mb s3://voguedrop-renders-20241214
```

버킷 공개 설정 (다운로드 가능하게):
```bash
# 버킷 정책 파일 생성
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::voguedrop-renders-{your-unique-id}/*"
    }
  ]
}
EOF

# 정책 적용
aws s3api put-bucket-policy --bucket voguedrop-renders-{your-unique-id} --policy file://bucket-policy.json
```

### 3.2 Lambda 함수용 IAM 역할 생성

```bash
# 신뢰 정책 파일 생성
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# 역할 생성
aws iam create-role \
  --role-name voguedrop-lambda-role \
  --assume-role-policy-document file://trust-policy.json

# 필요한 정책 연결
aws iam attach-role-policy \
  --role-name voguedrop-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
  --role-name voguedrop-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

---

## 💻 Part 4: Remotion Lambda 배포

### 4.1 Remotion Lambda 함수 배포

```bash
# Remotion이 제공하는 Lambda 함수 자동 배포
npx remotion lambda functions deploy
```

이 명령어가 하는 일:
- Lambda 함수 생성
- 필요한 권한 설정
- Chrome 브라우저 레이어 추가

성공하면 다음과 같은 메시지가 나타납니다:
```
✅ Deployed function "remotion-render-{region}"
```

### 4.2 Remotion 사이트 배포

```bash
# Remotion 번들을 S3에 업로드
npx remotion lambda sites create src/remotion/index.ts --site-name=voguedrop
```

성공하면 URL이 출력됩니다:
```
✅ Site uploaded to: https://remotionlambda-{id}.s3.amazonaws.com/sites/voguedrop/index.html
```

⚠️ **이 URL을 복사해서 저장하세요!**

---

## 🔐 Part 5: 환경 변수 설정

### 5.1 로컬 환경 변수 (.env.local)

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# Supabase (기존 설정)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# AWS Lambda 설정
LAMBDA_RENDER_ENDPOINT=local
REMOTION_SERVE_URL=https://remotionlambda-{id}.s3.amazonaws.com/sites/voguedrop/index.html
AWS_S3_BUCKET_NAME=voguedrop-renders-{your-unique-id}
AWS_REGION=us-east-1
LAMBDA_FUNCTION_NAME=remotion-render-us-east-1

# AWS 자격 증명 (선택사항 - aws configure로 설정했다면 불필요)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 5.2 로컬 테스트용 API Route 수정

`app/api/video/render/route.ts` 파일을 수정하여 로컬 테스트를 지원하도록 합니다:

```typescript
// 파일 상단에 추가
import { renderMedia } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import path from 'path';

// POST 함수 내부 수정
if (process.env.LAMBDA_RENDER_ENDPOINT === 'local') {
  // 로컬 렌더링 (개발용)
  const bundleLocation = await bundle({
    entryPoint: path.join(process.cwd(), 'src/remotion/index.ts'),
    webpackOverride: (config) => config,
  });

  const outputPath = path.join(process.cwd(), `output-${Date.now()}.mp4`);
  
  await renderMedia({
    composition: getCompositionId(aspectRatio),
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: {
      videoClips,
      textClips,
      soundClips,
    },
  });

  // 로컬 파일 URL 반환
  return NextResponse.json({
    success: true,
    url: `/api/video/download?file=${path.basename(outputPath)}`,
    renderId: 'local',
  });
} else {
  // 기존 Lambda 코드...
}
```

---

## 🧪 Part 6: 테스트

### 6.1 로컬 테스트

1. 개발 서버 시작:
```bash
npm run dev
```

2. 브라우저에서 `http://localhost:3000/video-editor` 접속

3. 비디오 클립 추가하고 Download 버튼 클릭

4. 콘솔에서 에러 확인:
```bash
# 브라우저 개발자 도구 (F12) → Console 탭
# 터미널의 Next.js 로그
```

### 6.2 Lambda 테스트

AWS 콘솔에서:
1. Lambda 서비스로 이동
2. `remotion-render-us-east-1` 함수 선택
3. **Test** 탭 클릭
4. 테스트 이벤트 생성:

```json
{
  "videoClips": [
    {
      "id": "test-1",
      "url": "https://example.com/video.mp4",
      "duration": 300,
      "position": 0
    }
  ],
  "textClips": [],
  "soundClips": [],
  "aspectRatio": "9:16",
  "durationInFrames": 300
}
```

5. **Test** 버튼 클릭

---

## 🌐 Part 7: 프로덕션 배포

### 7.1 API Gateway 설정 (Lambda를 HTTP로 접근)

1. AWS 콘솔에서 **API Gateway** 서비스 검색
2. **Create API** → **REST API** → **Build**
3. API 이름: `voguedrop-api`
4. **Create API** 클릭

5. 리소스 생성:
   - **Actions** → **Create Resource**
   - Resource Name: `render`
   - **Create Resource** 클릭

6. 메서드 생성:
   - `render` 선택 → **Actions** → **Create Method** → **POST**
   - Integration type: **Lambda Function**
   - Lambda Function: `remotion-render-us-east-1`
   - **Save** 클릭

7. 배포:
   - **Actions** → **Deploy API**
   - Stage name: `prod`
   - **Deploy** 클릭

8. URL 복사:
   ```
   https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/render
   ```

### 7.2 Vercel 환경 변수 설정

Vercel 대시보드에서:
1. 프로젝트 설정 → Environment Variables
2. 다음 변수 추가:
   ```
   LAMBDA_RENDER_ENDPOINT=https://{api-id}.execute-api.us-east-1.amazonaws.com/prod/render
   REMOTION_SERVE_URL=https://remotionlambda-{id}.s3.amazonaws.com/sites/voguedrop/index.html
   AWS_S3_BUCKET_NAME=voguedrop-renders-{your-unique-id}
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   ```

3. **Save** 후 재배포

---

## 🐛 문제 해결

### 자주 발생하는 에러와 해결법

#### 1. "Access Denied" 에러
```bash
# IAM 역할 권한 확인
aws iam list-attached-role-policies --role-name voguedrop-lambda-role
```

#### 2. "Timeout" 에러
Lambda 함수 설정에서:
- Timeout: 15분 (900초)
- Memory: 3008 MB

#### 3. "CORS" 에러
API Gateway에서:
1. 리소스 선택 → **Actions** → **Enable CORS**
2. 모든 옵션 체크 → **Enable CORS**

#### 4. 렌더링이 너무 오래 걸림
- 비디오 길이 줄이기
- 해상도 낮추기 (1080p → 720p)
- Lambda 메모리 증가

### 로그 확인

```bash
# CloudWatch 로그 확인
aws logs tail /aws/lambda/remotion-render-us-east-1 --follow

# S3 버킷 내용 확인
aws s3 ls s3://voguedrop-renders-{your-unique-id}/
```

---

## 💰 비용 관리

### 예상 비용 (월 기준)
- Lambda: 1000개 렌더링 시 약 $5-10
- S3: 100GB 저장 시 약 $2.3
- API Gateway: 10,000 요청 시 약 $0.035

### 비용 절감 팁
1. 렌더링된 비디오 자동 삭제 설정
2. Lambda 메모리 최적화
3. 불필요한 리렌더링 방지

---

## 📚 추가 리소스

- [Remotion 공식 문서](https://www.remotion.dev/)
- [AWS Lambda 가이드](https://docs.aws.amazon.com/lambda/)
- [Remotion Lambda 문서](https://www.remotion.dev/docs/lambda)

## 🆘 도움이 필요하신가요?

각 단계에서 막히는 부분이 있다면:
1. 에러 메시지를 정확히 복사
2. 어느 단계에서 발생했는지 확인
3. CloudWatch 로그 확인
4. 환경 변수가 올바르게 설정되었는지 확인