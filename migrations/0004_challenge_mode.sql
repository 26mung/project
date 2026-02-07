-- 챌린지형 요건 관리를 위한 테이블 추가

-- 프로젝트 테이블에 챌린지 모드 관련 컬럼 추가 (image_urls, last_evaluation은 이미 존재)
ALTER TABLE projects ADD COLUMN requirement_mode TEXT DEFAULT 'initial'; -- 'initial', 'challenge'

-- 요건 테이블에 챌린지 모드 관련 컬럼 추가
ALTER TABLE requirements ADD COLUMN challenge_status TEXT DEFAULT 'recommended'; -- 'recommended', 'accepted', 'declined', 'completed'
ALTER TABLE requirements ADD COLUMN direction_analysis TEXT; -- AI가 분석한 방향성 JSON
ALTER TABLE requirements ADD COLUMN user_feedback TEXT; -- 사용자 방향성 피드백
ALTER TABLE requirements ADD COLUMN keywords TEXT; -- 중복 제거를 위한 키워드 (JSON 배열)

-- 방향성 피드백 이력 테이블
CREATE TABLE IF NOT EXISTS direction_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requirement_id INTEGER NOT NULL,
  feedback_text TEXT NOT NULL,
  ai_response TEXT, -- AI 재분석 결과
  iteration_count INTEGER DEFAULT 1, -- 몇 번째 재다듬기인지
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE
);

-- 수집된 인사이트 테이블
CREATE TABLE IF NOT EXISTS collected_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requirement_id INTEGER NOT NULL,
  insight_text TEXT NOT NULL,
  insight_type TEXT, -- 'technical', 'business', 'user_experience'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE
);

-- 추천 이력 테이블 (중복 방지)
CREATE TABLE IF NOT EXISTS recommendation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  recommended_titles TEXT NOT NULL, -- JSON 배열
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_requirements_challenge_status ON requirements(challenge_status);
CREATE INDEX IF NOT EXISTS idx_direction_feedback_requirement_id ON direction_feedback(requirement_id);
CREATE INDEX IF NOT EXISTS idx_collected_insights_requirement_id ON collected_insights(requirement_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_project_id ON recommendation_history(project_id);
