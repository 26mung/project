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
        <title>기획 도우미 - AI 기획 전문가 에이전트</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script>
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: {
                colors: {
                  dark: {
                    bg: '#1a1a1a',
                    card: '#2a2a2a',
                    border: '#3a3a3a',
                    text: '#e0e0e0',
                  }
                }
              }
            }
          }
        </script>
        <style>
          body {
            background-color: #1a1a1a;
            color: #e0e0e0;
          }
          .scrollbar-thin::-webkit-scrollbar {
            width: 6px;
          }
          .scrollbar-thin::-webkit-scrollbar-track {
            background: #2a2a2a;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #4a4a4a;
            border-radius: 3px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background: #5a5a5a;
          }
        </style>
    </head>
    <body class="dark">
        <div id="app" class="flex h-screen bg-dark-bg text-dark-text">
            <!-- 사이드바 -->
            <aside class="w-64 bg-dark-card border-r border-dark-border flex flex-col">
                <div class="p-4 border-b border-dark-border">
                    <h1 class="text-xl font-bold flex items-center gap-2">
                        <i class="fas fa-lightbulb text-yellow-400"></i>
                        기획 도우미
                    </h1>
                    <p class="text-xs text-gray-400 mt-1">AI 기획 전문가 에이전트</p>
                </div>
                
                <div class="p-4 border-b border-dark-border">
                    <button onclick="createNewProject()" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2">
                        <i class="fas fa-plus"></i>
                        새 프로젝트
                    </button>
                </div>
                
                <div class="flex-1 overflow-y-auto scrollbar-thin p-4">
                    <h2 class="text-sm font-semibold text-gray-400 mb-2">프로젝트 목록</h2>
                    <div id="project-list" class="space-y-2">
                        <!-- 프로젝트 목록이 여기에 동적으로 추가됩니다 -->
                    </div>
                </div>
            </aside>
            
            <!-- 메인 콘텐츠 영역 -->
            <main class="flex-1 flex flex-col overflow-hidden">
                <!-- 탭 메뉴 -->
                <div class="bg-dark-card border-b border-dark-border">
                    <div class="flex items-center px-6 pt-4">
                        <button onclick="switchTab('overview')" id="tab-overview" class="tab-button px-4 py-2 font-medium border-b-2 border-blue-500 text-blue-500">
                            <i class="fas fa-home mr-2"></i>개요
                        </button>
                        <button onclick="switchTab('requirements')" id="tab-requirements" class="tab-button px-4 py-2 font-medium text-gray-400 hover:text-white border-b-2 border-transparent">
                            <i class="fas fa-list-check mr-2"></i>요건 관리
                        </button>
                        <button onclick="switchTab('tree')" id="tab-tree" class="tab-button px-4 py-2 font-medium text-gray-400 hover:text-white border-b-2 border-transparent">
                            <i class="fas fa-sitemap mr-2"></i>정보구조도
                        </button>
                        <button onclick="switchTab('prd')" id="tab-prd" class="tab-button px-4 py-2 font-medium text-gray-400 hover:text-white border-b-2 border-transparent">
                            <i class="fas fa-file-alt mr-2"></i>PRD
                        </button>
                    </div>
                </div>
                
                <!-- 콘텐츠 영역 -->
                <div class="flex-1 overflow-y-auto scrollbar-thin p-6">
                    <div id="content">
                        <!-- 콘텐츠가 여기에 동적으로 로드됩니다 -->
                        <div class="text-center py-20">
                            <i class="fas fa-folder-open text-6xl text-gray-600 mb-4"></i>
                            <h2 class="text-2xl font-bold text-gray-400 mb-2">환영합니다!</h2>
                            <p class="text-gray-500">새 프로젝트를 만들거나 기존 프로젝트를 선택하세요.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        
        <!-- 모달 영역 -->
        <div id="modal-container"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked@11.0.0/marked.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
