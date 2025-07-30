# VogueDrop Product Requirements Document (PRD) - MVP

## Goals and Background Context

### Goals (MVP)
- 패션 크리에이터들이 이미지 하나로 AI 패션 영상을 생성할 수 있는 MVP 플랫폼 출시
- 사용자 인증을 통해 개인별 생성 히스토리 저장 및 관리 기능 제공
- 기본적인 영상 편집 기능으로 생성된 영상을 즉시 활용 가능하게 함
- 2주 내 출시 가능한 핵심 기능에만 집중하여 빠른 시장 검증

### Background Context
패션 콘텐츠 크리에이터들은 고품질의 영상 콘텐츠를 제작하기 위해 많은 시간과 비용을 투자해야 합니다. VogueDrop MVP는 AI 기술을 활용하여 이미지 하나로 패션 영상을 생성하고, 기본적인 편집을 통해 즉시 사용 가능한 콘텐츠를 만들 수 있는 최소 기능 제품입니다.

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-01-30 | 1.0 | Initial MVP PRD creation | BMad Master |

## Requirements

### Functional (MVP)
- FR1: 사용자는 이메일/비밀번호로 계정을 생성하고 로그인할 수 있어야 한다
- FR2: 사용자는 이미지를 업로드하고 AI를 통해 패션 영상을 생성할 수 있어야 한다
- FR3: 사용자는 효과, 카메라, 모델 타입을 선택하여 영상을 커스터마이징할 수 있어야 한다
- FR4: 로그인한 사용자의 모든 생성물은 자동으로 히스토리에 저장되어야 한다
- FR5: 사용자는 히스토리에서 과거 생성물을 보고 다운로드할 수 있어야 한다
- FR6: 사용자는 Video Editor에서 영상을 추가하고 길이를 조절할 수 있어야 한다
- FR7: 사용자는 Video Editor에서 텍스트를 추가할 수 있어야 한다
- FR8: 사용자는 Video Editor에서 음악을 추가할 수 있어야 한다
- FR9: 사용자는 편집한 영상을 MP4로 내보낼 수 있어야 한다

### Non Functional (MVP)
- NFR1: 영상 생성은 60초 이내에 완료되어야 한다
- NFR2: 플랫폼은 데스크톱에서 원활히 작동해야 한다 (모바일은 추후 지원)
- NFR3: 최소 10명의 동시 사용자를 지원해야 한다
- NFR4: 사용자 인증 정보는 안전하게 관리되어야 한다

## User Interface Design Goals (MVP)

### Overall UX Vision
직관적이고 단순한 인터페이스로 AI 영상 생성부터 기본 편집까지 5분 내에 완료할 수 있는 워크플로우 제공

### Core Screens (MVP)
- Login/Signup Page
- Canvas AI Studio (AI 영상 생성)
- My History (생성물 히스토리)
- Video Editor (기본 편집)

### Target Device: Desktop First
- Chrome, Safari, Firefox, Edge 최신 버전 지원
- 최소 해상도: 1280x720

## Technical Assumptions (MVP)

### Repository Structure: Monorepo

### Service Architecture
- **Frontend**: Next.js 14+ (App Router)
- **Backend**: Next.js API Routes
- **Authentication**: Supabase Auth (이메일/비밀번호)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI Integration**: fal.ai API
- **Deployment**: Vercel

### Testing Requirements (MVP)
- Manual Testing: 핵심 사용자 시나리오 테스트
- Basic Unit Tests: 핵심 함수만

## Epic List (MVP - 2주)

### Epic 1: Foundation & Authentication (3일)
프로젝트 설정, 로그인/회원가입, 기본 레이아웃

### Epic 2: Canvas AI Studio (5일)
이미지 업로드, 효과 선택, AI 영상 생성, 히스토리 저장

### Epic 3: User History (2일)
생성물 목록 보기, 다운로드

### Epic 4: Basic Video Editor (4일)
영상 추가/길이조절, 텍스트 추가, 음악 추가, MP4 내보내기

## Epic Details

### Epic 1: Foundation & Authentication
**Goal**: 사용자가 계정을 만들고 로그인하여 개인화된 서비스를 이용할 수 있도록 기반 구축

#### Story 1.1: Project Setup
As a developer,
I want to set up the Next.js project with all necessary dependencies,
so that we have a solid foundation for development.

**Acceptance Criteria:**
1: Next.js 14+ project initialized with TypeScript
2: Supabase client configured with environment variables
3: Basic folder structure established (app, components, lib, types)
4: ESLint and Prettier configured
5: Development server running successfully on localhost:3000

#### Story 1.2: Authentication UI
As a user,
I want to sign up and log in with email/password,
so that I can save my work.

