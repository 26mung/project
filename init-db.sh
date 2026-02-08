#!/bin/bash

# DB 초기화 스크립트
echo "🗄️  Initializing database..."

# D1 데이터베이스에 스키마 적용
npx wrangler d1 execute DB --local --file=./schema.sql

echo "✅ Database initialized!"
echo ""
echo "📝 다음 명령어로 데이터베이스를 확인할 수 있습니다:"
echo "   npx wrangler d1 execute DB --local --command='SELECT * FROM users'"
