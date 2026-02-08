# 플랫폼기획팀 프로젝트 관리 시스템 v1.0.0

AI 기반 프로젝트 기획부터 PRD 작성까지 All-in-One 솔루션

## 🎉 v1.0.0 Features

### 🚀 온보딩 페이지
- Apple 스타일의 혁신적인 랜딩 페이지
- 풀스크린 히어로 섹션 with 패럴랙스 효과
- 인터랙티브 기능 섹션 (스크롤 애니메이션)
- 다크 섹션 with 그라데이션 효과
- 스마트 네비게이션 (스크롤 반응형)
- 생동감 있는 카피라이팅

### 🔐 회원가입/로그인 시스템
- 이메일 기반 회원가입
- 이메일 인증 (6자리 코드, 5분 유효)
- 안전한 비밀번호 해시 (SHA-256)
- 세션 기반 인증 (7일 유효)
- 필수 항목: 이메일, 이름, 비밀번호
- 선택 항목: 생년월일

### 📋 프로젝트 관리
- 프로젝트 생성 및 관리
- 프로젝트 상태: Draft → In Progress → Completed
- 프로젝트 뱃지: 미확인 → 초기 기획용 / 챌린지형

### 🤖 AI 기능
- **기획안 평가**: 완성도 점수 (0-100점)
- **요건 자동 생성**: AI가 기획안 분석 → 요건 추출
- **질문 자동 생성**: 요건당 자동 질문 생성
- **PRD 문서 생성**: 전문가 수준의 PRD 자동 작성

### 📝 요건 관리
- CRUD (생성, 조회, 수정, 삭제)
- 우선순위: Critical / High / Medium / Low
- 상태: 대기 / 진행중 / 완료
- 북마크 기능
- 검색/필터링
- **카드 클릭 → 상세보기 팝업**

### 🔥 스파르타 챌린지
- 질문 10개 이상인 요건에 특별 뱃지
- 애니메이션 효과로 강조

### 🎨 UX/UI
- 모달 시스템 (블러/딤 처리)
- 트렌디한 마이크로 인터랙션
- Toss 디자인 시스템
- 반응형 레이아웃

## 🛠️ 기술 스택

- **Frontend**: Vanilla JS + Tailwind CSS (CDN)
- **Backend**: Hono + Cloudflare Workers
- **Database**: D1 (SQLite)
- **Authentication**: Session-based with cookies
- **Deployment**: Cloudflare Pages

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 데이터베이스 초기화
```bash
./init-db.sh
# 또는
npx wrangler d1 execute DB --local --file=./schema.sql
```

### 3. 개발 서버 실행
```bash
npm run dev
```

서버가 실행되면:
- **온보딩 페이지**: http://localhost:8080/onboarding.html
- **메인 앱**: http://localhost:8080/

### 4. 빌드
```bash
npm run build
```

### 5. 프로덕션 배포
```bash
npm run deploy
```

## 📁 프로젝트 구조

```
/home/user/webapp/
├── public/
│   ├── index.html              # 메인 앱
│   ├── onboarding.html         # 온보딩 페이지 (신규)
│   └── static/
│       ├── app.js              # 메인 앱 로직
│       ├── onboarding.js       # 온보딩 로직 (신규)
│       └── style.css           # 메인 앱 스타일
├── src/
│   ├── api.ts                  # API 라우트 (인증 API 추가)
│   ├── ai-service.ts           # AI 서비스
│   └── types.ts                # 타입 정의
├── schema.sql                  # DB 스키마 (신규)
├── init-db.sh                  # DB 초기화 스크립트 (신규)
└── wrangler.toml               # Cloudflare 설정
```

## 🔐 인증 시스템

### 회원가입 Flow
1. 이메일 입력 → "인증코드 발송" 클릭
2. 이메일로 6자리 코드 수신 (개발 환경에서는 응답에 포함)
3. 코드 입력 → "인증확인" 클릭
4. 이름, 비밀번호 입력
5. 회원가입 완료

### 로그인 Flow
1. 이메일, 비밀번호 입력
2. 로그인 성공 → 세션 쿠키 설정
3. 메인 앱으로 리다이렉트

### API Endpoints
```
POST /api/auth/send-verification  # 이메일 인증코드 발송
POST /api/auth/verify-code        # 인증코드 확인
POST /api/auth/signup             # 회원가입
POST /api/auth/login              # 로그인
POST /api/auth/logout             # 로그아웃
GET  /api/auth/check              # 세션 확인
```

## 📊 데이터베이스 스키마

### users 테이블
```sql
- id: INTEGER PRIMARY KEY
- email: TEXT UNIQUE (필수)
- password_hash: TEXT (필수)
- name: TEXT (필수)
- birth_date: TEXT (선택, YYYY-MM-DD)
- is_email_verified: INTEGER (0/1)
- created_at: TEXT
- updated_at: TEXT
- last_login_at: TEXT
```

### email_verifications 테이블
```sql
- id: INTEGER PRIMARY KEY
- email: TEXT
- verification_code: TEXT (6자리)
- expires_at: TEXT (5분 유효)
- is_used: INTEGER (0/1)
- created_at: TEXT
```

### sessions 테이블
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FOREIGN KEY)
- session_token: TEXT UNIQUE
- expires_at: TEXT (7일 유효)
- created_at: TEXT
```

## 🧪 테스트

### 온보딩 페이지 테스트
1. http://localhost:8080/onboarding.html 접속
2. 히어로 섹션 스크롤 애니메이션 확인
3. 네비게이션 스크롤 반응 확인
4. 회원가입 플로우 테스트
5. 로그인 플로우 테스트

### 메인 앱 테스트
1. 로그인 후 http://localhost:8080/ 접속
2. 프로젝트 생성
3. 기획안 평가
4. 요건 관리
5. PRD 생성

## 🎯 향후 계획

- [ ] 실제 이메일 발송 (Resend, SendGrid 등)
- [ ] bcrypt 비밀번호 해시
- [ ] 비밀번호 재설정 기능
- [ ] 소셜 로그인 (Google, GitHub)
- [ ] 프로필 관리
- [ ] 프로젝트-사용자 연동 (user_id 추가)

## 📝 라이선스

MIT

## 🙏 기여

버그 리포트나 기능 제안은 Issue를 통해 부탁드립니다.

---

**v1.0.0** - Production Ready 🎉
