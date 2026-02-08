import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, getCookie } from 'hono/cookie';
import type { Bindings, CreateProjectRequest, AnalyzeProjectRequest, CreateRequirementRequest, AnswerQuestionRequest, GeneratePRDRequest } from './types';
import { analyzeProjectRequirements, generateFollowUpQuestions, generatePRD, generateDerivedRequirements, evaluateProjectCompleteness, chatCompletion, suggestAdditionalCategories, generateRequirementsByCategory, recommendChallengeRequirements, analyzeChallengeDirection, chatBasedRequirementRecommendation } from './ai-service';

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
  const { DB } = c.env;
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  
  if (!sessionToken) {
    return c.json({ authenticated: false });
  }
  
  try {
    // 세션 및 사용자 정보 조회
    const session = await DB.prepare(
      'SELECT s.*, u.id as user_id, u.email, u.name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = ? AND s.expires_at > datetime("now", "+9 hours")'
    ).bind(sessionToken).first();
    
    if (!session) {
      return c.json({ authenticated: false });
    }
    
    // 사용자 역할 조회
    const roles = await DB.prepare(
      `SELECT r.name, r.display_name, r.level 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id = ?
       ORDER BY r.level DESC`
    ).bind(session.user_id).all();
    
    // 최고 권한 레벨 확인
    const maxLevel = roles.results && roles.results.length > 0 
      ? Math.max(...roles.results.map((r: any) => r.level))
      : 0;
    
    const isSuperAdmin = roles.results?.some((r: any) => r.name === 'super_admin') || false;
    const isAdmin = roles.results?.some((r: any) => r.name === 'admin' || r.name === 'super_admin') || false;
    
    return c.json({ 
      authenticated: true,
      user: {
        id: session.user_id,
        email: session.email,
        name: session.name,
        roles: roles.results || [],
        isSuperAdmin,
        isAdmin,
        maxLevel
      }
    });
  } catch (error) {
    console.error('[Auth Check Error]', error);
    return c.json({ authenticated: false });
  }
});

// ============ 신규 사용자 인증 API ============

// 이메일 인증코드 발송
api.post('/auth/send-verification', async (c) => {
  const { DB, RESEND_API_KEY } = c.env;
  const body = await c.req.json();
  const { email } = body;
  
  if (!email || !email.includes('@')) {
    return c.json({ error: 'Invalid email address' }, 400);
  }
  
  // 6자리 랜덤 코드 생성
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 만료 시간 (5분 후)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  
  // DB에 저장
  await DB.prepare(
    'INSERT INTO email_verifications (email, verification_code, expires_at) VALUES (?, ?, ?)'
  ).bind(email, code, expiresAt).run();
  
  // Resend API로 이메일 발송
  let emailSent = false;
  if (RESEND_API_KEY) {
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: email,
          subject: '플랫폼기획팀 - 이메일 인증 코드',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .header { text-align: center; margin-bottom: 40px; }
                .logo { font-size: 28px; font-weight: 800; color: #007AFF; margin-bottom: 10px; }
                .code-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; }
                .code { font-size: 48px; font-weight: 800; letter-spacing: 8px; margin: 20px 0; }
                .info { background: #f5f5f7; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .footer { text-align: center; color: #6e6e73; font-size: 14px; margin-top: 40px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">플랫폼기획팀</div>
                  <p style="color: #6e6e73;">이메일 인증 코드가 도착했습니다</p>
                </div>
                
                <div class="code-box">
                  <p style="margin: 0; font-size: 16px; opacity: 0.9;">인증 코드</p>
                  <div class="code">${code}</div>
                  <p style="margin: 0; font-size: 14px; opacity: 0.8;">5분 이내에 입력해주세요</p>
                </div>
                
                <div class="info">
                  <p style="margin: 0 0 10px 0;"><strong>📧 이메일 인증 안내</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>위 6자리 코드를 회원가입 페이지에 입력해주세요</li>
                    <li>이 코드는 <strong>5분 후</strong> 자동으로 만료됩니다</li>
                    <li>본인이 요청하지 않았다면 이 이메일을 무시하셔도 됩니다</li>
                  </ul>
                </div>
                
                <div class="footer">
                  <p>이 이메일은 플랫폼기획팀 회원가입 요청에 대한 자동 발송 메일입니다.</p>
                  <p style="margin-top: 10px;">© 2024 플랫폼기획팀. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      });
      
      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('[Resend Error]', errorText);
        // 이메일 발송 실패해도 계속 진행 (코드는 DB에 저장됨)
        emailSent = false;
      } else {
        console.log(`[Email Sent] Code sent to ${email}`);
        emailSent = true;
      }
    } catch (error) {
      console.error('[Email Error]', error);
      // 이메일 발송 실패해도 계속 진행
      emailSent = false;
    }
  } else {
    console.log(`[Dev Mode] Code for ${email}: ${code}`);
  }
  
  // 개발 환경에서는 코드를 응답에 포함 (실제 운영에서는 제거)
  return c.json({ 
    success: true, 
    message: 'Verification code sent',
    // 개발 환경용: 이메일 발송 실패 시 또는 API 키가 없을 때 코드 표시
    dev_code: (!RESEND_API_KEY || !emailSent) ? code : undefined 
  });
});