**Acceptance Criteria:**
1: Login page with email/password fields
2: Signup page with email/password/confirm password fields
3: Form validation (email format, password strength)
4: Error messages for invalid inputs
5: Loading states during authentication

#### Story 1.3: Authentication Integration
As a user,
I want my authentication to be secure and persistent,
so that I don't have to log in repeatedly.

**Acceptance Criteria:**
1: Supabase Auth integrated for signup/login
2: Session management with cookies
3: Protected routes redirect to login
4: User profile stored in database
5: Logout functionality

#### Story 1.4: Basic Layout & Navigation
As a user,
I want consistent navigation throughout the app,
so that I can easily access different features.

**Acceptance Criteria:**
1: Header with logo and navigation menu
2: User menu with profile and logout options
3: Responsive layout structure
4: Protected and public route handling
5: Loading states for page transitions

### Epic 2: Canvas AI Studio
**Goal**: 사용자가 이미지를 업로드하고 AI를 통해 패션 영상을 생성할 수 있는 핵심 기능 구현

#### Story 2.1: Image Upload
As a user,
I want to upload an image for AI video generation,
so that I can create fashion videos from my photos.

**Acceptance Criteria:**
1: Drag-and-drop image upload area
2: File type validation (jpg, png, webp)
3: File size limit (5MB)
4: Image preview after upload
5: Upload progress indicator

#### Story 2.2: Effect Selection UI
As a user,
I want to select effects, camera angles, and model types,
so that I can customize my AI video.

**Acceptance Criteria:**
1: Effect category buttons (Effect, Camera, Model)
2: Visual selection grid for each category
3: Selected effects highlighted
4: Maximum 4 selections enforced
5: Clear selection button

#### Story 2.3: AI Video Generation
As a user,
I want to generate AI videos with my selected options,
so that I can create fashion content.

**Acceptance Criteria:**
1: Generate button triggers API call
2: Loading animation during generation
3: Success/error message display
4: Generated video displayed in preview
5: Video saved to user history

#### Story 2.4: Video Preview & Download
As a user,
I want to preview and download generated videos,
so that I can use them in my projects.

**Acceptance Criteria:**
1: Video player with play/pause controls
2: Full-screen preview option
3: Download button for MP4 format
4: Share link generation
5: Add to editor button

### Epic 3: User History
**Goal**: 사용자가 자신이 생성한 모든 영상을 관리하고 다시 접근할 수 있도록 함

#### Story 3.1: History Page
As a user,
I want to see all my generated videos in one place,
so that I can manage my content.

**Acceptance Criteria:**
1: Grid view of all generated videos
2: Thumbnail preview for each video
3: Generation date and settings displayed
4: Pagination for large lists
5: Empty state for new users

#### Story 3.2: History Actions
As a user,
I want to interact with my video history,
so that I can reuse and manage my content.

**Acceptance Criteria:**
1: Download video from history
2: Delete video with confirmation
3: View generation settings used
4: Open in editor functionality
5: Bulk selection for actions

### Epic 4: Basic Video Editor
**Goal**: 사용자가 생성된 영상을 기본적으로 편집하여 완성된 콘텐츠를 만들 수 있도록 함

#### Story 4.1: Video Timeline
As a user,
I want to add videos to a timeline and adjust their length,
so that I can create edited sequences.

**Acceptance Criteria:**
1: Drag videos to timeline
2: Trim video start/end points
3: Rearrange video order
4: Timeline zoom controls
5: Preview timeline playback

#### Story 4.2: Text Overlay
As a user,
I want to add text to my videos,
so that I can include titles and captions.

**Acceptance Criteria:**
1: Add text button creates text layer
2: Edit text content inline
3: Choose font, size, color
4: Position text on video
5: Set text duration on timeline

#### Story 4.3: Music Addition
As a user,
I want to add background music to my video,
so that it's more engaging.

**Acceptance Criteria:**
1: Music library with free tracks
2: Upload custom audio file
3: Adjust music volume
4: Trim music to video length
5: Preview with music

#### Story 4.4: Export Video
As a user,
I want to export my edited video,
so that I can share it on social media.

**Acceptance Criteria:**
1: Export button renders final video
2: Progress bar during export
3: MP4 format output
4: Quality settings (720p/1080p)
5: Download completed video

## Next Steps

### MVP Development Priority
1. Start with Epic 1 (Foundation) - 필수 기반
2. Epic 2 (Canvas AI) - 핵심 차별화 기능
3. Epic 3 (History) - 사용자 가치 제공
4. Epic 4 (Editor) - 완성도 있는 제품

### Post-MVP Considerations
- 소셜 로그인 추가
- 고급 편집 기능
- 모바일 지원
- 팀 협업 기능
- 유료 플랜