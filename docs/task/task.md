# LibraryModal 리팩토링 작업 계획

## 개요
VideoLibraryModal과 LibraryModal 컴포넌트의 90% 이상 중복 코드를 제거하고 공통 컴포넌트로 리팩토링

## 현재 상황 분석

### 공통 기능 (90% 동일)
- 데이터 페칭 로직 (`/api/canvas/library` 호출)
- 카테고리 관리 (clips, projects, uploads)
- 파일 업로드 처리 (썸네일 추출 포함)
- UI 레이아웃 구조
- 카드 렌더링 로직 (9:16 비율 고정, 레터박싱)
- 에러/로딩 상태 관리

### 핵심 차이점
1. **VideoLibraryModal (선택 모드)**
   - 다중 선택 기능 (최대 10개)
   - 선택 순서 표시
   - `onAddToTimeline` 콜백
   - 녹색 테마 (#38f47cf9)

2. **LibraryModal (뷰 모드)**
   - 즐겨찾기 토글
   - 날짜 필터링
   - 다운로드 기능
   - Primary 색상 테마

## 작업 목록

### 1. ✅ 새로운 library 폴더 구조 생성 및 타입 정의
- [x] `/components/modals/library/` 폴더 생성
- [x] `/types/library-modal.ts` 타입 정의 파일 생성
  - LibraryModalConfig 인터페이스
  - 모드별 설정 타입

### 2. ✅ 공통 훅 useLibraryData 생성
- [x] `/components/modals/library/hooks/useLibraryData.ts` 생성
- [x] 데이터 페칭 로직 추출
- [x] 에러 처리 및 로딩 상태 관리

### 3. ✅ 공통 컴포넌트 생성
- [x] `/components/modals/library/components/LibraryCard.tsx`
  - 클립/프로젝트/업로드 카드 통합
  - 선택/즐겨찾기/다운로드 기능 조건부 렌더링
- [x] `/components/modals/library/components/LibrarySidebar.tsx`
  - 카테고리 선택 UI
  - 날짜 필터 (조건부)
- [x] `/components/modals/library/components/LibraryUpload.tsx`
  - 파일 업로드 섹션
  - 진행률 표시
- [x] `/components/modals/library/utils/constants.ts`
  - CARD_CONTAINER_CLASS
  - getContentFitStyle 함수

### 4. ✅ LibraryModalBase 베이스 컴포넌트 생성
- [x] `/components/modals/library/LibraryModalBase.tsx` 생성
- [x] config 기반 조건부 렌더링
- [x] 선택/즐겨찾기 모드 통합

### 5. ✅ VideoLibraryModal을 래퍼 컴포넌트로 변경
- [x] 기존 코드를 28줄로 축소 (755줄 → 28줄, 96% 감소)
- [x] LibraryModalBase 사용
- [x] 선택 모드 config 전달

### 6. ✅ LibraryModal을 래퍼 컴포넌트로 변경
- [x] 기존 코드를 37줄로 축소 (810줄 → 37줄, 95% 감소)
- [x] LibraryModalBase 사용
- [x] 뷰 모드 config 전달

### 7. ✅ 테스트 및 빌드 확인
- [x] 타입 에러 확인 (`npm run build`) - ✅ 성공
- [x] ESLint 검사 (`npm run lint`) - ✅ No warnings or errors
- [ ] 기능 테스트 (수동 테스트 필요)
  - VideoLibraryModal: 선택 및 타임라인 추가
  - LibraryModal: 즐겨찾기 및 다운로드

## 예상 결과

### 코드 개선
- **중복 코드 감소**: 각 760줄 → 약 80줄로 축소
- **전체 코드량**: 1,520줄 → 약 500줄 (67% 감소)

### 품질 개선
- **일관성**: 두 모달의 UI와 동작 통일
- **유지보수성**: 한 곳에서 버그 수정 및 기능 개선
- **확장성**: 새로운 모드 추가 용이
- **테스트 용이성**: 공통 컴포넌트만 테스트


## 참고 사항
- 모든 카드는 9:16 비율로 고정 (CARD_CONTAINER_CLASS)
- 콘텐츠 비율에 따라 레터박싱 처리 (getContentFitStyle)
- extractVideoThumbnail 함수 활용하여 썸네일 생성
- TypeScript strict 모드 준수