// 이메일 인증코드 확인
api.post('/auth/verify-code', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { email, code } = body;
  
  if (!email || !code) {
    return c.json({ error: 'Email and code are required' }, 400);
  }
  
  // 최신 인증코드 조회
  const verification = await DB.prepare(
    'SELECT * FROM email_verifications WHERE email = ? AND verification_code = ? AND is_used = 0 ORDER BY created_at DESC LIMIT 1'
  ).bind(email, code).first();
  
  if (!verification) {
    return c.json({ error: 'Invalid verification code' }, 400);
  }
  
  // 만료 확인
  const now = new Date();
  const expiresAt = new Date(verification.expires_at as string);
  
  if (now > expiresAt) {
    return c.json({ error: 'Verification code expired' }, 400);
  }
  
  // 사용 처리
  await DB.prepare(
    'UPDATE email_verifications SET is_used = 1 WHERE id = ?'
  ).bind(verification.id).run();
  
  return c.json({ success: true, message: 'Email verified' });
});

// 회원가입
api.post('/auth/signup', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { email, password, name, birth_date } = body;
  
  if (!email || !password || !name) {
    return c.json({ error: 'Email, password, and name are required' }, 400);
  }
  
  // 이메일 중복 확인
  const existingUser = await DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();
  
  if (existingUser) {
    return c.json({ error: 'Email already registered' }, 409);
  }
  
  // 비밀번호 해시 (간단한 방식, 실제로는 bcrypt 사용 권장)
  const passwordHash = await hashPassword(password);
  
  // 사용자 생성
  const result = await DB.prepare(
    'INSERT INTO users (email, password_hash, name, birth_date, is_email_verified) VALUES (?, ?, ?, ?, ?)'
  ).bind(email, passwordHash, name, birth_date || null, 1).run();
  
  const userId = result.meta.last_row_id;
  
  // 기본 'user' 역할 부여
  const userRole = await DB.prepare('SELECT id FROM roles WHERE name = ?').bind('user').first();
  if (userRole) {
    await DB.prepare(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)'
    ).bind(userId, userRole.id).run();
  }
  
  return c.json({ 
    success: true, 
    message: 'User created',
    user_id: userId 
  }, 201);
});

