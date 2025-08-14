# AWS Lambda 배포 가이드

## 사전 준비사항

1. AWS CLI 설치 및 설정
```bash
aws configure
# AWS Access Key ID 입력
# AWS Secret Access Key 입력
# Default region: us-east-1 (또는 원하는 region)
# Default output format: json
```

2. 필요한 패키지 설치
```bash
npm install
```

## Lambda 함수 배포 단계

### 1. Remotion Lambda 초기 설정

```bash
# Lambda 함수 배포 (처음 한 번만)
npx remotion lambda functions deploy
```

### 2. Remotion 사이트 배포

```bash
# Remotion 번들을 S3에 업로드
npm run remotion:lambda:sites

# 또는 직접 명령어 실행
npx remotion lambda sites create src/remotion/index.ts --site-name=voguedrop
```

이 명령어는 S3에 Remotion 번들을 업로드하고 URL을 반환합니다.
반환된 URL을 `REMOTION_SERVE_URL` 환경변수에 저장하세요.

### 3. Lambda 함수 코드 업데이트

1. Lambda 함수 코드 압축:
```bash
cd lambda
zip -r render-function.zip render.ts node_modules
```

2. AWS Console에서 Lambda 함수 업데이트:
   - Lambda 콘솔 접속
   - 함수 선택
   - 코드 소스 섹션에서 .zip 파일 업로드

### 4. 환경 변수 설정

Lambda 함수에 다음 환경변수 설정:

```
REMOTION_SERVE_URL=https://remotionlambda-xxx.s3.amazonaws.com/sites/voguedrop/index.html
AWS_S3_BUCKET_NAME=voguedrop-renders
AWS_REGION=us-east-1
LAMBDA_FUNCTION_NAME=voguedrop-render
```

### 5. API Gateway 설정 (선택사항)

Lambda 함수를 HTTP 엔드포인트로 노출하려면:

1. API Gateway 생성
2. POST /render 엔드포인트 생성
3. Lambda 함수와 통합
4. API 키 설정 (선택사항)
5. 배포

### 6. IAM 역할 설정

Lambda 함수에 필요한 권한:
- S3 읽기/쓰기 권한
- CloudWatch 로그 권한
- Lambda 실행 권한

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::voguedrop-renders/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### 7. S3 버킷 설정

```bash
# 버킷 생성
aws s3 mb s3://voguedrop-renders

# 공개 읽기 권한 설정 (필요한 경우)
aws s3api put-bucket-acl --bucket voguedrop-renders --acl public-read
```

## 테스트

1. Lambda 콘솔에서 테스트 이벤트 생성:
```json
{
  "videoClips": [...],
  "textClips": [...],
  "soundClips": [...],
  "aspectRatio": "9:16",
  "durationInFrames": 900,
  "userId": "test",
  "projectId": "test-project"
}
```

2. 테스트 실행 및 결과 확인

## 모니터링

- CloudWatch 로그에서 실행 로그 확인
- Lambda 메트릭에서 성능 모니터링
- S3 버킷에서 생성된 비디오 확인

## 문제 해결

### 타임아웃 에러
- Lambda 함수 타임아웃을 15분으로 설정
- 메모리를 3008MB로 증가

### 권한 에러
- IAM 역할 권한 확인
- S3 버킷 정책 확인

### 렌더링 실패
- CloudWatch 로그 확인
- Remotion 서브 URL 유효성 확인
- 입력 데이터 형식 확인