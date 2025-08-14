# Vercel 배포 후 Lambda 권한 에러 해결 가이드

## 🔴 문제 상황
- **로컬 환경**: 정상 작동 ✅
- **Vercel 배포 후**: Lambda 권한 에러 발생 ❌

```
User: arn:aws:sts::367515020958:assumed-role/cloudwatch_logs_events_putter/...
is not authorized to perform: lambda:InvokeFunction
on resource: arn:aws:lambda:us-east-1:367515020958:function:remotion-render-4-0-332-mem2048mb-disk2048mb-900sec
```

## 🎯 해결 방법

### 1. Vercel 환경 변수 확인 및 설정

Vercel 대시보드에서 다음 환경 변수가 정확히 설정되어 있는지 확인:

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택 → Settings → Environment Variables

2. **필수 환경 변수 설정**
   ```bash
   # AWS 설정
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1
   
   # Lambda 설정
   LAMBDA_FUNCTION_NAME=remotion-render-4-0-332-mem2048mb-disk2048mb-900sec
   LAMBDA_RENDER_ENDPOINT=direct
   
   # S3 및 Remotion 설정
   AWS_S3_BUCKET_NAME=remotionlambda-useast1-54qz3bnxt2
   REMOTION_SERVE_URL=https://remotionlambda-useast1-54qz3bnxt2.s3.us-east-1.amazonaws.com/sites/voguedrop/index.html
   ```

3. **환경 변수 저장 후 재배포**
   - Save 버튼 클릭
   - Deployments 탭 → 최신 배포 선택 → Redeploy

### 2. AWS IAM 권한 설정

#### 방법 A: AWS 콘솔에서 직접 설정

1. **AWS 콘솔 로그인**
   - https://console.aws.amazon.com/

2. **IAM 사용자 권한 확인**
   - IAM → Users → 사용자 선택
   - Permissions 탭 → Add permissions → Attach policies directly

3. **필요한 정책 추가**
   - `AWSLambda_FullAccess`
   - `AmazonS3FullAccess`
   - 또는 아래 커스텀 정책 생성

#### 방법 B: AWS CLI로 권한 설정

1. **커스텀 정책 생성**
   ```bash
   # lambda-invoke-policy.json 파일이 이미 생성되어 있음
   
   # IAM 정책 생성
   aws iam create-policy \
     --policy-name VogueDropLambdaInvokePolicy \
     --policy-document file://lambda-invoke-policy.json
   ```

2. **정책 ARN 확인**
   ```bash
   # 생성된 정책 ARN 복사 (예: arn:aws:iam::367515020958:policy/VogueDropLambdaInvokePolicy)
   ```

3. **IAM 사용자에 정책 연결**
   ```bash
   # Vercel에서 사용하는 IAM 사용자에 정책 연결
   aws iam attach-user-policy \
     --user-name your-iam-user-name \
     --policy-arn arn:aws:iam::367515020958:policy/VogueDropLambdaInvokePolicy
   ```

### 3. Lambda 함수 권한 확인

```bash
# Lambda 함수 정책 확인
aws lambda get-policy \
  --function-name remotion-render-4-0-332-mem2048mb-disk2048mb-900sec \
  --region us-east-1

# 필요시 권한 추가
aws lambda add-permission \
  --function-name remotion-render-4-0-332-mem2048mb-disk2048mb-900sec \
  --statement-id AllowVercelInvoke \
  --action lambda:InvokeFunction \
  --principal "*" \
  --region us-east-1
```

### 4. Vercel Functions 설정 확인

`vercel.json` 파일 확인/생성:

```json
{
  "functions": {
    "app/api/video/render/route.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "AWS_LAMBDA_FUNCTION_TIMEOUT": "900"
  }
}
```

### 5. 디버깅을 위한 로그 추가

API route에 임시로 환경 변수 확인 코드 추가:

```typescript
// app/api/video/render/route.ts 상단에 추가
console.log('Environment check:', {
  hasAwsKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasAwsSecret: !!process.env.AWS_SECRET_ACCESS_KEY,
  functionName: process.env.LAMBDA_FUNCTION_NAME,
  region: process.env.AWS_REGION,
  serveUrl: process.env.REMOTION_SERVE_URL?.substring(0, 50) + '...'
});
```

## 🔍 확인 사항 체크리스트

- [ ] Vercel 환경 변수가 모두 설정되어 있는가?
- [ ] AWS Access Key가 올바른가?
- [ ] Lambda 함수 이름이 정확한가?
- [ ] IAM 사용자에 Lambda:InvokeFunction 권한이 있는가?
- [ ] S3 버킷에 접근 권한이 있는가?
- [ ] Vercel 재배포를 했는가?

## 📊 테스트 방법

1. **Vercel Functions 로그 확인**
   ```bash
   vercel logs --follow
   ```

2. **AWS CloudWatch 로그 확인**
   ```bash
   aws logs tail /aws/lambda/remotion-render-4-0-332-mem2048mb-disk2048mb-900sec --follow
   ```

3. **직접 Lambda 테스트**
   ```bash
   aws lambda invoke \
     --function-name remotion-render-4-0-332-mem2048mb-disk2048mb-900sec \
     --payload '{"test": true}' \
     response.json
   ```

## 🆘 추가 도움

문제가 계속되면 다음을 확인:
1. AWS 계정 ID가 367515020958이 맞는지 확인
2. us-east-1 리전이 올바른지 확인
3. Remotion Lambda 함수가 정상적으로 배포되었는지 확인

## 📝 참고사항

- Vercel은 서버리스 환경이므로 AWS Credentials를 환경 변수로 전달해야 함
- Lambda 함수 이름이 Remotion 버전에 따라 달라질 수 있음 (remotion-render-4-0-332-...)
- 권한 변경 후 즉시 적용되지 않을 수 있으므로 몇 분 기다려야 할 수 있음