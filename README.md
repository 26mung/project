# 기획 도우미 - AI 기획 전문가 에이전트

AI 기반 기획 지원 도구로, 상위 기획안을 분석하여 세부 요건을 자동으로 도출하고 체크리스트 형태로 확인하여 최종 PRD 문서를 생성합니다.

## 프로젝트 개요

- **Name**: 기획 도우미 (Planning Assistant)
- **Goal**: AI를 활용한 자동화된 기획 요건 도출 및 PRD 문서 생성
- **Tech Stack**: Hono + Cloudflare Workers + D1 Database + OpenAI API

## 주요 기능

### ✅ 완료된 기능

1. **프로젝트 관리**
   - 프로젝트 생성, 조회, 수정, 삭제
   - 상위 기획안 입력 및 저장
   - 프로젝트 상태 추적 (draft, analyzing, in_progress, completed)

2. **AI 기획 분석**
   - OpenAI GPT를 활용한 상위 기획안 자동 분석
   - 기능적/비기능적 요건 자동 도출
   - 요건별 우선순위 자동 분류 (critical, high, medium, low)
   - 각 요건에 대한 확인 질문 자동 생성

3. **요건 관리**
   - 계층적 요건 구조 지원 (부모-자식 관계)
   - 요건별 질문-답변 관리
   - 답변 기반 파생 질문 자동 생성
   - 실시간 요건 상태 업데이트

4. **PRD 문서 생성**
   - 모든 요건과 답변을 종합한 완전한 PRD 자동 생성
   - Markdown 형식 지원
   - 개요, 핵심 가치, 기능 명세, 비기능 요건 등 구조화된 문서

5. **사용자 인터페이스**
   - 다크 테마 기반 현대적 UI
   - 사이드바 네비게이션
   - 탭 기반 콘텐츠 관리 (개요, 요건 관리, 정보구조도, PRD)
   - 모달 기반 상호작용

### 🚧 진행 예정 기능

1. **트리/마인드맵 시각화**
   - 요건 계층 구조 시각적 표현
   - D3.js 또는 Mermaid를 활용한 정보구조도

2. **PRD 다운로드**
   - PDF 형식 다운로드
   - Markdown 파일 다운로드

3. **협업 기능**
   - 팀 멤버 초대
   - 댓글 및 피드백

## URLs

- **Development**: https://3000-i76my0r62tqhuocuhyyd4-d0b9e1e2.sandbox.novita.ai
- **Production**: (배포 예정)

## API 엔드포인트

### 프로젝트 API
- `GET /api/projects` - 모든 프로젝트 조회
- `GET /api/projects/:id` - 프로젝트 상세 조회
- `POST /api/projects` - 프로젝트 생성
- `PUT /api/projects/:id` - 프로젝트 업데이트
- `DELETE /api/projects/:id` - 프로젝트 삭제
- `POST /api/projects/:id/analyze` - AI 분석 실행
- `POST /api/projects/:id/generate-prd` - PRD 생성
- `GET /api/projects/:id/prd` - PRD 조회

### 요건 API
- `GET /api/projects/:id/requirements` - 프로젝트의 모든 요건 조회
- `GET /api/requirements/:id` - 요건 상세 조회 (질문/답변 포함)
- `POST /api/requirements` - 요건 생성
- `PUT /api/requirements/:id` - 요건 업데이트
- `DELETE /api/requirements/:id` - 요건 삭제

### 질문/답변 API
- `POST /api/questions/:id/answer` - 질문에 답변하기 (자동으로 파생 질문 생성)

## 데이터 구조

### Projects (프로젝트)
```typescript
{
  id: number;
  title: string;
  description: string;
  input_content: string;  // 상위 기획안
  status: 'draft' | 'analyzing' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}
```

### Requirements (요건)
```typescript
{
  id: number;
  project_id: number;
  parent_id: number;  // 계층 구조 지원
  title: string;
  description: string;
  requirement_type: 'functional' | 'non_functional' | 'constraint';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  order_index: number;
}
```

### Questions (질문)
```typescript
{
  id: number;
  requirement_id: number;
  question_text: string;
  question_type: 'open' | 'choice' | 'boolean';
  options: string;  // JSON array (choice 타입일 경우)
  is_required: boolean;
  order_index: number;
}
```

