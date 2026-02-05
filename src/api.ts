import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, getCookie } from 'hono/cookie';
import type { Bindings, CreateProjectRequest, AnalyzeProjectRequest, CreateRequirementRequest, AnswerQuestionRequest, GeneratePRDRequest } from './types';
import { analyzeProjectRequirements, generateFollowUpQuestions, generatePRD, generateDerivedRequirements, evaluateProjectCompleteness, chatCompletion } from './ai-service';

const api = new Hono<{ Bindings: Bindings }>();

// CORS 설정
api.use('/*', cors());

// 간단한 비밀번호 상수
const APP_PASSWORD = '플랫폼기획팀1!';
const SESSION_COOKIE_NAME = 'platform_session';

// ============ 인증 API ============

// 비밀번호 검증
api.post('/auth/verify', async (c) => {
  const body = await c.req.json();
  const { password } = body;
  
  if (password === APP_PASSWORD) {
    // 세션 쿠키 설정 (7일 유효)
    setCookie(c, SESSION_COOKIE_NAME, 'authenticated', {
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      path: '/'
    });
    return c.json({ success: true });
  }
  
  return c.json({ error: 'Invalid password' }, 401);
});

// 로그아웃
api.post('/auth/logout', async (c) => {
  setCookie(c, SESSION_COOKIE_NAME, '', {
    maxAge: 0,
    httpOnly: true,
    path: '/'
  });
  return c.json({ success: true });
});

// 세션 확인
api.get('/auth/check', async (c) => {
  const session = getCookie(c, SESSION_COOKIE_NAME);
  return c.json({ authenticated: session === 'authenticated' });
});

// ============ 프로젝트 API ============

// 모든 프로젝트 조회
api.get('/projects', async (c) => {
  const { DB } = c.env;
  const { results } = await DB.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  return c.json(results);
});

// 프로젝트 상세 조회
api.get('/projects/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const project = await DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }
  
  return c.json(project);
});

// 프로젝트 생성
api.post('/projects', async (c) => {
  const { DB } = c.env;
  const body: CreateProjectRequest = await c.req.json();
  
  const result = await DB.prepare(
    'INSERT INTO projects (title, description, input_content, status) VALUES (?, ?, ?, ?)'
  ).bind(body.title, body.description || null, body.input_content || null, 'draft').run();
  
  return c.json({ id: result.meta.last_row_id, ...body, status: 'draft' }, 201);
});

// 프로젝트 업데이트
api.put('/projects/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await DB.prepare(
    'UPDATE projects SET title = ?, description = ?, input_content = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(body.title, body.description, body.input_content, body.status, id).run();
  
  return c.json({ success: true });
});

// 프로젝트 삭제
api.delete('/projects/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  await DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  
  return c.json({ success: true });
});

