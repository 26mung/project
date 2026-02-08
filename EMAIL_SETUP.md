# 📧 이메일 발송 시스템 가이드

## ✅ 구현 완료!

Resend API를 사용한 이메일 인증 코드 발송 시스템이 구축되었습니다.

## 🎯 현재 상태

### 테스트 모드 (현재)
- **발신 주소**: `onboarding@resend.dev`
- **수신 가능**: `26mung@gmail.com` (본인 계정만)
- **제한 사항**: Resend 테스트 모드는 본인 이메일로만 발송 가능

### 프로덕션 모드 (도메인 인증 후)
- **발신 주소**: `noreply@yourdomain.com`
- **수신 가능**: 모든 이메일 주소
- **필요 작업**: 도메인 DNS 설정 (5분 소요)

## 🔧 설정 방법

### 1. 환경 변수 설정

`.dev.vars` (로컬 개발):
```bash
RESEND_API_KEY=re_JF3DjpCv_8p1mEgbHSqPERbgEE3PExgAw
```

Cloudflare Pages 환경 변수 (프로덕션):
1. Cloudflare Dashboard > Workers & Pages > 프로젝트 선택
2. Settings > Environment Variables
3. `RESEND_API_KEY` 추가

### 2. 도메인 인증 (선택, 모든 이메일에 발송하려면 필요)

#### Step 1: Resend에서 도메인 추가
1. https://resend.com/domains 접속
2. "Add Domain" 클릭
3. 도메인 입력 (예: `yourdomain.com`)

#### Step 2: DNS 설정
Resend가 제공하는 3개의 레코드를 DNS에 추가:

**SPF Record**:
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM Record**:
```
Type: TXT  
Name: resend._domainkey
Value: (Resend에서 제공하는 값)
```

**Return-Path**:
```
Type: CNAME
Name: resend
Value: (Resend에서 제공하는 값)
```

#### Step 3: 발신 주소 변경
`src/api.ts` 파일에서:
```typescript
from: 'onboarding@resend.dev',  // 테스트 모드
// ↓ 변경
from: 'noreply@yourdomain.com',  // 프로덕션 모드
```

## 📨 이메일 템플릿

현재 구현된 템플릿:
- Apple 스타일 디자인
- 그라데이션 코드 박스
- 6자리 인증 코드
- 5분 만료 안내
- 모바일 반응형

템플릿 위치: `src/api.ts` (61-164번째 줄)

## 🧪 테스트 방법

### 테스트 모드 (현재)
```bash
# 26mung@gmail.com으로만 발송 가능
curl -X POST http://localhost:8080/api/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"26mung@gmail.com"}'

# 응답 (발송 성공):
{"success":true,"message":"Verification code sent"}

# 다른 이메일 시도 시:
curl -X POST http://localhost:8080/api/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"other@example.com"}'

# 응답 (발송 실패, 코드 표시):
{"success":true,"message":"Verification code sent","dev_code":"123456"}
```

### 프로덕션 모드 (도메인 인증 후)
모든 이메일 주소로 발송 가능. `dev_code`는 더 이상 표시되지 않음.

## 📊 발송 제한

### Resend 무료 플랜
- **월 3,000통** 무료
- 초과 시: $1/1,000통
- 일일 제한: 100통/일

### 발송 로그
Resend Dashboard에서 확인 가능:
- https://resend.com/emails
- 발송 상태, 오픈율, 클릭율 등

## 🔒 보안

- API 키는 환경 변수로 관리
- `.dev.vars`는 `.gitignore`에 포함
- 이메일 발송 실패 시 서비스 중단 없음 (fallback)
- 5분 후 인증 코드 자동 만료

## 🚀 다음 단계

1. **도메인 인증** (권장)
   - 모든 사용자에게 이메일 발송 가능
   - 발송 신뢰도 향상
   - 스팸 필터 우회

2. **이메일 개선**
   - 비밀번호 재설정 이메일
   - 환영 이메일
   - 알림 이메일

3. **모니터링**
   - 발송 실패 알림
   - 발송량 모니터링
   - 오픈율 분석

## 🐛 문제 해결

### 이메일이 안 오는 경우
1. **스팸 폴더 확인**
2. **테스트 모드 확인**: `26mung@gmail.com`로만 발송 가능
3. **서버 로그 확인**: `[Resend Error]` 메시지
4. **Resend Dashboard 확인**: 발송 상태

### dev_code가 계속 표시되는 경우
- 이메일 발송 실패를 의미
- 원인: 테스트 모드에서 다른 이메일로 발송 시도
- 해결: 도메인 인증 또는 26mung@gmail.com 사용

## 📚 참고 자료

- Resend 문서: https://resend.com/docs
- API 레퍼런스: https://resend.com/docs/api-reference
- 도메인 설정: https://resend.com/docs/dashboard/domains
- 템플릿 가이드: https://resend.com/docs/send-with-react

---

**현재 상태**: ✅ 이메일 발송 시스템 작동 중!  
**테스트 이메일**: 26mung@gmail.com 확인해보세요! 📧
