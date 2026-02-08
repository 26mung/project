// Cloudflare 환경 타입
export type Bindings = {
  DB: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  RESEND_API_KEY?: string;
}

// 프로젝트 타입
export interface Project {
  id: number;
  title: string;
  description?: string;
  input_content?: string;
  status: 'draft' | 'analyzing' | 'in_progress' | 'completed';
  image_urls?: string; // Base64 JSON 배열
  last_evaluation?: string; // 평가 결과 JSON
  requirement_mode?: 'initial' | 'challenge';
  created_at: string;
  updated_at: string;
}

// 요건 타입
export interface Requirement {
  id: number;
  project_id: number;
  parent_id?: number;
  title: string;
  description?: string;
  requirement_type: 'functional' | 'non_functional' | 'constraint';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
  challenge_status?: 'recommended' | 'accepted' | 'declined' | 'completed';
  direction_analysis?: string; // 방향성 분석 JSON
  user_feedback?: string; // 사용자 피드백
  keywords?: string; // 키워드 JSON 배열
  order_index: number;
  created_at: string;
  updated_at: string;
}

// 질문 타입
export interface Question {
  id: number;
  requirement_id: number;
  question_text: string;
  question_type: 'open' | 'choice' | 'boolean';
  options?: string; // JSON string
  is_required: boolean;
  order_index: number;
  created_at: string;
}

// 답변 타입
export interface Answer {
  id: number;
  question_id: number;
  answer_text: string;
  created_at: string;
  updated_at: string;
}

// PRD 문서 타입
export interface PRDDocument {
  id: number;
  project_id: number;
  content: string;
  version: number;
  created_at: string;
}

// API 요청/응답 타입
export interface CreateProjectRequest {
  title: string;
  description?: string;
  input_content?: string;
}

export interface AnalyzeProjectRequest {
  project_id: number;
  input_content: string;
}

export interface CreateRequirementRequest {
  project_id: number;
  parent_id?: number;
  title: string;
  description?: string;
  requirement_type: 'functional' | 'non_functional' | 'constraint';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AnswerQuestionRequest {
  question_id: number;
  answer_text: string;
}

export interface GeneratePRDRequest {
  project_id: number;
}

// 계층 구조 요건 타입 (트리 표시용)
export interface RequirementTree extends Requirement {
  children?: RequirementTree[];
  questions?: Question[];
  answers?: Answer[];
}

// 챌린지형 요건 추천 응답
export interface ChallengeRecommendationResponse {
  requirements: {
    title: string;
    description: string;
    requirement_type: 'functional' | 'non_functional' | 'constraint';
    priority: 'low' | 'medium' | 'high' | 'critical';
    keywords: string[];
    rationale: string; // 추천 이유
  }[];
}

// 방향성 분석 응답
export interface DirectionAnalysisResponse {
  direction: string; // 이 요건의 핵심 방향성
  clarifications: string[]; // 명확히 해야 할 사항
  suggested_approach: string; // 제안 접근 방식
  questions: {
    question_text: string;
    question_type: 'open' | 'choice' | 'boolean';
    options?: string[];
  }[];
}
