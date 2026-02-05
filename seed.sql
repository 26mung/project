-- 테스트 프로젝트 데이터
INSERT OR IGNORE INTO projects (id, title, description, input_content, status) VALUES 
  (1, 'AI 기반 이메일 아시스턴트', 'Microsoft 365 Outlook과 연동되는 AI 기반 이메일 관리 시스템', 
   '사용자가 설정한 우선순위에 따라 이메일을 분류하고, AI를 활용해 중요 메일을 자동으로 식별하여 우선적으로 알림을 보내주는 시스템입니다.', 
   'in_progress');

-- 테스트 요건 데이터
INSERT OR IGNORE INTO requirements (id, project_id, parent_id, title, description, requirement_type, priority, status, order_index) VALUES 
  (1, 1, NULL, 'Microsoft 365 Outlook 연동', 'Outlook API를 통한 이메일 동기화', 'functional', 'critical', 'completed', 1),
  (2, 1, NULL, 'AI 기반 이메일 분류', 'AI를 활용한 이메일 중요도 분석 및 분류', 'functional', 'high', 'in_progress', 2),
  (3, 1, NULL, '사용자 피드백 및 AI 학습', '사용자의 피드백을 통한 AI 모델 개선', 'functional', 'medium', 'pending', 3),
  (4, 1, 2, 'AI 모델 선택', '어떤 AI 모델을 사용할지 결정', 'functional', 'high', 'pending', 1),
  (5, 1, 2, '분류 카테고리 정의', '이메일 분류 기준 및 카테고리 설정', 'functional', 'high', 'pending', 2);

-- 테스트 질문 데이터
INSERT OR IGNORE INTO questions (id, requirement_id, question_text, question_type, is_required, order_index) VALUES 
  (1, 4, 'AI 모델로 어떤 것을 사용하시겠습니까?', 'choice', 1, 1),
  (2, 4, '모델 선택 시 가장 중요한 기준은 무엇인가요?', 'open', 1, 2),
  (3, 5, '이메일을 어떤 카테고리로 분류하시겠습니까?', 'open', 1, 1);

-- 테스트 답변 데이터
INSERT OR IGNORE INTO answers (id, question_id, answer_text) VALUES 
  (1, 1, 'GPT-4'),
  (2, 2, '정확도와 응답 속도의 균형');
