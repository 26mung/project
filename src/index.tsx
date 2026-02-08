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
        <span>바로 시작하기</span>
        <i class="fas fa-arrow-right"></i>
      </a>
    </div>
    <div class="scroll-indicator" style="display: none;">
      <i class="fas fa-chevron-down"></i>
    </div>
  </section>
  
  <!-- Feature 1 -->
  <div style="display: none;">
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
  <section class="cta-section" style="display: none;">
    <h2>지금 바로 시작하세요</h2>
    <p>10분이면 당신의 첫 PRD가 완성됩니다.</p>
    <a href="#" class="hero-cta" onclick="event.preventDefault(); showSignupModal();">
      <span>바로 시작하기</span>
      <i class="fas fa-arrow-right"></i>
    </a>
  </section>
  </div>
  
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
  
  const timestamp = Date.now();
  
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>관리자 페이지 - 플랫폼기획팀</title>
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  
  <!-- External CSS -->
  <link rel="stylesheet" href="/static/style.css?v=${timestamp}">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
  
  <style>
    .admin-menu-item {
      padding: 12px 20px;
      cursor: pointer;
      transition: all 0.2s;
      border-radius: var(--radius-8);
      margin-bottom: 4px;
    }
    
    .admin-menu-item:hover {
      background: var(--grey-100);
    }
    
    .admin-menu-item.active {
      background: var(--blue-50);
      color: var(--blue-600);
      font-weight: 600;
    }
    
    .admin-stat-card {
      background: white;
      border-radius: var(--radius-12);
      padding: 24px;
      border: 1px solid var(--grey-200);
      transition: all 0.2s;
    }
    
    .admin-stat-card:hover {
      border-color: var(--blue-500);
      box-shadow: var(--shadow-2);
    }
    
    .admin-stat-value {
      font-size: 36px;
      font-weight: 700;
      color: var(--blue-500);
      margin: 8px 0;
    }
    
    .admin-stat-label {
      font-size: 14px;
      color: var(--grey-600);
      font-weight: 500;
    }
    
    .user-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .user-table th {
      background: var(--grey-50);
      padding: 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: var(--grey-700);
      border-bottom: 2px solid var(--grey-200);
    }
    
    .user-table td {
      padding: 16px 12px;
      border-bottom: 1px solid var(--grey-100);
      font-size: 14px;
    }
    
    .user-table tr:hover {
      background: var(--grey-50);
    }
    
    .badge-role {
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .badge-super-admin {
      background: var(--blue-100);
      color: var(--blue-700);
    }
    
    .badge-admin {
      background: var(--teal-100);
      color: var(--teal-700);
    }
    
    .badge-user {
      background: var(--grey-100);
      color: var(--grey-700);
    }
  </style>
</head>
<body>
  <div style="height: 100vh; display: flex; background: var(--grey-50);">
    <!-- Sidebar -->
    <div style="width: 280px; height: 100vh; background: white; border-right: 1px solid var(--grey-200); display: flex; flex-direction: column;">
      <!-- Header -->
      <div style="padding: 20px; border-bottom: 1px solid var(--grey-100);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h1 class="text-title3" style="color: var(--grey-900);">
            <i class="fas fa-crown" style="color: var(--blue-500); margin-right: 8px;"></i>
            관리자 페이지
          </h1>
          <button onclick="handleLogout()" class="btn-icon" title="로그아웃">
            <i class="fas fa-sign-out-alt" style="font-size: 14px;"></i>
          </button>
        </div>
        <a href="/app" class="btn-secondary btn-large w-full">
          <i class="fas fa-arrow-left" style="margin-right: 6px;"></i>
          메인 앱으로 돌아가기
        </a>
      </div>
      
      <!-- Menu -->
      <div style="flex: 1; overflow-y: auto; padding: 16px;">
        <div class="admin-menu-item active" onclick="showMenu('dashboard')">
          <i class="fas fa-chart-line" style="margin-right: 8px; width: 20px;"></i>
          대시보드
        </div>
        <div class="admin-menu-item" onclick="showMenu('users')">
          <i class="fas fa-users" style="margin-right: 8px; width: 20px;"></i>
          사용자 관리
        </div>
        <div class="admin-menu-item" onclick="showMenu('projects')">
          <i class="fas fa-folder" style="margin-right: 8px; width: 20px;"></i>
          프로젝트 관리
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div style="flex: 1; overflow-y: auto; padding: 40px;">
      <div id="content-area"></div>
    </div>
  </div>
  
  <script>
    const API_BASE = window.location.origin + '/api';
    let currentUser = null;
    let currentMenu = 'dashboard';
    
    // 초기화
    async function init() {
      await checkAuth();
      showMenu('dashboard');
    }
    
    // 인증 확인
    async function checkAuth() {
      try {
        const response = await axios.get(\`\${API_BASE}/auth/check\`);
        if (!response.data.authenticated) {
          window.location.href = '/';
          return;
        }
        
        currentUser = response.data.user;
        
        // 최고관리자 권한 확인
        if (!currentUser.isSuperAdmin) {
          alert('접근 권한이 없습니다.');
          window.location.href = '/app';
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/';
      }
    }
    
    // 로그아웃
    async function handleLogout() {
      try {
        await axios.post(\`\${API_BASE}/auth/logout\`);
        window.location.href = '/';
      } catch (error) {
        console.error('Logout failed:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
      }
    }
    
    // 메뉴 전환
    function showMenu(menu) {
      currentMenu = menu;
      
      // 메뉴 활성화 상태 변경
      document.querySelectorAll('.admin-menu-item').forEach(item => {
        item.classList.remove('active');
      });
      event.target.closest('.admin-menu-item').classList.add('active');
      
      // 콘텐츠 렌더링
      switch(menu) {
        case 'dashboard':
          renderDashboard();
          break;
        case 'users':
          renderUsers();
          break;
        case 'projects':
          renderProjects();
          break;
      }
    }
    
    // 대시보드 렌더링
    async function renderDashboard() {
      const contentArea = document.getElementById('content-area');
      contentArea.innerHTML = \`
        <div style="margin-bottom: 32px;">
          <h2 class="text-title1" style="color: var(--grey-900); margin-bottom: 8px;">대시보드</h2>
          <p class="text-body1" style="color: var(--grey-600);">시스템 통계 및 현황</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px;">
          <div class="admin-stat-card">
            <div class="admin-stat-label">총 사용자</div>
            <div class="admin-stat-value" id="stat-users">-</div>
            <div style="font-size: 12px; color: var(--grey-500);">전체 가입자 수</div>
          </div>
          
          <div class="admin-stat-card">
            <div class="admin-stat-label">총 프로젝트</div>
            <div class="admin-stat-value" id="stat-projects" style="color: var(--teal-500);">-</div>
            <div style="font-size: 12px; color: var(--grey-500);">생성된 프로젝트</div>
          </div>
          
          <div class="admin-stat-card">
            <div class="admin-stat-label">관리자</div>
            <div class="admin-stat-value" id="stat-admins" style="color: var(--yellow-500);">-</div>
            <div style="font-size: 12px; color: var(--grey-500);">관리자 계정</div>
          </div>
          
          <div class="admin-stat-card">
            <div class="admin-stat-label">오늘 가입</div>
            <div class="admin-stat-value" id="stat-today" style="color: var(--green-500);">-</div>
            <div style="font-size: 12px; color: var(--grey-500);">24시간 이내</div>
          </div>
        </div>
        
        <div class="card">
          <div style="padding: 24px;">
            <h3 class="text-title3" style="margin-bottom: 16px;">최근 활동</h3>
            <p class="text-body2" style="color: var(--grey-600);">최근 사용자 활동 및 프로젝트 생성 현황이 여기에 표시됩니다.</p>
          </div>
        </div>
      \`;
      
      // 통계 데이터 로드
      try {
        const [usersRes, projectsRes] = await Promise.all([
          axios.get(\`\${API_BASE}/admin/users\`),
          axios.get(\`\${API_BASE}/admin/projects\`)
        ]);
        
        const users = usersRes.data || [];
        const projects = projectsRes.data || [];
        
        document.getElementById('stat-users').textContent = users.length;
        document.getElementById('stat-projects').textContent = projects.length;
        document.getElementById('stat-admins').textContent = users.filter(u => u.isSuperAdmin || u.isAdmin).length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayUsers = users.filter(u => new Date(u.created_at) >= today).length;
        document.getElementById('stat-today').textContent = todayUsers;
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }
    
    // 사용자 관리 렌더링
    async function renderUsers() {
      const contentArea = document.getElementById('content-area');
      contentArea.innerHTML = \`
        <div style="margin-bottom: 32px;">
          <h2 class="text-title1" style="color: var(--grey-900); margin-bottom: 8px;">사용자 관리</h2>
          <p class="text-body1" style="color: var(--grey-600);">전체 사용자 목록 및 권한 관리</p>
        </div>
        
        <div class="card">
          <div style="padding: 24px; border-bottom: 1px solid var(--grey-100);">
            <div style="display: flex; gap: 12px; align-items: center;">
              <div style="flex: 1; position: relative;">
                <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--grey-400);"></i>
                <input type="text" id="user-search" placeholder="이메일 또는 닉네임으로 검색" class="input" style="padding-left: 44px;">
              </div>
              <button onclick="refreshUsers()" class="btn-secondary">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          
          <div style="overflow-x: auto;">
            <table class="user-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이메일</th>
                  <th>닉네임</th>
                  <th>역할</th>
                  <th>가입일</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody id="user-list"></tbody>
            </table>
          </div>
        </div>
      \`;
      
      // 사용자 목록 로드
      await loadUsers();
      
      // 검색 이벤트
      document.getElementById('user-search').addEventListener('input', (e) => {
        filterUsers(e.target.value);
      });
    }
    
    let allUsers = [];
    
    async function loadUsers() {
      try {
        const response = await axios.get(\`\${API_BASE}/admin/users\`);
        allUsers = response.data || [];
        renderUserList(allUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
        document.getElementById('user-list').innerHTML = \`
          <tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--grey-500);">
            사용자 목록을 불러올 수 없습니다.
          </td></tr>
        \`;
      }
    }
    
    function renderUserList(users) {
      const tbody = document.getElementById('user-list');
      
      if (users.length === 0) {
        tbody.innerHTML = \`
          <tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--grey-500);">
            사용자가 없습니다.
          </td></tr>
        \`;
        return;
      }
      
      tbody.innerHTML = users.map(user => \`
        <tr>
          <td>\${user.id}</td>
          <td>\${user.email}</td>
          <td>\${user.name || '-'}</td>
          <td>
            \${user.isSuperAdmin 
              ? '<span class="badge-role badge-super-admin"><i class="fas fa-crown"></i> 최고관리자</span>'
              : user.isAdmin
              ? '<span class="badge-role badge-admin"><i class="fas fa-user-shield"></i> 관리자</span>'
              : '<span class="badge-role badge-user"><i class="fas fa-user"></i> 일반</span>'
            }
          </td>
          <td>\${formatDate(user.created_at)}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              \${!user.isSuperAdmin ? \`
                <button onclick="grantAdmin(\${user.id})" class="btn-text" style="color: var(--blue-500);" title="관리자 권한 부여">
                  <i class="fas fa-user-plus"></i>
                </button>
                <button onclick="deleteUser(\${user.id})" class="btn-text" style="color: var(--red-500);" title="사용자 삭제">
                  <i class="fas fa-trash"></i>
                </button>
              \` : '<span style="color: var(--grey-400); font-size: 12px;">-</span>'}
            </div>
          </td>
        </tr>
      \`).join('');
    }
    
    function filterUsers(query) {
      const filtered = allUsers.filter(user => 
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(query.toLowerCase()))
      );
      renderUserList(filtered);
    }
    
    function refreshUsers() {
      loadUsers();
    }
    
    async function grantAdmin(userId) {
      if (!confirm('이 사용자에게 최고관리자 권한을 부여하시겠습니까?')) return;
      
      try {
        await axios.post(\`\${API_BASE}/admin/users/\${userId}/roles\`, {
          role: 'super_admin'
        });
        alert('권한이 부여되었습니다.');
        await loadUsers();
      } catch (error) {
        console.error('Failed to grant admin:', error);
        alert('권한 부여 중 오류가 발생했습니다.');
      }
    }
    
    async function deleteUser(userId) {
      if (!confirm('정말 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
      
      try {
        await axios.delete(\`\${API_BASE}/admin/users/\${userId}\`);
        alert('사용자가 삭제되었습니다.');
        await loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('사용자 삭제 중 오류가 발생했습니다.');
      }
    }
    
    // 프로젝트 관리 렌더링
    async function renderProjects() {
      const contentArea = document.getElementById('content-area');
      contentArea.innerHTML = \`
        <div style="margin-bottom: 32px;">
          <h2 class="text-title1" style="color: var(--grey-900); margin-bottom: 8px;">프로젝트 관리</h2>
          <p class="text-body1" style="color: var(--grey-600);">전체 프로젝트 목록 및 관리</p>
        </div>
        
        <div class="card">
          <div style="padding: 24px; border-bottom: 1px solid var(--grey-100);">
            <div style="display: flex; gap: 12px; align-items: center;">
              <div style="flex: 1; position: relative;">
                <i class="fas fa-search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--grey-400);"></i>
                <input type="text" id="project-search" placeholder="프로젝트 제목으로 검색" class="input" style="padding-left: 44px;">
              </div>
              <button onclick="refreshProjects()" class="btn-secondary">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          
          <div style="overflow-x: auto;">
            <table class="user-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>제목</th>
                  <th>생성자</th>
                  <th>상태</th>
                  <th>생성일</th>
                </tr>
              </thead>
              <tbody id="project-list"></tbody>
            </table>
          </div>
        </div>
      \`;
      
      // 프로젝트 목록 로드
      await loadProjects();
      
      // 검색 이벤트
      document.getElementById('project-search').addEventListener('input', (e) => {
        filterProjects(e.target.value);
      });
    }
    
    let allProjects = [];
    
    async function loadProjects() {
      try {
        const response = await axios.get(\`\${API_BASE}/admin/projects\`);
        allProjects = response.data || [];
        renderProjectList(allProjects);
      } catch (error) {
        console.error('Failed to load projects:', error);
        document.getElementById('project-list').innerHTML = \`
          <tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--grey-500);">
            프로젝트 목록을 불러올 수 없습니다.
          </td></tr>
        \`;
      }
    }
    
    function renderProjectList(projects) {
      const tbody = document.getElementById('project-list');
      
      if (projects.length === 0) {
        tbody.innerHTML = \`
          <tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--grey-500);">
            프로젝트가 없습니다.
          </td></tr>
        \`;
        return;
      }
      
      tbody.innerHTML = projects.map(project => \`
        <tr>
          <td>\${project.id}</td>
          <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <strong>\${project.title}</strong>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-user-circle" style="color: var(--grey-400);"></i>
              <span>\${project.creator_name || '알 수 없음'}</span>
            </div>
          </td>
          <td>
            <span class="badge" style="background: var(--grey-100); color: var(--grey-700);">
              \${project.status === 'draft' ? '초안' : project.status === 'in_progress' ? '진행중' : '완료'}
            </span>
          </td>
          <td>\${formatDate(project.created_at)}</td>
        </tr>
      \`).join('');
    }
    
    function filterProjects(query) {
      const filtered = allProjects.filter(project => 
        project.title.toLowerCase().includes(query.toLowerCase())
      );
      renderProjectList(filtered);
    }
    
    function refreshProjects() {
      loadProjects();
    }
    
    // 날짜 포맷팅
    function formatDate(dateString) {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    
    // 페이지 로드 시 초기화
    init();
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
