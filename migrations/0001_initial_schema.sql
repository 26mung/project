-- 프로젝트 테이블
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  input_content TEXT, -- 초기 입력된 상위 기획안
  status TEXT DEFAULT 'draft', -- draft, analyzing, in_progress, completed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 요건 테이블 (계층 구조)
CREATE TABLE IF NOT EXISTS requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  parent_id INTEGER, -- NULL이면 최상위 요건
  title TEXT NOT NULL,
  description TEXT,
  requirement_type TEXT, -- functional, non_functional, constraint
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  order_index INTEGER DEFAULT 0, -- 같은 레벨 내 정렬 순서
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES requirements(id) ON DELETE CASCADE
);

-- 확인 질문 테이블
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requirement_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'open', -- open, choice, boolean
  options TEXT, -- JSON array for choice type questions
  is_required BOOLEAN DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE
);

-- 답변 테이블
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  answer_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- PRD 문서 테이블
CREATE TABLE IF NOT EXISTS prd_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  content TEXT NOT NULL, -- Markdown 형식의 PRD 내용
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_parent_id ON requirements(parent_id);
CREATE INDEX IF NOT EXISTS idx_questions_requirement_id ON questions(requirement_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_prd_documents_project_id ON prd_documents(project_id);
