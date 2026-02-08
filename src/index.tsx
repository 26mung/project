import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import api from './api'
import type { Bindings } from './types'


const ONBOARDING_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>플랫폼기획팀 - AI가 완성하는 당신의 아이디어</title>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --primary: #007AFF;
      --primary-dark: #0051D5;
      --text-primary: #1d1d1f;
      --text-secondary: #6e6e73;
      --bg-light: #fbfbfd;
      --bg-dark: #000000;
      --gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --gradient-2: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      --gradient-3: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      overflow-x: hidden;
      scroll-behavior: smooth;
      background: #fff;
      color: var(--text-primary);
    }
    
    /* ========== Navigation ========== */
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(0px);
      background: rgba(255, 255, 255, 0);
    }
    
    .navbar.scrolled {
      backdrop-filter: blur(20px);
      background: rgba(255, 255, 255, 0.8);
      box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
      padding: 12px 40px;
    }
    
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-primary);
      text-decoration: none;
      transition: transform 0.3s ease;
    }
    
    .logo:hover {
      transform: scale(1.05);
    }
    
    .nav-buttons {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .btn {
      padding: 10px 24px;
      border-radius: 980px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border: none;
      outline: none;
    }
    
    .btn-ghost {
      background: transparent;
      color: var(--text-primary);
    }
    
    .btn-ghost:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    
    .btn-primary:hover {
      background: var(--primary-dark);
      transform: scale(1.05);
    }
    
    /* ========== Hero Section ========== */
    .hero {
      position: relative;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: linear-gradient(180deg, #ffffff 0%, #f5f5f7 100%);
    }
    
    .hero-bg {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0.1;
      background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="%23000"/><circle cx="50" cy="50" r="40" fill="%23fff"/></svg>');
      animation: float 20s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
    }
    
    .hero-content {
      position: relative;
      text-align: center;
      padding: 0 20px;
      opacity: 0;
      animation: fadeInUp 1s ease forwards;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .hero-title {
      font-size: clamp(48px, 8vw, 96px);
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: 24px;
      background: linear-gradient(135deg, #1d1d1f 0%, #6e6e73 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .hero-subtitle {
      font-size: clamp(20px, 3vw, 28px);
      color: var(--text-secondary);
      margin-bottom: 48px;
      font-weight: 500;
    }
    
    .hero-cta {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 18px 36px;
      background: var(--primary);
      color: white;
      border-radius: 980px;
      font-size: 18px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
    }
    
    .hero-cta:hover {
      transform: scale(1.05) translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 122, 255, 0.4);
    }
    
    .hero-cta i {
      transition: transform 0.3s ease;
    }
    
    .hero-cta:hover i {
      transform: translateX(4px);
    }
    
    .scroll-indicator {
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      animation: bounce 2s infinite;
    }
    
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
      40% { transform: translateX(-50%) translateY(-10px); }
      60% { transform: translateX(-50%) translateY(-5px); }
    }
    
    .scroll-indicator i {
      font-size: 32px;
      color: var(--text-secondary);
    }
    
    /* ========== Feature Sections ========== */
    .feature-section {
      min-height: 100vh;
      display: flex;
      align-items: center;
      padding: 120px 40px;
      opacity: 0;
      transform: translateY(50px);
      transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .feature-section.visible {
      opacity: 1;
      transform: translateY(0);
    }
    
    .feature-section:nth-child(even) {
      background: var(--bg-light);
    }
    
    .feature-content {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 80px;
      align-items: center;
    }
    
    .feature-content.reverse {
      direction: rtl;
    }
    
    .feature-content.reverse > * {
      direction: ltr;
    }
    
    .feature-text h2 {
      font-size: clamp(36px, 5vw, 64px);
      font-weight: 800;
      margin-bottom: 24px;
      line-height: 1.1;
    }
    
    .feature-text p {
      font-size: clamp(18px, 2vw, 24px);
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 16px;
    }
    
    .feature-visual {
      position: relative;
      aspect-ratio: 16/10;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      transition: transform 0.5s ease;
    }
    
    .feature-visual:hover {
      transform: scale(1.02) translateY(-8px);
    }
    
    .feature-visual::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--gradient-1);
      opacity: 0.8;
    }
    
    .feature-visual.visual-2::before {
      background: var(--gradient-2);
    }
    
    .feature-visual.visual-3::before {
      background: var(--gradient-3);
    }
    
    .feature-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 120px;
      color: white;
      opacity: 0.3;
    }
    
    /* ========== Dark Section ========== */
    .dark-section {
      background: var(--bg-dark);
      color: white;
      padding: 160px 40px;
      position: relative;
      overflow: hidden;
    }
    
    .dark-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 50% 50%, rgba(102, 126, 234, 0.15) 0%, transparent 50%);
      pointer-events: none;
    }
    
    .dark-content {
      max-width: 1000px;
      margin: 0 auto;
      text-align: center;
      position: relative;
      z-index: 1;
    }
    
    .dark-content h2 {
      font-size: clamp(40px, 6vw, 72px);
      font-weight: 900;
      margin-bottom: 48px;
      background: linear-gradient(135deg, #fff 0%, #a0a0a0 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 40px;
      margin-top: 80px;
    }
    
    .step {
      text-align: center;
      padding: 40px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }
    
    .step:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-8px);
    }
    
    .step-number {
      display: inline-block;
      width: 60px;
      height: 60px;
      line-height: 60px;
      border-radius: 50%;
      background: var(--gradient-1);
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 24px;
    }
    
    .step h3 {
      font-size: 24px;
      margin-bottom: 12px;
    }
    
    .step p {
      color: rgba(255, 255, 255, 0.7);
      font-size: 16px;
      line-height: 1.6;
    }
    
    /* ========== CTA Section ========== */
    .cta-section {
      padding: 160px 40px;
      text-align: center;
      background: linear-gradient(180deg, #f5f5f7 0%, #ffffff 100%);
    }
    
    .cta-section h2 {
      font-size: clamp(40px, 6vw, 64px);
      font-weight: 900;
      margin-bottom: 32px;
    }
    
    .cta-section p {
      font-size: clamp(18px, 2vw, 24px);
      color: var(--text-secondary);
      margin-bottom: 48px;
    }
    
    /* ========== Responsive ========== */
    @media (max-width: 768px) {
      .navbar {
        padding: 16px 20px;
      }
      
      .feature-content {
        grid-template-columns: 1fr;
        gap: 40px;
      }
      
      .feature-content.reverse {
        direction: ltr;
      }
      
      .steps {
        grid-template-columns: 1fr;
      }
    }
    
    /* ========== Animations ========== */
    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    
    .animated-gradient {
      background-size: 200% 200%;
      animation: gradient-shift 8s ease infinite;
    }
  </style>
</head>
<body>
  <!-- Navigation -->
  <nav class="navbar" id="navbar">
    <a href="#" class="logo">플랫폼기획팀</a>
    <div class="nav-buttons">
      <button class="btn btn-ghost" onclick="showLoginModal()">로그인</button>
      <button class="btn btn-primary" onclick="showSignupModal()">시작하기</button>
    </div>
  </nav>
  
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-bg"></div>
    <div class="hero-content">
      <h1 class="hero-title">당신의 아이디어,<br>AI가 완성합니다</h1>
      <p class="hero-subtitle">복잡한 건 싫어요. 기획부터 PRD 작성까지, 10분이면 끝.</p>
      <a href="#" class="hero-cta" onclick="event.preventDefault(); showSignupModal();">
        <span>무료로 시작하기</span>
        <i class="fas fa-arrow-right"></i>
      </a>
    </div>
    <div class="scroll-indicator">
      <i class="fas fa-chevron-down"></i>
    </div>
  </section>
  
  <!-- Feature 1 -->
  <section class="feature-section">
    <div class="feature-content">
      <div class="feature-text">
        <h2>아이디어만 있다면<br>나머지는 AI가</h2>
        <p>머릿속 아이디어를 간단히 입력하세요.</p>
        <p>AI가 요건을 분석하고, 질문을 만들고, PRD까지 완성합니다.</p>
      </div>
      <div class="feature-visual visual-1">
        <i class="fas fa-lightbulb feature-icon"></i>
      </div>
    </div>
  </section>
  
  <!-- Feature 2 -->
  <section class="feature-section">
    <div class="feature-content reverse">
      <div class="feature-text">
        <h2>챌린지 모드로<br>깊이 있게</h2>
        <p>단순한 기획을 넘어, 10개 이상의 질문으로 완성도를 높이세요.</p>
        <p>스파르타 챌린지로 퀄리티를 보장합니다.</p>
      </div>
      <div class="feature-visual visual-2">
        <i class="fas fa-fire feature-icon"></i>
      </div>
    </div>
  </section>
  
  <!-- Feature 3 -->
  <section class="feature-section">
    <div class="feature-content">
      <div class="feature-text">
        <h2>PRD 자동 생성<br>진짜 쉬워요</h2>
        <p>복잡한 문서 작업은 이제 그만.</p>
        <p>모든 정보를 종합하여 전문가 수준의 PRD를 자동으로 만들어드립니다.</p>
      </div>
      <div class="feature-visual visual-3">
        <i class="fas fa-file-alt feature-icon"></i>
      </div>
    </div>
  </section>
  
  <!-- Dark Section - How it works -->
  <section class="dark-section">
    <div class="dark-content">
      <h2>3단계면 끝나요</h2>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <h3>아이디어 입력</h3>
          <p>만들고 싶은 서비스나 기능을 자유롭게 작성하세요.</p>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <h3>AI 분석</h3>
          <p>AI가 요건을 추출하고 핵심 질문을 만듭니다.</p>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <h3>PRD 완성</h3>
          <p>답변을 바탕으로 전문적인 PRD 문서가 생성됩니다.</p>
        </div>
      </div>
    </div>
  </section>
  
  <!-- CTA Section -->
  <section class="cta-section">
    <h2>지금 바로 시작하세요</h2>
    <p>10분이면 당신의 첫 PRD가 완성됩니다.</p>
    <a href="#" class="hero-cta" onclick="event.preventDefault(); showSignupModal();">
      <span>무료로 시작하기</span>
      <i class="fas fa-arrow-right"></i>
    </a>
  </section>
  
  <script src="/static/onboarding.js"></script>
</body>
</html>`

const app = new Hono<{ Bindings: Bindings }>()

// API 라우트
app.route('/api', api)

// 정적 파일 서빙 (캐시 방지)
app.use('/static/*', async (c, next) => {
  await next();
  // JS 파일은 절대 캐시하지 않음
  if (c.req.path.endsWith('.js')) {
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
  }
});
app.use('/static/*', serveStatic({ root: './' }))

// 온보딩 페이지 (루트)
app.get('/', (c) => {
  return c.html(ONBOARDING_HTML)
})
app.get('/onboarding', (c) => {
  return c.html(ONBOARDING_HTML)
})
app.get('/onboarding.html', (c) => {
  return c.html(ONBOARDING_HTML)
})

// 메인 앱
// Admin page - Inline HTML (will be replaced during build)
app.get('/admin', (c) => {
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  
  // Admin HTML 인라인 제공
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>관리자 페이지 - 플랫폼기획팀</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
  <style>
    * {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    
    .admin-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .admin-card {
      background: white;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .admin-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 32px;
    }
    
    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
    }
    
    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }
    
    .stat-number {
      font-size: 36px;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
    
    .user-row {
      border-bottom: 1px solid #e5e7eb;
      padding: 16px;
      transition: background 0.2s ease;
    }
    
    .user-row:hover {
      background: #f9fafb;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .badge-super-admin {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: white;
    }
    
    .badge-admin {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .badge-user {
      background: #e5e7eb;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="admin-container">
    <!-- Header -->
    <div class="admin-card" style="margin-bottom: 32px;">
      <div class="admin-header">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <h1 style="font-size: 32px; font-weight: 700; margin-bottom: 8px;">
              <i class="fas fa-crown" style="margin-right: 12px;"></i>
              관리자 페이지
            </h1>
            <p style="opacity: 0.9; font-size: 14px;">플랫폼기획팀 시스템 관리</p>
          </div>
          <button onclick="goBack()" class="btn-primary" style="background: rgba(255, 255, 255, 0.2);">
            <i class="fas fa-arrow-left" style="margin-right: 8px;"></i>
            메인으로
          </button>
        </div>
      </div>
    </div>
    
    <!-- Stats -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 32px;">
      <div class="stat-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <span style="color: #6b7280; font-size: 14px; font-weight: 600;">총 사용자</span>
          <i class="fas fa-users" style="font-size: 24px; color: #667eea;"></i>
        </div>
        <div class="stat-number" id="total-users">0</div>
      </div>
      
      <div class="stat-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <span style="color: #6b7280; font-size: 14px; font-weight: 600;">총 프로젝트</span>
          <i class="fas fa-folder" style="font-size: 24px; color: #764ba2;"></i>
        </div>
        <div class="stat-number" id="total-projects">0</div>
      </div>
      
      <div class="stat-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <span style="color: #6b7280; font-size: 14px; font-weight: 600;">관리자</span>
          <i class="fas fa-user-shield" style="font-size: 24px; color: #fbbf24;"></i>
        </div>
        <div class="stat-number" id="total-admins">0</div>
      </div>
      
      <div class="stat-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <span style="color: #6b7280; font-size: 14px; font-weight: 600;">오늘 가입</span>
          <i class="fas fa-user-plus" style="font-size: 24px; color: #10b981;"></i>
        </div>
        <div class="stat-number" id="today-signups">0</div>
      </div>
    </div>
    
    <!-- User Management -->
    <div class="admin-card">
      <div style="padding: 32px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="font-size: 24px; font-weight: 700; color: #1f2937;">
          <i class="fas fa-users-cog" style="margin-right: 12px; color: #667eea;"></i>
          회원 관리
        </h2>
      </div>
      
      <div style="padding: 24px;">
        <div style="margin-bottom: 24px;">
          <input 
            type="text" 
            id="user-search" 
            placeholder="이메일 또는 이름으로 검색..." 
            oninput="filterUsers()"
            style="width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 14px;"
          >
        </div>
        
        <div id="user-list" style="min-height: 400px;">
          <div style="text-align: center; padding: 80px 20px; color: #9ca3af;">
            <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 16px;"></i>
            <p>사용자 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const API_BASE = window.location.origin + '/api';
    let allUsers = [];
    
    // 페이지 로드 시 인증 확인
    document.addEventListener('DOMContentLoaded', async () => {
      await checkAuth();
      await loadStats();
      await loadUsers();
    });
    
    // 인증 확인
    async function checkAuth() {
      try {
        const response = await axios.get(\`\${API_BASE}/auth/check\`, {
          credentials: 'include'
        });
        
        if (!response.data.authenticated) {
          alert('로그인이 필요합니다.');
          window.location.href = '/';
          return;
        }
        
        // 최고관리자 권한 확인
        if (!response.data.user?.isSuperAdmin) {
          alert('관리자 권한이 필요합니다.');
          window.location.href = '/app';
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/';
      }
    }
    
    // 통계 로드
    async function loadStats() {
      try {
        const [usersRes, projectsRes] = await Promise.all([
          axios.get(\`\${API_BASE}/admin/users\`),
          axios.get(\`\${API_BASE}/projects\`)
        ]);
        
        const users = usersRes.data;
        const projects = projectsRes.data;
        
        document.getElementById('total-users').textContent = users.length;
        document.getElementById('total-projects').textContent = projects.length;
        
        // 관리자 수 계산
        const admins = users.filter(u => u.isSuperAdmin || u.isAdmin);
        document.getElementById('total-admins').textContent = admins.length;
        
        // 오늘 가입한 사용자
        const today = new Date().toISOString().split('T')[0];
        const todaySignups = users.filter(u => u.created_at?.startsWith(today));
        document.getElementById('today-signups').textContent = todaySignups.length;
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }
    
    // 사용자 목록 로드
    async function loadUsers() {
      try {
        const response = await axios.get(\`\${API_BASE}/admin/users\`);
        allUsers = response.data;
        renderUsers(allUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
        document.getElementById('user-list').innerHTML = \`
          <div style="text-align: center; padding: 80px 20px; color: #ef4444;">
            <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 16px;"></i>
            <p>사용자 정보를 불러오는데 실패했습니다.</p>
          </div>
        \`;
      }
    }
    
    // 사용자 목록 렌더링
    function renderUsers(users) {
      const container = document.getElementById('user-list');
      
      if (!users.length) {
        container.innerHTML = \`
          <div style="text-align: center; padding: 80px 20px; color: #9ca3af;">
            <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px;"></i>
            <p>사용자가 없습니다.</p>
          </div>
        \`;
        return;
      }
      
      container.innerHTML = users.map(user => {
        const roleBadges = user.roles?.map(role => {
          const badgeClass = role.name === 'super_admin' ? 'badge-super-admin' : 
                             role.name === 'admin' ? 'badge-admin' : 'badge-user';
          return \`<span class="badge \${badgeClass}">\${role.display_name}</span>\`;
        }).join(' ') || '<span class="badge badge-user">일반 회원</span>';
        
        return \`
          <div class="user-row">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                  <h3 style="font-weight: 600; font-size: 16px; color: #1f2937;">\${escapeHtml(user.name)}</h3>
                  \${roleBadges}
                </div>
                <div style="display: flex; align-items: center; gap: 16px; font-size: 14px; color: #6b7280;">
                  <span><i class="fas fa-envelope" style="margin-right: 4px;"></i>\${escapeHtml(user.email)}</span>
                  <span><i class="fas fa-calendar" style="margin-right: 4px;"></i>\${formatDate(user.created_at)}</span>
                  \${user.last_login_at ? \`<span><i class="fas fa-sign-in-alt" style="margin-right: 4px;"></i>\${formatRelativeTime(user.last_login_at)}</span>\` : ''}
                </div>
              </div>
              <button onclick="manageUser(\${user.id})" class="btn-primary" style="padding: 8px 16px; font-size: 14px;">
                <i class="fas fa-cog"></i>
              </button>
            </div>
          </div>
        \`;
      }).join('');
    }
    
    // 사용자 검색 필터
    function filterUsers() {
      const query = document.getElementById('user-search').value.toLowerCase();
      const filtered = allUsers.filter(user => 
        user.email.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query)
      );
      renderUsers(filtered);
    }
    
    // 사용자 관리 (추후 구현)
    function manageUser(userId) {
      alert(\`사용자 관리 기능은 곧 추가될 예정입니다.\\n사용자 ID: \${userId}\`);
    }
    
    // 메인 페이지로 돌아가기
    function goBack() {
      window.location.href = '/app';
    }
    
    // HTML 이스케이프
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // 날짜 포맷
    function formatDate(dateStr) {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // 상대 시간 표시
    function formatRelativeTime(dateStr) {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) return \`\${days}일 전\`;
      if (hours > 0) return \`\${hours}시간 전\`;
      if (minutes > 0) return \`\${minutes}분 전\`;
      return '방금 전';
    }
  </script>
</body>
</html>
  `);
});

app.get('/admin.html', (c) => {
  return c.redirect('/admin');
});

app.get('/app', (c) => {
  // 캐시 방지 헤더 추가
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  
  const timestamp = Date.now();
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">
        <title>플랫폼기획팀 - 프로젝트 관리</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <link href="/static/style.css?v=${timestamp}" rel="stylesheet">
        <style>
          * {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
          }
        </style>
    </head>
    <body class="bg-toss-gray-50">
        <!-- 앱 컨테이너 (JS에서 동적으로 로그인 화면 또는 메인 앱을 표시) -->
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked@11.0.0/marked.min.js"></script>
        <script src="/static/app.js?v=${timestamp}"></script>
    </body>
    </html>
  `)
})

export default app
