-- ============ 권한 시스템 테이블 ============

-- 역할 테이블
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,  -- 'super_admin', 'admin', 'user', 'viewer' 등
  display_name TEXT NOT NULL,  -- '최고관리자', '관리자', '일반회원', '뷰어'
  description TEXT,
  level INTEGER NOT NULL DEFAULT 0,  -- 권한 레벨 (높을수록 강력)
  created_at TEXT DEFAULT (datetime('now', '+9 hours'))
);

-- 기본 역할 추가
INSERT OR IGNORE INTO roles (name, display_name, description, level) VALUES
  ('super_admin', '최고관리자', '모든 권한을 가진 최고 관리자', 100),
  ('admin', '관리자', '관리 권한을 가진 관리자', 50),
  ('user', '일반회원', '기본 사용자 권한', 10),
  ('viewer', '뷰어', '읽기 전용 권한', 1);

-- 사용자-역할 매핑 테이블 (N:M 관계)
CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  granted_by INTEGER,  -- 권한을 부여한 관리자 user_id
  granted_at TEXT DEFAULT (datetime('now', '+9 hours')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- 세부 권한 테이블 (향후 확장용)
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,  -- 'view_all_projects', 'edit_users', 'delete_projects' 등
  display_name TEXT NOT NULL,
  description TEXT,
  resource TEXT,  -- 'projects', 'users', 'settings' 등
  action TEXT,  -- 'view', 'create', 'edit', 'delete'
  created_at TEXT DEFAULT (datetime('now', '+9 hours'))
);

-- 역할-권한 매핑 테이블
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- ============ 프로젝트 소유권 추가 ============

-- projects 테이블에 user_id 컬럼 추가 (이미 있으면 무시)
-- ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
-- 주의: SQLite는 ALTER TABLE로 외래키를 추가할 수 없으므로, 새로 생성된 프로젝트에만 적용

-- user_id 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- ============ 사용자 확장 필드 ============

-- users 테이블 확장 (향후 필요한 필드들)
-- 예: 전화번호, 프로필 이미지, 회사명, 부서 등
-- ALTER TABLE users ADD COLUMN phone TEXT;
-- ALTER TABLE users ADD COLUMN profile_image_url TEXT;
-- ALTER TABLE users ADD COLUMN company TEXT;
-- ALTER TABLE users ADD COLUMN department TEXT;
-- ALTER TABLE users ADD COLUMN job_title TEXT;

-- ============ 관리자 활동 로그 ============

CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL,
  action TEXT NOT NULL,  -- 'grant_role', 'revoke_role', 'delete_user', 'view_users' 등
  target_user_id INTEGER,
  details TEXT,  -- JSON 형식의 상세 정보
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now', '+9 hours')),
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_user_id ON admin_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);

-- ============ 특정 사용자에게 최고관리자 권한 부여 ============

-- ghtjrrnsdls@naver.com 사용자 조회 후 super_admin 역할 부여
-- 실행 시점에 해당 이메일이 존재하면 권한 부여
INSERT OR IGNORE INTO user_roles (user_id, role_id, granted_by)
SELECT 
  u.id,
  r.id,
  NULL  -- 초기 설정이므로 granted_by는 NULL
FROM users u, roles r
WHERE u.email = 'ghtjrrnsdls@naver.com'
  AND r.name = 'super_admin';
