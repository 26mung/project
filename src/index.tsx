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
        <title>기획 도우미 - 더 쉬운 기획, AI가 함께합니다</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: {
                  sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
                },
                colors: {
                  'toss-blue': '#3182f6',
                  'toss-blue-dark': '#1b64da',
                  'toss-gray': {
                    50: '#f9fafb',
                    100: '#f2f4f6',
                    200: '#e5e8eb',
                    300: '#d1d6db',
                    400: '#b0b8c1',
                    500: '#8b95a1',
                    600: '#6b7684',
                    700: '#4e5968',
                    800: '#333d4b',
                    900: '#191f28',
                  }
                },
                boxShadow: {
                  'toss': '0 2px 8px 0 rgba(0,0,0,0.08)',
                  'toss-lg': '0 4px 16px 0 rgba(0,0,0,0.12)',
                },
                animation: {
                  'slide-up': 'slideUp 0.3s ease-out',
                  'fade-in': 'fadeIn 0.2s ease-out',
                  'scale-in': 'scaleIn 0.2s ease-out',
                }
              }
            }
          }
        </script>
        <style>
          * {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
          }
          
          body {
            background-color: #f9fafb;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          @keyframes slideUp {
            from {
              transform: translateY(10px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes scaleIn {
            from {
              transform: scale(0.95);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          .card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 2px 8px 0 rgba(0,0,0,0.08);
            transition: all 0.2s ease;
          }
          
          .card:hover {
            box-shadow: 0 4px 16px 0 rgba(0,0,0,0.12);
            transform: translateY(-2px);
          }
          
          .btn-primary {
            background: linear-gradient(135deg, #3182f6 0%, #1b64da 100%);
            transition: all 0.2s ease;
          }
          
          .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(49, 130, 246, 0.4);
          }
          
          .btn-primary:active {
            transform: translateY(0);
          }
          
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
          }
          
          .project-item {
            transition: all 0.2s ease;
          }
          
          .project-item:hover {
            background-color: #f9fafb;
          }
          
          .project-item.active {
            background-color: #eff6ff;
            border-left: 3px solid #3182f6;
          }
          
          .modal-backdrop {
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
          }
        </style>
    </head>
    <body>
        <div id="app" class="min-h-screen flex bg-toss-gray-50">
            <!-- 사이드바 -->
            <aside class="w-80 bg-white border-r border-toss-gray-200 flex flex-col">
                <!-- 헤더 -->
                <div class="p-6 border-b border-toss-gray-100">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-10 h-10 bg-gradient-to-br from-toss-blue to-toss-blue-dark rounded-xl flex items-center justify-center">
                            <i class="fas fa-lightbulb text-white text-lg"></i>
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-toss-gray-900">기획 도우미</h1>
                            <p class="text-xs text-toss-gray-500">AI 기획 전문가 에이전트</p>
                        </div>
                    </div>
                </div>
                
                <!-- 새 프로젝트 버튼 -->
                <div class="p-4">
                    <button onclick="createNewProject()" class="w-full btn-primary text-white py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg">
                        <i class="fas fa-plus"></i>
                        <span>새 프로젝트 시작</span>
                    </button>
                </div>
                
                <!-- 프로젝트 목록 -->
                <div class="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
                    <div class="text-xs font-semibold text-toss-gray-500 mb-3 px-2">프로젝트</div>
                    <div id="project-list" class="space-y-1">
                        <!-- 프로젝트 목록이 여기에 동적으로 추가됩니다 -->
                    </div>
                </div>
            </aside>
            
            <!-- 메인 콘텐츠 -->
            <main class="flex-1 flex flex-col overflow-hidden">
                <!-- 상단 탭 -->
                <div class="bg-white border-b border-toss-gray-200">
                    <div class="max-w-7xl mx-auto px-8">
                        <div class="flex items-center gap-1">
                            <button onclick="switchTab('overview')" id="tab-overview" class="tab-button px-5 py-4 font-semibold text-sm transition-all">
                                <i class="fas fa-home mr-2"></i>개요
                            </button>
                            <button onclick="switchTab('requirements')" id="tab-requirements" class="tab-button px-5 py-4 font-semibold text-sm transition-all">
                                <i class="fas fa-list-check mr-2"></i>요건 관리
                            </button>
                            <button onclick="switchTab('tree')" id="tab-tree" class="tab-button px-5 py-4 font-semibold text-sm transition-all">
                                <i class="fas fa-sitemap mr-2"></i>정보구조도
                            </button>
                            <button onclick="switchTab('prd')" id="tab-prd" class="tab-button px-5 py-4 font-semibold text-sm transition-all">
                                <i class="fas fa-file-alt mr-2"></i>PRD
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 콘텐츠 영역 -->
                <div class="flex-1 overflow-y-auto scrollbar-hide">
                    <div class="max-w-7xl mx-auto px-8 py-8">
                        <div id="content" class="animate-fade-in">
                            <!-- 초기 화면 -->
                            <div class="flex flex-col items-center justify-center py-20">
                                <div class="w-20 h-20 bg-toss-gray-100 rounded-full flex items-center justify-center mb-6">
                                    <i class="fas fa-folder-open text-4xl text-toss-gray-400"></i>
                                </div>
                                <h2 class="text-3xl font-bold text-toss-gray-900 mb-3">환영합니다! 👋</h2>
                                <p class="text-toss-gray-600 text-center max-w-md">
                                    AI 기획 전문가와 함께 프로젝트를 시작해보세요.<br>
                                    새 프로젝트를 만들거나 기존 프로젝트를 선택하세요.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        
        <!-- 모달 컨테이너 -->
        <div id="modal-container"></div>
        
        <!-- 토스트 알림 컨테이너 -->
        <div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked@11.0.0/marked.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
