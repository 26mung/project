# 데이터베이스 설정 가이드

## 로컬 개발 환경

로컬 D1 데이터베이스에 스키마를 적용하려면:

```bash
npx wrangler d1 execute webapp-production --local --file=schema.sql
```

## 프로덕션 환경

Cloudflare 프로덕션 D1 데이터베이스에 스키마를 적용하려면:

```bash
# Cloudflare API 토큰이 필요합니다
npx wrangler d1 execute webapp-production --remote --file=schema.sql
```

또는 Cloudflare Dashboard에서 직접 실행:
1. Cloudflare Dashboard > Workers & Pages > D1 > webapp-production
2. Console 탭에서 `schema.sql` 내용을 붙여넣기
3. "Execute" 버튼 클릭

## 테이블 확인

로컬 데이터베이스의 테이블 목록 확인:

```bash
npx wrangler d1 execute webapp-production --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

## 인증 시스템 테이블

- **users**: 사용자 계정 정보
- **email_verifications**: 이메일 인증 코드
- **sessions**: 로그인 세션 토큰

## 자동 초기화

`init-db.sh` 스크립트를 실행하여 자동으로 로컬 DB 초기화:

```bash
chmod +x init-db.sh
./init-db.sh
```
