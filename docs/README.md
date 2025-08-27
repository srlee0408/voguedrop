# VogueDrop 문서 가이드

VogueDrop 프로젝트의 모든 문서를 체계적으로 정리한 가이드입니다.

## 📚 주요 문서

### 🏗️ 아키텍처 및 설계
- **[architecture-guide.md](./architecture-guide.md)** - 전체 시스템 아키텍처 (프론트엔드 + 백엔드 통합)
- **[canvas.md](./canvas.md)** - Canvas 시스템 상세 가이드
- **[video-editor.md](./video-editor.md)** - Video Editor 상세 가이드

### 🚀 배포 및 운영
- **[deployment-guide.md](./deployment-guide.md)** - 통합 배포 가이드 (AWS, Supabase, Vercel)
- **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)** - 프로젝트 개발 가이드
- **[caching-performance-guide.md](./caching-performance-guide.md)** - 캐싱 및 성능 최적화

### 🔧 기술별 가이드
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Supabase 초기 설정
- **[STORAGE_BUCKET_SETUP.md](./STORAGE_BUCKET_SETUP.md)** - 스토리지 버킷 설정
- **[RLS_POLICIES.md](./RLS_POLICIES.md)** - Row Level Security 정책
- **[user-upload-setup-guide.md](./user-upload-setup-guide.md)** - 사용자 업로드 설정
- **[image-brush-environment.md](./image-brush-environment.md)** - Image Brush 환경 설정

### 📋 기획 및 명세
- **[prd.md](./prd.md)** - 제품 요구사항 문서
- **[project-brief.md](./project-brief.md)** - 프로젝트 개요
- **[ui-ux-spec.md](./ui-ux-spec.md)** - UI/UX 명세서
- **[modal-design-system.md](./modal-design-system.md)** - 모달 디자인 시스템

### 🐛 문제 해결
- **[timeline-resize-width-zero-bug.md](./timeline-resize-width-zero-bug.md)** - 타임라인 리사이즈 버그
- **[video-editor-overlay-troubleshooting.md](./video-editor-overlay-troubleshooting.md)** - 비디오 에디터 오버레이 문제

### 📁 세부 기능 가이드

#### Canvas 관련
- **[functional-breakdown/canvas/](./functional-breakdown/canvas/)** - Canvas 기능 분해
- **[feature-guides/canvas/](./feature-guides/canvas/)** - Canvas 기능 가이드

#### Video Editor 관련
- **[functional-breakdown/video-editor/](./functional-breakdown/video-editor/)** - Video Editor 기능 분해
- **[feature-guides/video-editor/](./feature-guides/video-editor/)** - Video Editor 기능 가이드

#### Image Brush 관련
- **[functional-breakdown/image-brush/](./functional-breakdown/image-brush/)** - Image Brush 기능 분해
- **[feature-guides/image-brush/](./feature-guides/image-brush/)** - Image Brush 기능 가이드

#### 기타 기능
- **[feature-guides/gallery/](./feature-guides/gallery/)** - 갤러리 기능 가이드
- **[feature-guides/authentication/](./feature-guides/authentication/)** - 인증 기능 가이드
- **[feature-guides/project-management/](./feature-guides/project-management/)** - 프로젝트 관리 가이드

### 📊 데이터 및 스토리지
- **[storage-structure.md](./storage-structure.md)** - 스토리지 구조
- **[functional-breakdown/data-and-caching/](./functional-breakdown/data-and-caching/)** - 데이터 및 캐싱

### 🔬 연구 및 학습
- **[learn/study.md](./learn/study.md)** - 학습 자료
- **[features/](./features/)** - 기능별 상세 문서

### 📝 작업 관리
- **[task/](./task/)** - 작업 관리 문서

## 📖 문서 사용법

### 새로운 개발자를 위한 시작 가이드

1. **프로젝트 이해**: [project-brief.md](./project-brief.md) → [prd.md](./prd.md)
2. **아키텍처 파악**: [architecture-guide.md](./architecture-guide.md)
3. **개발 환경 설정**: [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) → [deployment-guide.md](./deployment-guide.md)
4. **기능별 상세 학습**: [canvas.md](./canvas.md), [video-editor.md](./video-editor.md)

### 기능 개발 시 참고 순서

1. **해당 기능 가이드** 확인 (canvas.md, video-editor.md 등)
2. **아키텍처 가이드**에서 전체 구조 파악
3. **functional-breakdown** 폴더에서 상세 기능 분해 확인
4. **feature-guides** 폴더에서 구현 가이드 확인

### 배포 및 운영 시 참고

1. **[deployment-guide.md](./deployment-guide.md)** - 전체 배포 프로세스
2. **[caching-performance-guide.md](./caching-performance-guide.md)** - 성능 최적화
3. 문제 발생 시 해당 troubleshooting 문서 참조

## 🔄 문서 업데이트 이력

### v2.0.0 (2024-12-14)
- **중복 문서 통합**: 배포 관련 4개 문서를 `deployment-guide.md`로 통합
- **아키텍처 통합**: 프론트엔드/풀스택 아키텍처를 `architecture-guide.md`로 통합
- **참조 링크 정리**: 각 문서 간 상호 참조 링크 추가
- **구조 최적화**: 중복 제거 및 문서 계층 구조 개선

### v1.0.0 (2024-01-30)
- 초기 문서 구조 생성
- 기능별 문서 분리
- 아키텍처 문서 작성

## 📞 문서 관련 문의

문서 내용에 대한 질문이나 개선 제안이 있으시면:
1. 해당 문서의 이슈 생성
2. 문서 수정 후 PR 제출
3. 개발팀에 직접 문의

---

**마지막 업데이트**: 2024-12-14  
**문서 버전**: v2.0.0
