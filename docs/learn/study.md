# 배운 것.
1. JSDoc 주석 작성
- 새로운 컨텍스트들의 역할과 관리하는 상태에 대해 JSDoc 주석 등을 추가
2. 파일 구조화
 - app/canvas/_components: Canvas 기능에서만 사용되는 컴포넌트
 - src/shared/components: 모든 기능에서 공통으로 사용하는 UI 컴포넌트
 - src/shared/hooks: 모든 기능에서 공통으로 사용하는 훅
 - src/shared/lib: 모든 기능에서 공통으로 사용하는 유틸리티 함수
 - src/shared/types: 모든 기능에서 공통으로 사용하는 타입 정의
 - src/shared/constants: 모든 기능에서 공통으로 사용하는 상수
 - src/shared/supabase: 모든 기능에서 공통으로 사용하는 Supabase 클라이언트
 - src/shared/auth: 모든 기능에서 공통으로 사용하는 인증 관련 함수

```
src/
  ├── shared/                    # 📦 전역 공유 자원
  │   ├── components/
  │   │   ├── ui/               # 기본 UI 컴포넌트
  │   │   ├── layout/           # 레이아웃 컴포넌트
  │   │   └── modals/           # 공유 모달
  │   ├── hooks/                # 전역 훅 (useTranslation)
  │   ├── lib/                  # 유틸리티 및 헬퍼
  │   │   ├── utils.ts          # cn() 함수
  │   │   ├── supabase/         # Supabase 클라이언트
  │   │   ├── auth/             # 인증 관련
  │   │   ├── canvas-storage.ts # 캔버스 스토리지
  │   │   └── session.ts        # 세션 관리
  │   ├── types/                # 전역 타입 정의
  │   └── constants/            # 전역 상수
  └── app/                      # 🎯 기능별 디렉토리
      ├── canvas/
      │   ├── _components/      # Canvas 전용 컴포넌트
      │   ├── _hooks/           # Canvas 전용 훅
      │   └── _context/         # Canvas 전용 컨텍스트
      └── video-editor/
          ├── _components/      # Video Editor 전용 컴포넌트
          └── _hooks/           # Video Editor 전용 훅
    ```