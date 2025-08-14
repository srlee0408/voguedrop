#!/bin/bash

# Lambda 함수에 모든 AWS 서비스가 호출할 수 있도록 권한 추가
echo "Lambda 함수에 권한 추가 중..."

aws lambda add-permission \
  --function-name remotion-render-4-0-332-mem2048mb-disk2048mb-900sec \
  --statement-id AllowAllAWSServices \
  --action lambda:InvokeFunction \
  --principal "*" \
  --region us-east-1

echo "권한 추가 완료!"
echo ""
echo "Lambda 함수 정책 확인:"
aws lambda get-policy \
  --function-name remotion-render-4-0-332-mem2048mb-disk2048mb-900sec \
  --region us-east-1 | jq '.Policy' | jq '.'