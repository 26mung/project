# 🚀 Cloudflare Pages 배포 가이드

이 문서는 플랫폼기획팀 웹앱을 Cloudflare Pages에 배포하는 방법을 설명합니다.

---

## 📋 사전 준비사항

### 1. Cloudflare 계정 준비
- [Cloudflare Dashboard](https://dash.cloudflare.com)에 가입/로그인
- 도메인이 Cloudflare에 연결되어 있어야 함 (선택사항)

### 2. 필요한 도구 설치
```bash
# Node.js 20+ 확인
node --version

# wrangler CLI 전역 설치 (권장)
npm install -g wrangler

# 또는 npx 사용
npx wrangler --version
```

### 3. Wrangler 로그인
```bash
npx wrangler login
```

---

## 🗄️ D1 데이터베이스 설정

### 1. 로컬 개발용 데이터베이스 생성
```bash
# 이미 wrangler.jsonc에 설정되어 있음
# 처음 실행 시 자동 생성됨
npm run db:migrate:local
npm run db:seed
```

### 2. 프로덕션 데이터베이스 생성
```bash
# 프로덕션 D1 데이터베이스 생성
npx wrangler d1 create webapp-production

# 생성된 database_id를 wrangler.jsonc에 업데이트
# 실행 결과의 id 값을 복사해서 wrangler.jsonc의 database_id에 붙여넣기
```

### 3. 프로덕션 데이터베이스 마이그레이션
```bash
npm run db:migrate:prod
```

---

## 🔐 환경 변수 설정

### 로컬 개발 (.dev.vars)
```bash
# 이미 .dev.vars 파일에 설정되어 있음
SUPABASE_URL=https://bsjhyxholkrftcsyeq.supabase.co
SUPABASE_ANON_KEY=your-anon-key
APP_PASSWORD=6116
OPENAI_API_KEY=your-openai-key  # 선택사항
```

### 프로덕션 (Cloudflare Dashboard)
1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → 프로젝트 선택
2. **Settings** → **Environment variables**
3. 다음 변수들을 **Production** 환경에 추가:

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | ✅ |
| `APP_PASSWORD` | 앱 로그인 비밀번호 | ✅ |
| `OPENAI_API_KEY` | OpenAI API 키 (AI 기능용) | 선택 |

---

## 🏗️ 로컬 개발

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
# Vite 개발 서버 (HMR 지원)
npm run dev

# 또는 Cloudflare Pages 로컬 시뮬레이션
npm run dev:cf
```

### 3. 데이터베이스 리셋 (필요시)
```bash
npm run db:reset
```

---

## 🚀 프로덕션 배포

### 방법 1: Wrangler CLI로 배포 (권장)

```bash
# 1. 빌드
npm run build

# 2. 배포 (첫 배포시 프로젝트명 입력 필요)
npm run deploy

# 또는 프로젝트명 지정
npm run deploy:prod
```

### 방법 2: Git 연동 자동 배포 (권장)

#### GitHub 연동 설정
1. Cloudflare Dashboard → Pages → **Create a project**
2. **Connect to Git** 선택
3. GitHub 계정 연결 및 저장소 선택
4. 빌드 설정:
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **Environment variables** 섹션에서 위의 변수들 추가
6. **Save and Deploy**

#### 자동 배포 동작
- `main` 브랜치 푸시 → 프로덕션 자동 배포
- Pull Request → Preview 배포 생성

---

## 📁 프로젝트 구조 (Cloudflare Pages 최적화)

```
webapp/
├── src/                    # Hono 백엔드 API
│   ├── index.tsx          # 메인 엔트리 (Cloudflare Pages Functions)
│   ├── api.ts             # API 라우트
│   ├── ai-service.ts      # AI 분석 서비스
│   └── types.ts           # 타입 정의
├── public/                # 정적 파일
│   ├── index.html         # (빌드에서 생성됨)
│   └── static/            # CSS, JS, 이미지
│       ├── app.js
│       └── style.css
├── dist/                  # 빌드 출력 (Cloudflare Pages가 배포)
├── migrations/             # D1 데이터베이스 마이그레이션
├── wrangler.jsonc        # Cloudflare 설정
├── vite.config.ts        # Vite 빌드 설정 (Cloudflare Pages 지원)
└── .dev.vars             # 로컬 환경 변수
```

---

## 🔧 주요 설정 파일 설명

### wrangler.jsonc
```json
{
  "name": "webapp",
  "pages_build_output_dir": "./dist",     // Pages 빌드 출력
  "compatibility_date": "2026-02-05",
  "compatibility_flags": ["nodejs_compat"], // Node.js 호환성
  "d1_databases": [{
    "binding": "DB",
    "database_name": "webapp-production",
    "database_id": "your-database-id"      // 프로덕션 DB ID
  }]
}
```

### vite.config.ts
```typescript
import build from '@hono/vite-build/cloudflare-pages'  // Pages 최적화
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'

export default defineConfig({
  plugins: [
    build(),                    // Cloudflare Pages용 빌드
    devServer({
      adapter,
      entry: 'src/index.tsx'   // Functions 엔트리
    })
  ]
})
```

---

## 🐛 문제 해결

### 배포 실패 시

1. **빌드 로그 확인**
   - Cloudflare Dashboard → Pages → 프로젝트 → Deployments → 빌드 로그

2. **환경 변수 누락 확인**
   ```bash
   npx wrangler pages deployment tail
   ```

3. **로컬에서 테스트**
   ```bash
   npm run build
   npm run preview
   ```

### D1 데이터베이스 연결 문제

```bash
# 로컬 DB 확인
npx wrangler d1 execute webapp-production --local --command "SELECT * FROM projects LIMIT 1"

# 프로덕션 DB 확인
npx wrangler d1 execute webapp-production --command "SELECT * FROM projects LIMIT 1"
```

### 404 에러 (API 라우트)

Cloudflare Pages Functions는 파일 기반 라우팅을 사용합니다:
- `src/index.tsx` → `/*` (모든 경로)
- API 라우트는 `src/api.ts`에서 `/api/*`로 처리

---

## 📝 스크립트 요약

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Vite 개발 서버 |
| `npm run dev:cf` | Cloudflare Pages 로컬 시뮬레이션 |
| `npm run build` | 프로덕션 빌드 |
| `npm run deploy` | Pages에 배포 |
| `npm run db:migrate:local` | 로컬 DB 마이그레이션 |
| `npm run db:migrate:prod` | 프로덕션 DB 마이그레이션 |
| `npm run db:reset` | 로컬 DB 초기화 + 시드 |

---

## 🔗 유용한 링크

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Hono Cloudflare Pages](https://hono.dev/docs/getting-started/cloudflare-pages)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

**질문이나 문제가 있으면 말씀해주세요! 🎉**
