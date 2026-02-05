import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import api from './api'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// API 라우트
app.route('/api', api)

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }))

// 메인 페이지
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>플랫폼기획팀 - 로그인</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
        <style>
          * {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
          }
        </style>
    </head>
    <body class="bg-toss-gray-50">
        <div id="auth-container" class="min-h-screen flex items-center justify-center px-4">
            <!-- 로그인 화면이 여기에 렌더링됩니다 -->
        </div>
        
        <div id="app-container" class="hidden">
            <!-- 메인 앱 UI -->
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked@11.0.0/marked.min.js"></script>
        <script src="/static/auth.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
