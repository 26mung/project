import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, getCookie } from 'hono/cookie';
import type { Bindings, CreateProjectRequest, AnalyzeProjectRequest, CreateRequirementRequest, AnswerQuestionRequest, GeneratePRDRequest } from './types';
import { analyzeProjectRequirements, generateFollowUpQuestions, generatePRD, generateDerivedRequirements, evaluateProjectCompleteness, chatCompletion, suggestAdditionalCategories, generateRequirementsByCategory, recommendChallengeRequirements, analyzeChallengeDirection } from './ai-service';

const api = new Hono<{ Bindings: Bindings }>();

// CORS 설정
api.use('/*', cors());

// 간단한 비밀번호 상수
const APP_PASSWORD = '6116';
const SESSION_COOKIE_NAME = 'platform_session';

// ============ 인증 API ============

// 비밀번호 검증
api.post('/auth/verify', async (c) => {
  const body = await c.req.json();
  const { password } = body;
  
  // 디버깅 로그
  console.log('Received password:', JSON.stringify(password));
  console.log('Expected password:', JSON.stringify(APP_PASSWORD));
  console.log('Password length:', password?.length, 'Expected length:', APP_PASSWORD.length);
  console.log('Match:', password === APP_PASSWORD);
  
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
    'INSERT INTO projects (title, name, description, input_content, status, image_urls, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now", "+9 hours"), datetime("now", "+9 hours"))'
  ).bind(body.title, body.title, body.description || null, body.input_content || null, 'draft', body.image_urls || null).run();
  
  return c.json({ id: result.meta.last_row_id, ...body, status: 'draft' }, 201);
});

