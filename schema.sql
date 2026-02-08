-- ============ 사용자 테이블 ============
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  birth_date TEXT,  -- YYYY-MM-DD 형식, 선택
  is_email_verified INTEGER DEFAULT 0,  -- 0: 미인증, 1: 인증완료
  created_at TEXT DEFAULT (datetime('now', '+9 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+9 hours')),
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ============ 이메일 인증 테이블 ============
CREATE TABLE IF NOT EXISTS email_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  verification_code TEXT NOT NULL,  -- 6자리 숫자 코드
  expires_at TEXT NOT NULL,         -- 만료 시간 (5분 후)
  is_used INTEGER DEFAULT 0,        -- 0: 미사용, 1: 사용완료
  created_at TEXT DEFAULT (datetime('now', '+9 hours'))
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON email_verifications(verification_code);

-- ============ 세션 테이블 ============
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', '+9 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ============ 기존 프로젝트 테이블 (users 연동) ============
-- projects 테이블에 user_id 컬럼 추가 (기존 테이블 수정)
-- ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
-- CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
