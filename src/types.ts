// Cloudflare 환경 타입
export type Bindings = {
  DB: D1Database;
}

// 프로젝트 타입
export interface Project {
  id: number;
  title: string;
  description?: string;
  input_content?: string;
  status: 'draft' | 'analyzing' | 'in_progress' | 'completed';
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