// 프로젝트 업데이트
api.put('/projects/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json();
  
  await DB.prepare(
    'UPDATE projects SET title = ?, description = ?, input_content = ?, status = ?, image_urls = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
  ).bind(body.title, body.description, body.input_content, body.status, body.image_urls || null, id).run();
  
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
  const body = await c.req.json();
  
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
    
    // 이미지 URL 가져오기
    const imageUrls = body.image_urls || [];
    console.log(`[평가] 텍스트 기획안 + 이미지 ${imageUrls.length}장 평가 시작`);
    
    const evaluation = await evaluateProjectCompleteness(
      project.title,
      project.description || '',
      project.input_content || '',
      apiKey,
      baseURL,
      imageUrls
    );
    
    // 평가 결과를 프로젝트에 저장
    await DB.prepare(`
      UPDATE projects 
      SET last_evaluation = ?, updated_at = datetime("now", "+9 hours")
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
      'UPDATE projects SET status = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind('analyzing', id).run();
    
    // AI 분석 실행 (이미지 URL 포함)
    const imageUrls = body.image_urls || [];
    console.log(`[분석] 텍스트 기획안 + 이미지 ${imageUrls.length}장 분석 시작`);
    
    const analysis = await analyzeProjectRequirements(
      body.input_content, 
      apiKey, 
      baseURL,
      imageUrls
    );
    
    // 요건 및 질문 저장
    for (const req of analysis.requirements) {
      const reqResult = await DB.prepare(
        'INSERT INTO requirements (project_id, title, description, requirement_type, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now", "+9 hours"), datetime("now", "+9 hours"))'
      ).bind(id, req.title, req.description, req.requirement_type, req.priority, 'pending').run();
      
      const reqId = reqResult.meta.last_row_id;
      
      // 질문 저장
      for (let i = 0; i < req.questions.length; i++) {
        const q = req.questions[i];
        await DB.prepare(
          'INSERT INTO questions (requirement_id, question_text, question_type, options, order_index, created_at) VALUES (?, ?, ?, ?, ?, datetime("now", "+9 hours"))'
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
      'UPDATE projects SET status = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind('in_progress', id).run();
    
    return c.json({ success: true, requirements_count: analysis.requirements.length });
  } catch (error) {
    console.error('Analysis error:', error);
    await DB.prepare(
      'UPDATE projects SET status = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind('draft', id).run();
    
    return c.json({ error: 'Analysis failed', message: String(error) }, 500);
  }
});

// ============ 요건 API ============

// 프로젝트의 모든 요건 조회 (계층 구조)
api.get('/projects/:id/requirements', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  console.log('[Performance] Fetching requirements with stats...');
  const startTime = Date.now();
  
  // 🚀 최적화: JOIN을 사용해 한 번에 모든 데이터 가져오기
  const { results: rawData } = await DB.prepare(`
    SELECT 
      r.*,
      q.id as question_id,
      a.id as answer_id
    FROM requirements r
    LEFT JOIN questions q ON q.requirement_id = r.id
    LEFT JOIN answers a ON a.question_id = q.id
    WHERE r.project_id = ?
    ORDER BY r.parent_id, r.order_index
  `).bind(id).all();
  
  // 요건별로 그룹화하고 통계 계산
  const requirementsMap = new Map();
  
  for (const row of rawData as any[]) {
    const reqId = row.id;
    
    if (!requirementsMap.has(reqId)) {
      requirementsMap.set(reqId, {
        id: row.id,
        project_id: row.project_id,
        parent_id: row.parent_id,
        title: row.title,
        description: row.description,
        requirement_type: row.requirement_type,
        priority: row.priority,
        status: row.status,
        order_index: row.order_index,
        created_at: row.created_at,
        updated_at: row.updated_at,
        questions: new Set(),
        answers: new Set()
      });
    }
    
    const req = requirementsMap.get(reqId);
    if (row.question_id) req.questions.add(row.question_id);
    if (row.answer_id) req.answers.add(row.answer_id);
  }
  
  // Set을 배열로 변환하고 통계 계산
  const requirementsWithStats = Array.from(requirementsMap.values()).map(req => {
    const totalQuestions = req.questions.size;
    const answeredCount = req.answers.size;
    
    return {
      id: req.id,
      project_id: req.project_id,
      parent_id: req.parent_id,
      title: req.title,
      description: req.description,
      requirement_type: req.requirement_type,
      priority: req.priority,
      status: req.status,
      order_index: req.order_index,
      created_at: req.created_at,
      updated_at: req.updated_at,
      question_stats: {
        total: totalQuestions,
        answered: answeredCount,
        remaining: totalQuestions - answeredCount
      }
    };
  });
  
  const queryTime = Date.now() - startTime;
  console.log(`[Performance] Requirements fetched in ${queryTime}ms`);
  
  return c.json(requirementsWithStats);
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
  
  // 🐛 FIX: question_stats 추가 (진행률 표시용)
  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter((q: any) => q.answer).length;
  const remainingQuestions = totalQuestions - answeredQuestions;
  
  const questionStats = {
    total: totalQuestions,
    answered: answeredQuestions,
    remaining: remainingQuestions
  };
  
  return c.json({ ...requirement, questions, question_stats: questionStats });
});

// 요건 생성
api.post('/requirements', async (c) => {
  const { DB } = c.env;
  const body: CreateRequirementRequest = await c.req.json();
  
  const result = await DB.prepare(
    'INSERT INTO requirements (project_id, parent_id, title, description, requirement_type, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now", "+9 hours"), datetime("now", "+9 hours"))'
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
      'INSERT INTO answers (question_id, answer_text, created_at) VALUES (?, ?, datetime("now", "+9 hours"))'
    ).bind(id, body.answer_text).run();
  }
  
  // 질문의 requirement_id 가져오기 (즉시 반환용)
  const question = await DB.prepare('SELECT requirement_id FROM questions WHERE id = ?').bind(id).first() as any;
  const requirementId = question?.requirement_id;
  
  // 🚀 최적화: 답변만 즉시 저장하고 바로 응답 (파생 질문은 비동기로 생성)
  // 파생 질문 생성을 백그라운드로 처리 (non-blocking)
  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  
  if (apiKey && question) {
    // 백그라운드 처리 (응답을 기다리지 않음)
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const requirement = await DB.prepare('SELECT * FROM requirements WHERE id = ?').bind(question.requirement_id).first() as any;
          if (!requirement) return;
          
          const fullQuestion = await DB.prepare('SELECT * FROM questions WHERE id = ?').bind(id).first() as any;
          const followUpQuestions = await generateFollowUpQuestions(
            requirement.title,
            fullQuestion.question_text,
            body.answer_text,
            apiKey,
            baseURL
          );
          
          // 파생 질문 저장
          for (const fq of followUpQuestions) {
            await DB.prepare(
              'INSERT INTO questions (requirement_id, question_text, question_type, order_index, created_at) VALUES (?, ?, ?, 0, datetime("now", "+9 hours"))'
            ).bind(question.requirement_id, fq.question_text, fq.question_type).run();
          }
          
          console.log(`[답변 저장] 파생 질문 ${followUpQuestions.length}개 생성 완료 (비동기)`);
        } catch (error) {
          console.error('Follow-up generation error (background):', error);
        }
      })()
    );
  }
  
  // 즉시 응답 반환 (0.5초 이내)
  return c.json({ 
    success: true, 
    requirement_id: requirementId,
    message: '답변이 저장되었습니다. 파생 질문은 백그라운드에서 생성됩니다.'
  });
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
        'INSERT INTO requirements (project_id, parent_id, title, description, requirement_type, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now", "+9 hours"), datetime("now", "+9 hours"))'
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
    
    // 🚀 최적화: JOIN을 사용해 한 번에 모든 데이터 가져오기 (N+1 문제 해결)
    console.log('[Performance] Fetching all requirements, questions, and answers with JOIN...');
    const queryStartTime = Date.now();
    
    const { results: rawData } = await DB.prepare(`
      SELECT 
        r.id as requirement_id,
        r.title as requirement_title,
        r.description as requirement_description,
        q.id as question_id,
        q.question_text,
        a.id as answer_id,
        a.answer_text
      FROM requirements r
      LEFT JOIN questions q ON q.requirement_id = r.id
      LEFT JOIN answers a ON a.question_id = q.id
      WHERE r.project_id = ?
      ORDER BY r.id, q.id
    `).bind(id).all();
    
    const queryTime = Date.now() - queryStartTime;
    console.log(`[Performance] Data fetched in ${queryTime}ms`);
    
    // 데이터 그룹화
    const requirementsMap = new Map();
    
    for (const row of rawData as any[]) {
      const reqId = row.requirement_id;
      
      if (!requirementsMap.has(reqId)) {
        requirementsMap.set(reqId, {
          requirement_id: reqId,
          title: row.requirement_title,
          description: row.requirement_description || '',
          questions: []
        });
      }
      
      // 답변이 있는 질문만 추가
      if (row.question_id && row.answer_id) {
        requirementsMap.get(reqId).questions.push({
          question_id: row.question_id,
          question: row.question_text,
          answer_id: row.answer_id,
          answer: row.answer_text,
        });
      }
    }
    
    // 답변이 있는 요건만 최종 배열에 포함
    const requirementsData = Array.from(requirementsMap.values()).filter(req => req.questions.length > 0);
    
    for (const req of requirementsData) {
      console.log(`✅ 요건 포함: ${req.title} (답변된 질문: ${req.questions.length}개)`);
    }
    
    console.log('========================================');
    console.log('📊 PRD 생성 최종 데이터');
    console.log('========================================');
    console.log('전체 요건 수:', requirementsMap.size);
    console.log('답변된 요건 수:', requirementsData.length);
    console.log('포함된 요건:', requirementsData.map(r => r.title).join(', '));
    console.log('========================================');
    
    // PRD 생성 (동기 처리 - 완료될 때까지 대기)
    console.log('[PRD 생성] 시작...');
    const startTime = Date.now();
    
    const prd = await generatePRD(
      project.title,
      project.description || '',
      requirementsData,
      apiKey,
      baseURL
    );
    
    const generationTime = Date.now() - startTime;
    console.log(`[PRD 생성] 완료 (${generationTime}ms)`);
    
    // PRD 저장
    const prdData = {
      requirements: requirementsData,
      project: {
        title: project.title,
        description: project.description,
      },
      generation_time_ms: generationTime
    };
    
    const result = await DB.prepare(
      'INSERT INTO prd_documents (project_id, content, metadata, version, created_at) VALUES (?, ?, ?, ?, datetime("now", "+9 hours"))'
    ).bind(id, prd.content, JSON.stringify(prdData), 1).run();
    
    // 프로젝트 상태 업데이트
    await DB.prepare(
      'UPDATE projects SET status = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind('completed', id).run();
    
    console.log(`[PRD 생성] 저장 완료 (ID: ${result.meta.last_row_id})`);
    
    return c.json({
      success: true,
      prd_id: result.meta.last_row_id,
      content: prd.content
    });
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

// PRD 삭제
api.delete('/prd/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  
  try {
    await DB.prepare('DELETE FROM prd_documents WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to delete PRD:', error);
    return c.json({ error: 'Failed to delete PRD' }, 500);
  }
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
        'INSERT INTO requirements (project_id, title, description, requirement_type, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now", "+9 hours"), datetime("now", "+9 hours"))'
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
          'INSERT INTO questions (requirement_id, question_text, question_type, order_index, created_at) VALUES (?, ?, ?, ?, datetime("now", "+9 hours"))'
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

// 추가 요건 카테고리 추천 API
api.get('/projects/:id/suggest-categories', async (c) => {
  const { DB } = c.env;
  const projectId = c.req.param('id');
  
  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1';
  
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
      'SELECT title, description FROM requirements WHERE project_id = ? AND parent_id IS NULL'
    ).bind(projectId).all();
    
    // AI로 카테고리 추천
    const result = await suggestAdditionalCategories(
      project.title,
      project.description || project.input_content || '',
      existingRequirements as any[],
      apiKey,
      baseURL
    );
    
    return c.json(result);
  } catch (error) {
    console.error('Category suggestion error:', error);
    return c.json({ error: 'Failed to suggest categories', message: String(error) }, 500);
  }
});

// 카테고리별 요건 생성 API
api.post('/projects/:id/generate-by-category', async (c) => {
  const { DB } = c.env;
  const projectId = c.req.param('id');
  const { category } = await c.req.json() as { category: string };
  
  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1';
  
  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500);
  }
  
  if (!category) {
    return c.json({ error: 'Category is required' }, 400);
  }
  
  try {
    // 프로젝트 정보
    const project = await DB.prepare('SELECT * FROM projects WHERE id = ?').bind(projectId).first() as any;
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // 기존 요건 목록
    const { results: existingRequirements } = await DB.prepare(
      'SELECT title, description FROM requirements WHERE project_id = ? AND parent_id IS NULL'
    ).bind(projectId).all();
    
    // AI로 요건 생성
    const result = await generateRequirementsByCategory(
      project.title,
      project.description || project.input_content || '',
      category,
      existingRequirements as any[],
      apiKey,
      baseURL
    );
    
    // 요건 저장
    const addedRequirements = [];
    
    for (const req of result.requirements) {
      const requirementResult = await DB.prepare(
        'INSERT INTO requirements (project_id, title, description, requirement_type, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now", "+9 hours"), datetime("now", "+9 hours"))'
      ).bind(
        projectId,
        req.title,
        req.description,
        req.requirement_type || 'functional',
        req.priority || 'medium',
        'pending'
      ).run();
      
      const requirementId = requirementResult.meta.last_row_id;
      
      // 질문 저장
      for (const q of req.questions || []) {
        await DB.prepare(
          'INSERT INTO questions (requirement_id, question_text, question_type, order_index, created_at) VALUES (?, ?, ?, ?, datetime("now", "+9 hours"))'
        ).bind(requirementId, q.question_text, q.question_type, 0).run();
      }
      
      addedRequirements.push({
        id: requirementId,
        ...req
      });
    }
    
    // 프로젝트 상태 업데이트
    await DB.prepare(
      'UPDATE projects SET status = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind('in_progress', projectId).run();
    
    return c.json({ 
      success: true, 
      added_count: addedRequirements.length,
      requirements: addedRequirements 
    });
  } catch (error) {
    console.error('Requirements generation error:', error);
    return c.json({ error: 'Failed to generate requirements', message: String(error) }, 500);
  }
});


// ============ 챌린지형 요건 관리 API ============

// 요건 모드 선택 (initial vs challenge)
api.post('/projects/:id/select-requirement-mode', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const { mode } = await c.req.json() as { mode: 'initial' | 'challenge' };

  try {
    await DB.prepare(
      'UPDATE projects SET requirement_mode = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind(mode, id).run();

    return c.json({ success: true, mode });
  } catch (error) {
    console.error('Mode selection error:', error);
    return c.json({ error: 'Failed to set mode' }, 500);
  }
});

// 챌린지형: 5개 요건 추천
api.post('/projects/:id/recommend-requirements', async (c) => {
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

    // 기존 요건 조회
    const { results: existingRequirements } = await DB.prepare(
      'SELECT title, keywords FROM requirements WHERE project_id = ?'
    ).bind(id).all();

    const { results: completedRequirements } = await DB.prepare(
      'SELECT title FROM requirements WHERE project_id = ? AND challenge_status = "completed"'
    ).bind(id).all();

    const { results: declinedRequirements } = await DB.prepare(
      'SELECT title FROM requirements WHERE project_id = ? AND challenge_status = "declined"'
    ).bind(id).all();

    const imageUrls = project.image_urls ? JSON.parse(project.image_urls) : [];

    // AI로 5개 요건 추천
    const recommendations = await recommendChallengeRequirements(
      project.title,
      project.description || '',
      project.input_content || '',
      existingRequirements as any,
      completedRequirements as any,
      declinedRequirements as any,
      imageUrls,
      apiKey,
      baseURL
    );

    return c.json(recommendations);
  } catch (error) {
    console.error('Recommendation error:', error);
    return c.json({ error: 'Failed to recommend requirements', message: String(error) }, 500);
  }
});

// 챌린지형: 방향성 분석
api.post('/requirements/:id/analyze-direction', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500);
  }

  try {
    const requirement = await DB.prepare('SELECT * FROM requirements WHERE id = ?').bind(id).first() as any;

    if (!requirement) {
      return c.json({ error: 'Requirement not found' }, 404);
    }

    const project = await DB.prepare('SELECT * FROM projects WHERE id = ?').bind(requirement.project_id).first() as any;

    // AI로 방향성 분석
    const analysis = await analyzeChallengeDirection(
      requirement.title,
      requirement.description || '',
      project.input_content || '',
      apiKey,
      baseURL
    );

    // 방향성 저장
    await DB.prepare(
      'UPDATE requirements SET direction_analysis = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind(JSON.stringify(analysis), id).run();

    // 질문 저장
    for (let i = 0; i < analysis.questions.length; i++) {
      const q = analysis.questions[i];
      await DB.prepare(
        'INSERT INTO questions (requirement_id, question_text, question_type, options, order_index, created_at) VALUES (?, ?, ?, ?, ?, datetime("now", "+9 hours"))'
      ).bind(
        id,
        q.question_text,
        q.question_type,
        q.options ? JSON.stringify(q.options) : null,
        i
      ).run();
    }

    return c.json({ success: true, analysis });
  } catch (error) {
    console.error('Direction analysis error:', error);
    return c.json({ error: 'Failed to analyze direction', message: String(error) }, 500);
  }
});

// 챌린지형: 요건 방향성 미리보기 (저장 없이 분석만)
api.post('/requirements/preview-direction', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as {
    project_id: number;
    title: string;
    description: string;
    requirement_type: string;
    priority: string;
  };

  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500);
  }

  try {
    const project = await DB.prepare('SELECT * FROM projects WHERE id = ?').bind(body.project_id).first() as any;

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // AI로 방향성 분석 (저장 없이 분석만)
    const analysis = await analyzeChallengeDirection(
      body.title,
      body.description || '',
      project.input_content || '',
      apiKey,
      baseURL
    );

    return c.json({ success: true, analysis });
  } catch (error) {
    console.error('Preview direction error:', error);
    return c.json({ error: 'Failed to analyze direction', message: String(error) }, 500);
  }
});

// 챌린지형: 요건 수락
api.post('/requirements/:id/accept', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  try {
    await DB.prepare(
      'UPDATE requirements SET challenge_status = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind('accepted', id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Accept error:', error);
    return c.json({ error: 'Failed to accept requirement' }, 500);
  }
});

// 챌린지형: 요건 거절
api.post('/requirements/:id/decline', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  try {
    await DB.prepare(
      'UPDATE requirements SET challenge_status = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind('declined', id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Decline error:', error);
    return c.json({ error: 'Failed to decline requirement' }, 500);
  }
});

// 챌린지형: 요건 완성
api.post('/requirements/:id/complete', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  try {
    await DB.prepare(
      'UPDATE requirements SET challenge_status = ?, status = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind('completed', 'completed', id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Complete error:', error);
    return c.json({ error: 'Failed to complete requirement' }, 500);
  }
});


export default api;