### Answers (답변)
```typescript
{
  id: number;
  question_id: number;
  answer_text: string;
  created_at: string;
  updated_at: string;
}
```

## 스토리지 서비스

- **Cloudflare D1**: SQLite 기반 관계형 데이터베이스
  - Projects, Requirements, Questions, Answers, PRD Documents 테이블
  - 계층 구조 지원 (parent-child 관계)
  - 로컬 개발: `--local` 플래그로 로컬 SQLite 사용

## 사용 가이드

### 1. 새 프로젝트 생성
1. 좌측 사이드바에서 "새 프로젝트" 버튼 클릭
2. 프로젝트 제목, 설명 입력
3. 상위 기획안 입력 (AI가 분석할 내용)

### 2. AI 분석 실행
1. 프로젝트 개요 탭에서 "AI 분석 시작하기" 버튼 클릭
2. AI가 기획안을 분석하여 세부 요건과 질문을 자동 생성
3. 생성 완료 후 자동으로 "요건 관리" 탭으로 이동

### 3. 요건 확인 및 답변
1. "요건 관리" 탭에서 각 요건 카드 확인
2. "상세" 버튼 클릭하여 질문 확인
3. 각 질문에 답변 입력 및 저장
4. 답변에 따라 추가 파생 질문이 자동 생성될 수 있음

### 4. PRD 문서 생성
1. 모든 필요한 질문에 답변 완료 후
2. "요건 관리" 탭 상단의 "PRD 생성" 버튼 클릭
3. AI가 모든 정보를 종합하여 완전한 PRD 문서 생성
4. "PRD" 탭에서 생성된 문서 확인

## 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- npm 또는 pnpm
- OpenAI API 키 (또는 호환 API)

### 로컬 실행
```bash
# 의존성 설치
npm install

# D1 로컬 데이터베이스 초기화
npm run db:migrate:local
npm run db:seed

# 빌드
npm run build

# PM2로 개발 서버 시작
pm2 start ecosystem.config.cjs

# 또는 직접 실행
npm run dev:sandbox
```

### 데이터베이스 관리
```bash
# 마이그레이션 적용 (로컬)
npm run db:migrate:local

# 시드 데이터 삽입
npm run db:seed

# 데이터베이스 초기화
npm run db:reset

# D1 콘솔 (로컬)
npm run db:console:local
```

### 프로덕션 배포

```bash
# D1 프로덕션 데이터베이스 생성
npx wrangler d1 create webapp-production

# wrangler.jsonc에 database_id 업데이트

# 마이그레이션 적용 (프로덕션)
npm run db:migrate:prod

# 배포
npm run deploy:prod
```

## 배포 상태

- **Platform**: Cloudflare Pages
- **Status**: ✅ Development Active
- **Database**: Cloudflare D1 (로컬 개발 환경)
- **AI Service**: OpenAI 호환 API (샌드박스 환경)
- **Last Updated**: 2026-02-05

## 기술 아키텍처

### 백엔드
- **Hono**: 경량 웹 프레임워크
- **Cloudflare Workers**: 엣지 런타임
- **Cloudflare D1**: 글로벌 분산 SQLite 데이터베이스
- **OpenAI API**: AI 기획 분석 엔진

### 프론트엔드
- **Vanilla JavaScript**: 프레임워크 없이 순수 JS
- **TailwindCSS**: 유틸리티 기반 CSS
- **Axios**: HTTP 클라이언트
- **Marked**: Markdown 파싱
- **Font Awesome**: 아이콘

### 개발 도구
- **TypeScript**: 타입 안전성
- **Vite**: 빌드 도구
- **Wrangler**: Cloudflare 개발 CLI
- **PM2**: 프로세스 관리

## 다음 개발 단계

1. **시각화 기능 강화**
   - 요건 트리 시각화
   - 마인드맵 뷰

2. **문서 관리**
   - PRD 버전 관리
   - 문서 비교 기능
   - 다양한 형식으로 내보내기

3. **협업 기능**
   - 실시간 협업
   - 코멘트 시스템
   - 권한 관리

4. **AI 기능 향상**
   - 더 정교한 요건 분류
   - 유사 프로젝트 분석
   - 자동 일정 산정

## 라이선스

MIT License

## 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.