// 로그인
api.post('/auth/login', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json();
  const { email, password } = body;
  
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }
  
  // 사용자 조회
  const user = await DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first();
  
  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }
  
  // 비밀번호 확인
  const isValid = await verifyPassword(password, user.password_hash as string);
  
  if (!isValid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }
  
  // 세션 토큰 생성
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7일
  
  // 세션 저장
  await DB.prepare(
    'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)'
  ).bind(user.id, sessionToken, expiresAt).run();
  
  // 마지막 로그인 시간 업데이트
  await DB.prepare(
    'UPDATE users SET last_login_at = datetime("now", "+9 hours") WHERE id = ?'
  ).bind(user.id).run();
  
  // 쿠키 설정
  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
    maxAge: 7 * 24 * 60 * 60,
    httpOnly: true,
    path: '/'
  });
  
  return c.json({ 
    success: true, 
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

// ============ Helper Functions ============

async function hashPassword(password: string): Promise<string> {
  // 간단한 해시 (실제로는 bcrypt 사용 권장)
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// ============ 프로젝트 API ============

// 모든 프로젝트 조회
api.get('/projects', async (c) => {
  const { DB } = c.env;
  
  // 생성자 정보를 포함한 프로젝트 조회 (LEFT JOIN으로 user_id가 null인 경우도 처리)
  const { results } = await DB.prepare(`
    SELECT 
      p.*,
      u.name as creator_name,
      u.email as creator_email
    FROM projects p
    LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.updated_at DESC
  `).all();
  
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
    'INSERT INTO projects (title, description, input_content, status, image_urls, requirement_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now", "+9 hours"), datetime("now", "+9 hours"))'
  ).bind(body.title, body.description || null, body.input_content || null, 'draft', body.image_urls || null, null).run();
  
  return c.json({ id: result.meta.last_row_id, ...body, status: 'draft', requirement_mode: null }, 201);
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
  
  // 환경 변수에서 OpenAI 설정 가져오기
  const apiKey = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const baseURL = c.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  
  if (!apiKey) {
    return c.json({ error: 'OpenAI API key not configured' }, 500);
  }
  
  try {
    // 프로젝트 정보 조회
    const projectResult = await DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
    if (!projectResult) {
      return c.json({ error: 'Project not found' }, 404);
    }
    
    // 프로젝트 상태 업데이트
    await DB.prepare(
      'UPDATE projects SET status = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind('analyzing', id).run();
    
    // 요청 본문에서 이미지 URL 가져오기 (선택적)
    let body: any = {};
    try {
      body = await c.req.json();
    } catch (e) {
      // JSON 파싱 실패 시 빈 객체 사용
      console.log('[Analyze] No request body or invalid JSON, using project data');
    }
    
    // AI 분석 실행 (이미지 URL 포함)
    const imageUrls = body.image_urls || [];
    console.log(`[분석] 텍스트 기획안 + 이미지 ${imageUrls.length}장 분석 시작`);
    
    const analysis = await analyzeProjectRequirements(
      projectResult.input_content, 
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
  } catch (error: any) {
    console.error('[Analysis Error] Full error:', error);
    console.error('[Analysis Error] Stack:', error.stack);
    console.error('[Analysis Error] API Key present:', !!apiKey);
    console.error('[Analysis Error] API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'none');
    console.error('[Analysis Error] Base URL:', baseURL);
    
    await DB.prepare(
      'UPDATE projects SET status = ?, updated_at = datetime("now", "+9 hours") WHERE id = ?'
    ).bind('draft', id).run();
    
    // 더 자세한 에러 메시지 반환
    let errorMessage = error.message || String(error);
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = 'OpenAI API 인증 실패: API 키를 확인하세요. 올바른 형식은 sk-... 입니다.';
    } else if (errorMessage.includes('429')) {
      errorMessage = 'OpenAI API 호출 한도 초과입니다.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('Abort')) {
      errorMessage = 'AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도하세요.';
    }
    
    return c.json({ 
      error: 'Analysis failed', 
      message: errorMessage,
      details: error.stack || 'No stack trace'
    }, 500);
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

// 질문 생성 (요건에 매핑)
api.post('/questions', async (c) => {
  const { DB } = c.env;
  const body = await c.req.json() as {
    requirement_id: number;
    question_text: string;
    question_type: string;
    order_index: number;
  };
  
  try {
    console.log('[POST /questions] Received request:', JSON.stringify(body));
    
    // 필수 필드 검증
    if (!body.requirement_id || !body.question_text) {
      console.error('[POST /questions] Missing required fields');
      return c.json({ error: 'requirement_id and question_text are required' }, 400);
    }
    
    const result = await DB.prepare(
      'INSERT INTO questions (requirement_id, question_text, question_type, order_index, created_at) VALUES (?, ?, ?, ?, datetime("now", "+9 hours"))'
    ).bind(
      body.requirement_id,
      body.question_text,
      body.question_type || 'open',
      body.order_index || 1
    ).run();
    
    console.log('[POST /questions] Question created successfully:', result.meta.last_row_id);
    
    return c.json({ 
      success: true,
      id: result.meta.last_row_id, 
      ...body 
    }, 201);
  } catch (error) {
    console.error('[POST /questions] Failed to create question:', error);
    console.error('[POST /questions] Error details:', String(error));
    return c.json({ error: 'Failed to create question', message: String(error) }, 500);
  }
});

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

// 챌린지형: AI 채팅 기반 요건 추천
api.post('/projects/:id/chat-requirement', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');
  const body = await c.req.json() as {
    messages: { role: string; content: string }[];
    project_context: { title: string; description: string; input_content: string };
  };

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

    const imageUrls = project.image_urls ? JSON.parse(project.image_urls) : [];

    // AI 채팅 기반 요건 추천
    const result = await chatBasedRequirementRecommendation(
      body.messages,
      project.title,
      project.description || '',
      project.input_content || '',
      existingRequirements as any,
      imageUrls,
      apiKey,
      baseURL
    );

    return c.json(result);
  } catch (error) {
    console.error('Chat requirement error:', error);
    return c.json({ error: 'Failed to process chat', message: String(error) }, 500);
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

// ============ 질문 API (중복 제거됨 - 첫 번째 구현 사용) ============

// 질문 목록 조회
api.get('/requirements/:id/questions', async (c) => {
  const { DB } = c.env;
  const requirementId = c.req.param('id');

  try {
    const questions = await DB.prepare(
      'SELECT * FROM questions WHERE requirement_id = ? ORDER BY order_index ASC'
    ).bind(requirementId).all();

    return c.json(questions.results || []);
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    return c.json({ error: 'Failed to fetch questions' }, 500);
  }
});


// ============ AI 챗봇 API ============

// AI 챗봇 메시지
api.post('/chat/message', async (c) => {
  try {
    const body = await c.req.json() as {
      message: string;
      project_id?: number;
      conversation_history?: Array<{ role: string; content: string }>;
    };

    const { message, project_id, conversation_history = [] } = body;

    if (!message || message.trim().length === 0) {
      return c.json({ error: 'Message is required' }, 400);
    }

    // API Key 가져오기
    const apiKey = c.env.OPENAI_API_KEY || '';
    const baseURL = c.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    // 시스템 프롬프트 구성
    let systemPrompt = `당신은 프로젝트 요건 작성을 돕는 AI 도우미입니다. 
사용자의 질문에 친절하고 전문적으로 답변하세요.

주요 역할:
1. 요건 작성 관련 질문에 답변
2. 질문 아이디어 제안
3. 진도 확인 및 피드백
4. 요건 검토 및 개선 제안

답변은 간결하고 명확하게 작성하며, 필요시 예시를 포함하세요.`;

    // 프로젝트 컨텍스트 추가
    if (project_id) {
      const { DB } = c.env;
      const project = await DB.prepare('SELECT * FROM projects WHERE id = ?')
        .bind(project_id)
        .first();
      
      if (project) {
        const requirements = await DB.prepare(
          'SELECT * FROM requirements WHERE project_id = ? ORDER BY created_at DESC LIMIT 5'
        ).bind(project_id).all();
        
        systemPrompt += `\n\n현재 프로젝트 정보:
- 프로젝트명: ${(project as any).title}
- 설명: ${(project as any).description || '없음'}
- 최근 요건 수: ${requirements.results?.length || 0}개`;
      }
    }

    // 대화 기록과 함께 API 호출
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation_history,
      { role: 'user', content: message }
    ];

    const response = await chatCompletion(
      messages,
      apiKey,
      baseURL,
      false // JSON mode 비활성화
    );

    return c.json({
      success: true,
      message: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[POST /chat/message] Error:', error);
    return c.json({
      error: 'Failed to process chat message',
      message: String(error)
    }, 500);
  }
});


// ============ Admin APIs ============

// 전체 사용자 목록 조회 (관리자 전용)
api.get('/admin/users', async (c) => {
  const { DB } = c.env;
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  try {
    // 세션 확인 및 관리자 권한 체크
    const session = await DB.prepare(
      'SELECT s.*, u.id as user_id FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = ? AND s.expires_at > datetime("now", "+9 hours")'
    ).bind(sessionToken).first();
    
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // 관리자 권한 확인
    const userRoles = await DB.prepare(
      `SELECT r.name, r.level 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id = ?`
    ).bind(session.user_id).all();
    
    const isSuperAdmin = userRoles.results?.some((r: any) => r.name === 'super_admin') || false;
    
    if (!isSuperAdmin) {
      return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }
    
    // 모든 사용자 정보 조회
    const users = await DB.prepare(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.birth_date,
        u.is_email_verified,
        u.created_at,
        u.updated_at,
        u.last_login_at
      FROM users u
      ORDER BY u.created_at DESC
    `).all();
    
    // 각 사용자의 역할 정보 조회
    const usersWithRoles = await Promise.all(
      users.results.map(async (user: any) => {
        const roles = await DB.prepare(
          `SELECT r.name, r.display_name, r.level 
           FROM user_roles ur 
           JOIN roles r ON ur.role_id = r.id 
           WHERE ur.user_id = ?
           ORDER BY r.level DESC`
        ).bind(user.id).all();
        
        const maxLevel = roles.results && roles.results.length > 0 
          ? Math.max(...roles.results.map((r: any) => r.level))
          : 0;
        
        const isSuperAdmin = roles.results?.some((r: any) => r.name === 'super_admin') || false;
        const isAdmin = roles.results?.some((r: any) => r.name === 'admin' || r.name === 'super_admin') || false;
        
        return {
          ...user,
          roles: roles.results || [],
          isSuperAdmin,
          isAdmin,
          maxLevel
        };
      })
    );
    
    return c.json(usersWithRoles);
  } catch (error) {
    console.error('[Admin Users List Error]', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});


export default api;