// 프로젝트 기획안 평가 (분석 전 실행)
api.post('/projects/:id/evaluate', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  
  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500);
  }
  
  try {
    const project = await DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first() as any;
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    const evaluation = await evaluateProjectCompleteness(
      project.title,
      project.description || '',
      project.input_content || '',
      apiKey,
      baseURL
    );
    
    // 평가 결과를 프로젝트에 저장
    await DB.prepare(`
      UPDATE projects 
      SET last_evaluation = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(JSON.stringify(evaluation), id).run();
    
    return c.json(evaluation);
  } catch (error) {
    console.error('Evaluation error:', error);
    return c.json({ error: 'Evaluation failed', message: String(error) }, 500);
  }
});

// 최근 평가 결과 조회
api.get('/projects/:id/last-evaluation', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  try {
    const project = await DB.prepare('SELECT last_evaluation FROM projects WHERE id = ?').bind(id).first() as any;
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    if (!project.last_evaluation) {
      return c.json({ error: 'No evaluation found' }, 404);
    }
    
    const evaluation = JSON.parse(project.last_evaluation);
    return c.json(evaluation);
  } catch (error) {
    console.error('Failed to get evaluation:', error);
    return c.json({ error: 'Failed to get evaluation' }, 500);
  }
});

// ============ AI 분석 API ============

// 프로젝트 기획안 AI 분석 및 요건 생성
api.post('/projects/:id/analyze', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body: AnalyzeProjectRequest = await c.req.json();
  
  // 환경 변수에서 OpenAI 설정 가져오기
  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  
  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500);
  }
  
  try {
    // 프로젝트 상태 업데이트
    await DB.prepare(
      'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('analyzing', id).run();
    
    // AI 분석 실행
    const analysis = await analyzeProjectRequirements(body.input_content, apiKey, baseURL);
    
    // 요건 및 질문 저장
    for (const req of analysis.requirements) {
      const reqResult = await DB.prepare(
        'INSERT INTO requirements (project_id, title, description, requirement_type, priority, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, req.title, req.description, req.requirement_type, req.priority, 'pending').run();
      
      const reqId = reqResult.meta.last_row_id;
      
      // 질문 저장
      for (let i = 0; i < req.questions.length; i++) {
        const q = req.questions[i];
        await DB.prepare(
          'INSERT INTO questions (requirement_id, question_text, question_type, options, order_index) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          reqId,
          q.question_text,
          q.question_type,
          q.options ? JSON.stringify(q.options) : null,
          i
        ).run();
      }
    }
    
    // 프로젝트 상태를 in_progress로 변경
    await DB.prepare(
      'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('in_progress', id).run();
    
    return c.json({ success: true, requirements_count: analysis.requirements.length });
  } catch (error) {
    console.error('Analysis error:', error);
    await DB.prepare(
      'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('draft', id).run();
    
    return c.json({ error: 'Analysis failed', message: String(error) }, 500);
  }
});

// ============ 요건 API ============

// 프로젝트의 모든 요건 조회 (계층 구조)
api.get('/projects/:id/requirements', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  const { results } = await DB.prepare(
    'SELECT * FROM requirements WHERE project_id = ? ORDER BY parent_id, order_index'
  ).bind(id).all();
  
  return c.json(results);
});

// 요건 상세 조회 (질문 및 답변 포함)
api.get('/requirements/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  const requirement = await DB.prepare('SELECT * FROM requirements WHERE id = ?').bind(id).first();
  
  if (!requirement) {
    return c.json({ error: 'Requirement not found' }, 404);
  }
  
  const { results: questions } = await DB.prepare(
    'SELECT * FROM questions WHERE requirement_id = ? ORDER BY order_index'
  ).bind(id).all();
  
  // 각 질문의 답변 가져오기
  for (const question of questions as any[]) {
    const answer = await DB.prepare(
      'SELECT * FROM answers WHERE question_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(question.id).first();
    
    question.answer = answer;
  }
  
  return c.json({ ...requirement, questions });
});

// 요건 생성
api.post('/requirements', async (c) => {
  const { DB } = c.env;
  const body: CreateRequirementRequest = await c.req.json();
  
  const result = await DB.prepare(
    'INSERT INTO requirements (project_id, parent_id, title, description, requirement_type, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    body.project_id,
    body.parent_id || null,
    body.title,
    body.description || null,
    body.requirement_type,
    body.priority || 'medium',
    'pending'
  ).run();
  
  return c.json({ id: result.meta.last_row_id, ...body }, 201);
});

// 요건 업데이트
api.put('/requirements/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await DB.prepare(
    'UPDATE requirements SET title = ?, description = ?, status = ?, priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(body.title, body.description, body.status, body.priority, id).run();
  
  return c.json({ success: true });
});

// 요건 삭제
api.delete('/requirements/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  await DB.prepare('DELETE FROM requirements WHERE id = ?').bind(id).run();
  
  return c.json({ success: true });
});

// ============ 질문/답변 API ============

// 질문에 답변하기
api.post('/questions/:id/answer', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body: AnswerQuestionRequest = await c.req.json();
  
  // 기존 답변이 있으면 업데이트, 없으면 생성
  const existingAnswer = await DB.prepare(
    'SELECT * FROM answers WHERE question_id = ?'
  ).bind(id).first();
  
  if (existingAnswer) {
    await DB.prepare(
      'UPDATE answers SET answer_text = ?, updated_at = CURRENT_TIMESTAMP WHERE question_id = ?'
    ).bind(body.answer_text, id).run();
  } else {
    await DB.prepare(
      'INSERT INTO answers (question_id, answer_text) VALUES (?, ?)'
    ).bind(id, body.answer_text).run();
  }
  
  // 파생 질문 생성 (선택적)
  const question = await DB.prepare('SELECT * FROM questions WHERE id = ?').bind(id).first() as any;
  const requirement = await DB.prepare('SELECT * FROM requirements WHERE id = ?').bind(question.requirement_id).first() as any;
  
  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  
  if (apiKey && question && requirement) {
    try {
      const followUpQuestions = await generateFollowUpQuestions(
        requirement.title,
        question.question_text,
        body.answer_text,
        apiKey,
        baseURL
      );
      
      // 파생 질문 저장
      for (const fq of followUpQuestions) {
        await DB.prepare(
          'INSERT INTO questions (requirement_id, question_text, question_type) VALUES (?, ?, ?)'
        ).bind(question.requirement_id, fq.question_text, fq.question_type).run();
      }
      
      return c.json({ success: true, follow_up_count: followUpQuestions.length });
    } catch (error) {
      console.error('Follow-up generation error:', error);
    }
  }
  
  return c.json({ success: true, follow_up_count: 0 });
});

// 답변 기반 파생 요건 자동 생성
api.post('/requirements/:id/generate-derived', async (c) => {
  const { DB } = c.env;
  const requirementId = c.req.param('id');
  
  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  
  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500);
  }
  
  try {
    // 요건 정보 가져오기
    const requirement = await DB.prepare('SELECT * FROM requirements WHERE id = ?').bind(requirementId).first() as any;
    
    if (!requirement) {
      return c.json({ error: 'Requirement not found' }, 404);
    }
    
    // 프로젝트 정보 가져오기
    const project = await DB.prepare('SELECT * FROM projects WHERE id = ?').bind(requirement.project_id).first() as any;
    
    // 해당 요건의 모든 질문/답변 가져오기
    const { results: questions } = await DB.prepare(
      'SELECT * FROM questions WHERE requirement_id = ?'
    ).bind(requirementId).all();
    
    const answersContext = [];
    
    for (const q of questions as any[]) {
      const answer = await DB.prepare(
        'SELECT * FROM answers WHERE question_id = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(q.id).first() as any;
      
      if (answer) {
        answersContext.push({
          question: q.question_text,
          answer: answer.answer_text,
        });
      }
    }
    
    // 답변이 없으면 파생 요건 생성 불가
    if (answersContext.length === 0) {
      return c.json({ success: false, message: '답변이 없어 파생 요건을 생성할 수 없습니다.' });
    }
    
    // AI로 파생 요건 생성
    const derivedResult = await generateDerivedRequirements(
      project.input_content || project.description || '',
      requirement.title,
      answersContext,
      apiKey,
      baseURL
    );
    
    // 파생 요건 저장
    for (const req of derivedResult.requirements) {
      await DB.prepare(
        'INSERT INTO requirements (project_id, parent_id, title, description, requirement_type, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        requirement.project_id,
        requirementId, // 원래 요건을 부모로 설정
        req.title,
        req.description,
        req.requirement_type,
        req.priority,
        'pending'
      ).run();
    }
    
    return c.json({ 
      success: true, 
      derived_count: derivedResult.requirements.length,
      requirements: derivedResult.requirements
    });
  } catch (error) {
    console.error('Derived requirements generation error:', error);
    return c.json({ error: 'Failed to generate derived requirements', message: String(error) }, 500);
  }
});

// ============ PRD 생성 API ============

// PRD 문서 생성
api.post('/projects/:id/generate-prd', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  
  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500);
  }
  
  try {
    // 프로젝트 정보 가져오기
    const project = await DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first() as any;
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // 모든 요건과 질문/답변 가져오기
    const { results: requirements } = await DB.prepare(
      'SELECT * FROM requirements WHERE project_id = ?'
    ).bind(id).all();
    
    const requirementsData = [];
    
    for (const req of requirements as any[]) {
      const { results: questions } = await DB.prepare(
        'SELECT * FROM questions WHERE requirement_id = ?'
      ).bind(req.id).all();
      
      const questionsWithAnswers = [];
      
      for (const q of questions as any[]) {
        const answer = await DB.prepare(
          'SELECT * FROM answers WHERE question_id = ? ORDER BY created_at DESC LIMIT 1'
        ).bind(q.id).first() as any;
        
        if (answer) {
          questionsWithAnswers.push({
            question_id: q.id,
            question: q.question_text,
            answer_id: answer.id,
            answer: answer.answer_text,
          });
        }
      }
      
      // 답변이 있는 요건만 포함
      if (questionsWithAnswers.length > 0) {
        requirementsData.push({
          requirement_id: req.id,
          title: req.title,
          description: req.description || '',
          questions: questionsWithAnswers,
        });
      }
    }
    
    console.log('PRD 생성 데이터:', JSON.stringify(requirementsData, null, 2));
    
    // PRD 생성
    const prd = await generatePRD(
      project.title,
      project.description || '',
      requirementsData,
      apiKey,
      baseURL
    );
    
    // PRD 저장 (메타데이터 포함)
    const prdData = {
      content: prd.content,
      metadata: {
        requirements: requirementsData,
        project: {
          title: project.title,
          description: project.description,
        }
      }
    };
    
    const result = await DB.prepare(
      'INSERT INTO prd_documents (project_id, content, metadata) VALUES (?, ?, ?)'
    ).bind(id, prd.content, JSON.stringify(prdData.metadata)).run();
    
    // 프로젝트 상태 업데이트
    await DB.prepare(
      'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('completed', id).run();
    
    return c.json({ success: true, prd_id: result.meta.last_row_id, content: prd.content });
  } catch (error) {
    console.error('PRD generation error:', error);
    return c.json({ error: 'PRD generation failed', message: String(error) }, 500);
  }
});

// PRD 문서 조회
api.get('/projects/:id/prd', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  const prd = await DB.prepare(
    'SELECT * FROM prd_documents WHERE project_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(id).first();
  
  if (!prd) {
    return c.json({ error: 'PRD not found' }, 404);
  }
  
  return c.json(prd);
});

// ============ 답변 수정 API ============

// 답변 수정
api.put('/answers/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body: { answer_text: string } = await c.req.json();
  
  try {
    await DB.prepare(
      'UPDATE answers SET answer_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(body.answer_text, id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Answer update error:', error);
    return c.json({ error: 'Failed to update answer' }, 500);
  }
});

// ============ 질문 삭제 API ============

// 질문 삭제 (관련 답변도 함께 삭제)
api.delete('/questions/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  try {
    // 관련 답변 삭제
    await DB.prepare('DELETE FROM answers WHERE question_id = ?').bind(id).run();
    
    // 질문 삭제
    await DB.prepare('DELETE FROM questions WHERE id = ?').bind(id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Question delete error:', error);
    return c.json({ error: 'Failed to delete question' }, 500);
  }
});

// ============ 추가 요건 생성 API ============

// 기존 요건과 중복되지 않는 새로운 요건 생성
api.post('/projects/:id/generate-additional-requirements', async (c) => {
  const { DB } = c.env;
  const projectId = c.req.param('id');
  
  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  
  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500);
  }
  
  try {
    // 프로젝트 정보
    const project = await DB.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first() as any;
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // 기존 요건 목록
    const { results: existingRequirements } = await DB.prepare(
      'SELECT id, title, description, requirement_type FROM requirements WHERE project_id = ?'
    ).bind(projectId).all();
    
    const existingRequirementsText = existingRequirements
      .map((req: any) => `- ${req.title}: ${req.description} (${req.requirement_type})`)
      .join('\n');
    
    // AI로 추가 요건 생성
    const systemPrompt = `당신은 시니어 기획자입니다. 기존 요건을 검토하고 **누락된 중요한 요건**을 찾아 추가하세요.

응답 형식:
{
  "requirements": [
    {
      "title": "요건명",
      "description": "설명",
      "requirement_type": "functional|non_functional|constraint",
      "priority": "high",
      "questions": [
        {
          "question_text": "질문",
          "question_type": "open"
        }
      ]
    }
  ]
}

규칙:
- 기존 요건과 중복되지 않는 새로운 요건만 생성
- 최대 3개까지만 생성
- 중요하고 실용적인 요건만 추가
- 기존 요건으로 충분하다면 빈 배열 반환`;

    const userPrompt = `프로젝트: ${project.title}
기획안: ${project.input_content || ''}

기존 요건:
${existingRequirementsText}

위 기존 요건을 검토하고, 중복되지 않으면서 꼭 필요한 추가 요건이 있다면 최대 3개 제안하세요.`;

    const content = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      apiKey,
      baseURL,
      true  // JSON mode
    );
    
    const result = JSON.parse(content);
    const newRequirements = result.requirements || [];
    
    // 새 요건 저장
    for (const req of newRequirements) {
      const reqResult = await DB.prepare(
        'INSERT INTO requirements (project_id, title, description, requirement_type, priority, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        projectId,
        req.title,
        req.description,
        req.requirement_type,
        req.priority,
        'pending'
      ).run();
      
      const requirementId = reqResult.meta.last_row_id;
      
      // 질문 저장
      for (const q of req.questions || []) {
        await DB.prepare(
          'INSERT INTO questions (requirement_id, question_text, question_type, display_order) VALUES (?, ?, ?, ?)'
        ).bind(requirementId, q.question_text, q.question_type, 0).run();
      }
    }
    
    return c.json({ 
      success: true, 
      added_count: newRequirements.length,
      requirements: newRequirements 
    });
  } catch (error) {
    console.error('Additional requirements generation error:', error);
    return c.json({ error: 'Failed to generate additional requirements', message: String(error) }, 500);
  }
});

export default api;
