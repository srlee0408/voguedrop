# 디자인 파일 작성 규칙

1.  **Component**: 재사용되는 모든 UI 요소는 컴포넌트로 분리하고, 기능/역할별로 분류하여 관리하세요.
2.  **Responsive**: 주요 기기(Mobile, Tablet, Desktop)의 Breakpoint를 정의하고, 그에 맞춘 반응형 레이아웃을 설계하세요.
3.  **Theme**: 정의된 디자인 토큰(Color, Typography, Spacing 등)을 모든 디자인에 일관되게 적용하세요.
4.  **Page**: 페이지는 중앙 라이브러리의 컴포넌트들을 조합하여 구성하세요.
5.  **Content**: UI 텍스트는 디자인과 분리하여 관리하고, 텍스트 길이가 변해도 UI가 깨지지 않도록 설계하세요.
6.  **Component-Based**: 모든 디자인과 개발은 재사용 가능한 '컴포넌트' 단위로 사고하고 실행합니다.
7.  **Consistency**: 정의된 디자인 시스템을 통해 사용자에게 일관된 브랜드 경험을 제공합니다.
8.  **Clear Communication**: 명확하게 정의된 컴포넌트와 규칙을 '공통 언어'로 사용하여 소통 오류를 최소화합니다.

## BMad-Method 개발 워크플로우

이 프로젝트는 BMad-Method를 따라 개발됩니다. 크게 **계획**과 **개발** 두 단계로 진행됩니다.

### 1단계: 계획 (Web UI 권장)
아이디어를 구체적인 설계도로 만드는 과정입니다.

- **분석 및 기획**: `/BMad:agents:analyst`와 `/BMad:agents:pm`이 시장 조사, PRD 작성
- **설계**: `/BMad:agents:architect`와 `/BMad:agents:ux-expert`가 시스템 아키텍처와 UI/UX 설계
- **검증**: `/BMad:agents:po`가 모든 문서의 일관성과 완전성 검증

### 2단계: 개발 (IDE 필수)
계획 단계에서 완성된 문서들을 실제 코드로 구현하는 과정입니다.

#### 문서 분할 (Sharding)
- `/BMad:agents:po` 또는 `/BMad:agents:bmad-master`가 큰 문서를 개발 가능한 작은 단위로 분할
- 주요 대상: `docs/prd.md`, `docs/fullstack-architecture.md`

#### 핵심 개발 루프
1. **스토리 생성**: `/BMad:agents:sm`이 다음 개발 작업에 대한 사용자 스토리 생성
2. **구현**: `/BMad:agents:dev`가 승인된 스토리를 받아 코드 구현 및 테스트 작성
3. **검토**: `/BMad:agents:qa`가 구현된 코드 검토 및 리팩토링

### BMad 에이전트 역할

#### 계획 단계 에이전트
- **analyst**: 시장 조사, 경쟁사 분석, 사용자 니즈 파악
- **pm**: 제품 요구사항 정의서(PRD) 작성
- **architect**: 시스템 아키텍처 설계, 기술 스택 결정
- **ux-expert**: UI/UX 설계, 와이어프레임 작성
- **po**: 문서 검증, 일관성 확인, 스토리 분할

#### 개발 단계 에이전트
- **sm**: 스크럼 마스터, 스토리 생성 및 작업 계획
- **dev**: 개발자, 코드 구현 및 단위 테스트 작성
- **qa**: 품질 보증, 코드 리뷰 및 리팩토링

#### 오케스트레이션 에이전트
- **bmad-master**: 전체 프로세스 관리 및 조율
- **bmad-orchestrator**: 에이전트 간 작업 조정

### 에이전트 자기소개 규칙

각 BMad 에이전트는 작업을 시작할 때 반드시 자신을 소개해야 합니다:

1. **에이전트 이름과 역할** 명시
2. **현재 수행할 작업** 설명
3. **사용 가능한 명령어** 안내 (필요시)

예시:
```
안녕하세요! 저는 James, Full Stack Developer입니다. 💻
지금부터 Story 1.1의 구현을 진행하겠습니다.

사용 가능한 명령어:
- *help: 사용 가능한 명령어 보기
- *run-tests: 테스트 실행
- *explain: 방금 수행한 작업 설명
- *exit: 개발자 모드 종료
```

### 사용 예시
```bash
# 계획 단계
/BMad:agents:analyst    # 시장 조사 시작
/BMad:agents:pm         # PRD 작성
/BMad:agents:architect  # 아키텍처 설계
/BMad:agents:ux-expert  # UI/UX 설계

# 개발 단계
/BMad:agents:po         # 문서 분할 및 검증
/BMad:agents:sm         # 스토리 생성
/BMad:agents:dev        # 코드 구현
/BMad:agents:qa         # 코드 검토
```

### 주요 작업(Tasks) 참조
- `create-next-story.md`: 다음 개발 스토리 생성
- `shard-doc.md`: 큰 문서를 작은 단위로 분할
- `review-story.md`: 스토리 검토
- `execute-checklist.md`: 체크리스트 실행
- `validate-next-story.md`: 스토리 유효성 검증

각 에이전트와 작업에 대한 상세 내용은 `.claude/commands/BMad/` 디렉토리를 참조하세요.

### 스토리 완료 후 PR 워크플로우

각 스토리가 완료된 후 다음 단계를 따릅니다:

#### 1. QA 검토
```bash
/BMad:agents:qa    # QA 에이전트가 코드 품질 검토 및 리팩토링
```

#### 2. PR 생성 및 제출
```bash
# 변경사항 확인
git status
git diff

# 브랜치 생성 (main에서)
git checkout -b feat/story-{번호}-{간단한-설명}

# 커밋 생성
git add .
git commit -m "feat: Story {번호} - {스토리 제목}

- {주요 변경사항 1}
- {주요 변경사항 2}
- {주요 변경사항 3}

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# 원격 저장소에 푸시
git push -u origin feat/story-{번호}-{간단한-설명}

# GitHub CLI를 사용한 PR 생성
gh pr create --title "feat: Story {번호} - {스토리 제목}" \
  --body "## Summary
- {구현한 주요 기능 요약}

## Story Reference
- Story: docs/stories/{번호}.story.md
- Acceptance Criteria: {충족된 AC 목록}

## Test plan
- [ ] {테스트 항목 1}
- [ ] {테스트 항목 2}
- [ ] {테스트 항목 3}

## Screenshots (if applicable)
{UI 변경사항이 있는 경우 스크린샷 추가}

🤖 Generated with Claude Code"
```

#### 3. PR 머지 후 다음 스토리
- PR이 승인되고 머지되면 main 브랜치로 체크아웃
- 최신 변경사항 pull
- 다음 스토리 작업 시작

```bash
git checkout main
git pull origin main
/BMad:agents:sm    # 다음 스토리 생성
```