import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import api from './api'
import type { Bindings } from './types'

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
app.use('/static/*', serveStatic({ root: './public' }))

// 온보딩 페이지
app.get('/onboarding', serveStatic({ path: './public/onboarding.html' }))
app.get('/onboarding.html', serveStatic({ path: './public/onboarding.html' }))

// 메인 페이지
app.get('/', (c) => {
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
        <title>플랫폼기획팀 - 더 쉬운 기획, AI가 함께합니다</title>
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
