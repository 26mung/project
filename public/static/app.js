// 전역 상태
let currentProject = null;
let currentTab = 'overview';
let projects = [];
let requirements = [];
let isAuthenticated = false;
let uploadedImages = []; // 업로드된 이미지 (Base64)

// 🚀 성능 최적화: 페이지네이션 상태
let currentPage = 1;
const ITEMS_PER_PAGE = 10; // 한 페이지당 10개 요건
let totalRequirements = 0;

// API 기본 URL
const API_BASE = window.location.origin + '/api';

// ============ 이미지 업로드 처리 ============
function handleImageUpload(event) {
  const files = Array.from(event.target.files);
  
  // 최대 10장 제한
  if (uploadedImages.length + files.length > 10) {
    showToast('이미지는 최대 10장까지 업로드할 수 있습니다', 'error');
    event.target.value = ''; // 파일 선택 초기화
    return;
  }
  
  files.forEach((file, index) => {
    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다', 'error');
      return;
    }
    
    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('이미지는 5MB 이하만 업로드할 수 있습니다', 'error');
      return;
    }
    
    // Base64로 변환
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImages.push({
        data: e.target.result,
        name: file.name
      });
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
  
  event.target.value = ''; // 파일 선택 초기화
}

function renderImagePreviews() {
  const container = document.getElementById('image-preview-container');
  if (!container) return;
  
  container.innerHTML = uploadedImages.map((img, index) => `
    <div class="relative group">
      <img src="${img.data}" class="w-full h-20 object-cover rounded-lg border-2 border-toss-gray-200">
      <button 
        onclick="removeImage(${index})" 
        class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        ✕
      </button>
      <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 truncate rounded-b-lg">
        ${img.name}
      </div>
    </div>
  `).join('');
}

function removeImage(index) {
  uploadedImages.splice(index, 1);
  renderImagePreviews();
  showToast('이미지가 제거되었습니다', 'info');
}

// 편집 모드용 이미지 처리
function handleEditImageUpload(event) {
  const files = Array.from(event.target.files);
  
  // 최대 10장 제한
  if (uploadedImages.length + files.length > 10) {
    showToast('이미지는 최대 10장까지 업로드할 수 있습니다', 'error');
    event.target.value = '';
    return;
  }
  
  files.forEach((file) => {
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다', 'error');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showToast('이미지는 5MB 이하만 업로드할 수 있습니다', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImages.push({
        data: e.target.result,
        name: file.name
      });
      renderEditImagePreviews();
    };
    reader.readAsDataURL(file);
  });
  
  event.target.value = '';
}

function renderEditImagePreviews() {
  const container = document.getElementById('edit-image-preview-container');
  if (!container) return;
  
  container.innerHTML = uploadedImages.map((img, index) => `
    <div class="relative group">
      <img src="${img.data}" class="w-full h-20 object-cover rounded-lg border-2 border-toss-gray-200">
      <button 
        onclick="removeEditImage(${index})" 
        class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        ✕
      </button>
      <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 truncate rounded-b-lg">
        ${img.name}
      </div>
    </div>
  `).join('');
}

function removeEditImage(index) {
  uploadedImages.splice(index, 1);
  renderEditImagePreviews();
  showToast('이미지가 제거되었습니다', 'info');
}

// 이미지 확대 모달
function showImageModal(imageUrl, imageNumber) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4';
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
  
  modal.innerHTML = `
    <div class="relative max-w-6xl max-h-full">
      <button 
        onclick="this.closest('.fixed').remove()" 
        class="absolute -top-12 right-0 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center transition-all"
      >
        <i class="fas fa-times text-xl"></i>
      </button>
      <img src="${imageUrl}" class="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl">
      <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm">
        이미지 ${imageNumber}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ============ 초기화 ============
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthentication();
});

// ============ 인증 관리 ============

async function checkAuthentication() {
  try {
    const response = await axios.get(`${API_BASE}/auth/check`);
    isAuthenticated = response.data.authenticated;
    
    if (isAuthenticated) {
      showMainApp();
      loadProjects();
      initTabStyles();
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error('Failed to check authentication:', error);
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.body.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full p-4 mb-4">
            <i class="fas fa-lock text-3xl"></i>
          </div>
          <h1 class="text-2xl font-bold text-gray-800 mb-2">플랫폼기획팀</h1>
          <p class="text-gray-600 text-sm">비밀번호를 입력하여 접속하세요</p>
        </div>
        
        <form onsubmit="handleLogin(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">비밀번호</label>
            <input 
              type="password" 
              id="password-input" 
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="비밀번호를 입력하세요"
              required
            >
          </div>
          
          <button 
            type="submit" 
            class="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:scale-[1.02]"
          >
            <i class="fas fa-sign-in-alt mr-2"></i>
            접속하기
          </button>
        </form>
        
        <div id="login-error" class="hidden mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
          <i class="fas fa-exclamation-circle mr-1"></i>
          <span id="login-error-message"></span>
        </div>
      </div>
    </div>
  `;
}

async function handleLogin(event) {
  event.preventDefault();
  
  const passwordInput = document.getElementById('password-input');
  const errorDiv = document.getElementById('login-error');
  const errorMessage = document.getElementById('login-error-message');
  
  const password = passwordInput.value;
  
  try {
    const response = await axios.post(`${API_BASE}/auth/verify`, { password });
    
    if (response.data.success) {
      isAuthenticated = true;
      location.reload(); // 페이지 새로고침하여 메인 앱 표시
    }
  } catch (error) {
    errorDiv.classList.remove('hidden');
    errorMessage.textContent = '비밀번호가 올바르지 않습니다';
    passwordInput.value = '';
    passwordInput.focus();
  }
}

function showMainApp() {
  // 토스 디자인 시스템을 적용한 메인 앱 레이아웃
  document.body.innerHTML = `
    <div style="min-height: 100vh; display: flex; background: var(--grey-50);">
      <!-- Mobile Menu Toggle -->
      <button id="mobile-menu-toggle" onclick="toggleMobileMenu()" style="display: none; position: fixed; top: 16px; left: 16px; z-index: 999; width: 40px; height: 40px; background: white; border: 1px solid var(--grey-200); border-radius: 8px; align-items: center; justify-content: center; box-shadow: var(--shadow-2);">
        <i class="fas fa-bars" style="font-size: 16px; color: var(--grey-700);"></i>
      </button>
      
      <!-- Sidebar -->
      <div id="sidebar" style="width: 280px; background: white; border-right: 1px solid var(--grey-200); display: flex; flex-direction: column;">
        <!-- Header -->
        <div style="padding: 20px; border-bottom: 1px solid var(--grey-100);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h1 class="text-title3" style="color: var(--grey-900);">
              <i class="fas fa-lightbulb" style="color: var(--blue-500); margin-right: 8px; font-size: 20px;"></i>
              플랫폼기획팀
            </h1>
            <button onclick="handleLogout()" class="btn-icon" title="로그아웃">
              <i class="fas fa-sign-out-alt" style="font-size: 14px;"></i>
            </button>
          </div>
          <button onclick="createNewProject()" class="btn-primary btn-large w-full">
            <i class="fas fa-plus" style="margin-right: 6px; font-size: 14px;"></i>
            새 프로젝트
          </button>
        </div>
        
        <!-- Project List -->
        <div style="flex: 1; overflow-y: auto; padding: 12px;">
          <div id="project-list" style="display: flex; flex-direction: column; gap: 8px;">
            <!-- Projects will be loaded here -->
          </div>
        </div>
      </div>
      
      <!-- Main Content -->
      <div style="flex: 1; display: flex; flex-direction: column;">
        <!-- Tabs -->
        <div style="background: white; border-bottom: 1px solid var(--grey-200);">
          <div style="display: flex; padding: 0 24px; overflow-x: auto;">
            <button id="tab-overview" onclick="switchTab('overview')" class="tab-button">
              <i class="fas fa-home" style="margin-right: 6px; font-size: 13px;"></i>
              프로젝트 개요
            </button>
            <button id="tab-requirements" onclick="switchTab('requirements')" class="tab-button">
              <i class="fas fa-tasks" style="margin-right: 6px; font-size: 13px;"></i>
              요건 관리
            </button>
            <button id="tab-prd" onclick="switchTab('prd')" class="tab-button">
              <i class="fas fa-file-alt" style="margin-right: 6px; font-size: 13px;"></i>
              PRD 문서
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div style="flex: 1; overflow-y: auto;">
          <div id="content" style="padding: 24px;">
            <!-- Content will be loaded here -->
          </div>
        </div>
      </div>
      
      <!-- Modal Container -->
      <div id="modal-container"></div>
      
      <!-- Toast Container -->
      <div id="toast-container" style="position: fixed; top: 20px; right: 20px; z-index: 2000; display: flex; flex-direction: column; gap: 8px;"></div>
      
      <!-- Overlay for mobile sidebar -->
      <div id="sidebar-overlay" onclick="toggleMobileMenu()" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 998;"></div>
    </div>
    
    <style>
    @media (max-width: 768px) {
      #mobile-menu-toggle { display: flex !important; }
      #sidebar {
        position: fixed;
        left: -280px;
        top: 0;
        bottom: 0;
        z-index: 999;
        transition: left 0.3s ease;
      }
      #sidebar.open {
        left: 0;
      }
      #sidebar-overlay.open {
        display: block !important;
      }
      #content {
        padding: 16px !important;
      }
      .tab-button {
        white-space: nowrap;
      }
    }
    </style>
  `;
}

async function handleLogout() {
  try {
    await axios.post(`${API_BASE}/auth/logout`);
    isAuthenticated = false;
    location.reload();
  } catch (error) {
    console.error('Failed to logout:', error);
  }
}

function initTabStyles() {
  const tabs = document.querySelectorAll('.tab-button');
  tabs.forEach(tab => {
    tab.classList.remove('active');
  });
  
  const activeTab = document.getElementById(`tab-${currentTab}`);
  if (activeTab) {
    activeTab.classList.add('active');
  }
}

// ============ 프로젝트 관리 ============

async function loadProjects() {
  try {
    const response = await axios.get(`${API_BASE}/projects`);
    projects = response.data;
    renderProjectList();
  } catch (error) {
    console.error('Failed to load projects:', error);
    showToast('프로젝트 목록을 불러오는데 실패했습니다', 'error');
  }
}

function renderProjectList() {
  const container = document.getElementById('project-list');
  if (!projects.length) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px 16px;">
        <p class="text-body2" style="color: var(--grey-500);">아직 프로젝트가 없어요</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = projects.map(project => `
    <div class="project-item ${currentProject?.id === project.id ? 'active' : ''}"
         onclick="selectProject(${project.id})">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px;">
        <h3 class="text-body2" style="font-weight: 600; color: var(--grey-900); flex: 1; padding-right: 8px;">${escapeHtml(project.title)}</h3>
        <button onclick="deleteProject(${project.id}, event)" class="btn-icon" style="width: 24px; height: 24px;">
          <i class="fas fa-trash" style="font-size: 12px;"></i>
        </button>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        ${getStatusBadge(project.status)}
        <span class="text-caption" style="color: var(--grey-500);">${formatRelativeTime(project.updated_at)}</span>
      </div>
    </div>
  `).join('');
}

function getStatusBadge(status) {
  const badges = {
    draft: '<span class="badge badge-small badge-weak-grey">준비중</span>',
    analyzing: '<span class="badge badge-small badge-weak-blue"><i class="fas fa-spinner fa-spin" style="margin-right: 4px; font-size: 10px;"></i>분석중</span>',
    in_progress: '<span class="badge badge-small badge-fill-blue">진행중</span>',
    completed: '<span class="badge badge-small badge-fill-green">완료</span>',
  };
  return badges[status] || badges.draft;
}

async function selectProject(projectId) {
  console.log('[Project] Selecting project:', projectId);
  try {
    console.log('[Project] Fetching project data...');
    const response = await axios.get(`${API_BASE}/projects/${projectId}`);
    console.log('[Project] Project data received:', response.data.title);
    console.log('[Project] Image URLs:', response.data.image_urls);
    currentProject = response.data;
    
    console.log('[Project] Rendering project list...');
    renderProjectList();
    
    console.log('[Project] Switching to tab:', currentTab);
    switchTab(currentTab);
    
    console.log('[Project] Selection completed successfully!');
  } catch (error) {
    console.error('[Project] Failed to load project:', error);
    showToast('프로젝트를 불러오는데 실패했습니다', 'error');
  }
}

function createNewProject() {
  // 이전 프로젝트의 이미지가 남아있지 않도록 초기화
  uploadedImages = [];
  
  showModal({
    title: '새 프로젝트 시작하기',
    content: `
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-semibold text-toss-gray-900 mb-2">프로젝트 이름 *</label>
          <input type="text" id="project-title" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors" placeholder="예: AI 기반 이메일 관리 시스템">
        </div>
        <div>
          <label class="block text-sm font-semibold text-toss-gray-900 mb-2">간단한 설명</label>
          <textarea id="project-description" rows="3" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors" placeholder="프로젝트에 대해 간단히 설명해주세요"></textarea>
        </div>
        <div>
          <label class="block text-sm font-semibold text-toss-gray-900 mb-2">상위 기획안</label>
          <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-3">
            <div class="flex gap-3">
              <i class="fas fa-lightbulb text-toss-blue text-lg"></i>
              <div class="flex-1">
                <p class="text-sm font-semibold text-toss-gray-900 mb-1">AI가 기획안을 분석해드려요</p>
                <p class="text-xs text-toss-gray-600 mb-2">기획안을 입력하시면 AI가 자동으로 세부 요건과 확인 질문을 만들어드립니다.</p>
                <p class="text-xs text-toss-gray-600 font-semibold">💡 포함하면 좋은 내용:</p>
                <ul class="text-xs text-toss-gray-600 mt-1 ml-4 space-y-1">
                  <li>• 프로젝트 목표 및 해결하려는 문제</li>
                  <li>• 타겟 사용자 및 주요 기능</li>
                  <li>• 사용자 시나리오/플로우</li>
                  <li>• 기술적 제약이나 외부 시스템 연동</li>
                </ul>
              </div>
            </div>
          </div>
          <textarea id="project-input" rows="8" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors" placeholder="프로젝트의 목표, 주요 기능, 사용자 시나리오, 기술 스택 등을 자유롭게 작성해주세요..."></textarea>
          
          <!-- 이미지 업로드 -->
          <div class="mt-4">
            <label class="block text-sm font-semibold text-toss-gray-900 mb-2">
              기획안 이미지 (선택)
              <span class="text-xs font-normal text-toss-gray-500 ml-2">PPT 장표를 이미지로 저장해서 업로드하세요 (최대 10장)</span>
            </label>
            <div class="bg-white border-2 border-dashed border-toss-gray-300 rounded-xl p-6 text-center hover:border-toss-blue transition-colors cursor-pointer" onclick="document.getElementById('project-images').click()">
              <i class="fas fa-images text-3xl text-toss-gray-400 mb-2"></i>
              <p class="text-sm text-toss-gray-600 mb-1">클릭하여 이미지 업로드</p>
              <p class="text-xs text-toss-gray-500">PNG, JPG 형식 (최대 10장)</p>
            </div>
            <input type="file" id="project-images" accept="image/*" multiple style="display: none;" onchange="handleImageUpload(event)">
            <div id="image-preview-container" class="mt-3 grid grid-cols-5 gap-2"></div>
          </div>
        </div>
      </div>
    `,
    confirmText: '프로젝트 시작하기',
    onConfirm: async () => {
      const title = document.getElementById('project-title').value.trim();
      const description = document.getElementById('project-description').value.trim();
      const inputContent = document.getElementById('project-input').value.trim();
      
      if (!title) {
        showToast('프로젝트 이름을 입력해주세요', 'error');
        return false;
      }
      
      try {
        // 이미지 URL 배열 생성 (Base64 데이터)
        const imageUrls = uploadedImages.map(img => img.data);
        
        const response = await axios.post(`${API_BASE}/projects`, {
          title,
          description,
          input_content: inputContent,
          image_urls: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null
        });
        
        console.log('[프로젝트 생성] 응답 데이터:', response.data);
        
        // response.data에 id가 있는지 확인
        if (!response.data || !response.data.id) {
          console.error('[프로젝트 생성] 서버 응답에 id가 없습니다:', response.data);
          showToast('프로젝트 생성에 실패했습니다: 유효하지 않은 응답', 'error');
          return false;
        }
        
        // 생성된 프로젝트 설정
        const projectId = response.data.id;
        console.log('[프로젝트 생성] 생성된 프로젝트 ID:', projectId);
        
        // 이미지 업로드 상태 초기화
        uploadedImages = [];
        
        // 프로젝트 목록 새로고침
        await loadProjects();
        
        // 생성된 프로젝트 선택 (서버에서 다시 가져오기)
        await selectProject(projectId);
        
        // Overview 탭으로 이동
        switchTab('overview');
        
        if (imageUrls.length > 0) {
          showToast(`프로젝트가 생성되었습니다! (이미지 ${imageUrls.length}장 포함) 개요에서 기획안을 평가해보세요`, 'success');
        } else {
          showToast('프로젝트가 생성되었습니다! 개요에서 기획안을 평가해보세요', 'success');
        }
        
        return true;
      } catch (error) {
        console.error('[프로젝트 생성] 실패:', error);
        console.error('[프로젝트 생성] 에러 상세:', error.response?.data);
        
        let errorMessage = '프로젝트 생성에 실패했습니다';
        if (error.response?.data?.error) {
          errorMessage += ': ' + error.response.data.error;
        } else if (error.response?.data?.message) {
          errorMessage += ': ' + error.response.data.message;
        } else if (error.message) {
          errorMessage += ': ' + error.message;
        }
        
        showToast(errorMessage, 'error');
        return false;
      }
    }
  });
}

async function deleteProject(projectId, event) {
  event.stopPropagation();
  
  const project = projects.find(p => p.id === projectId);
  
  showModal({
    title: '프로젝트 삭제',
    content: `
      <div class="text-center py-4">
        <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
        </div>
        <p class="text-toss-gray-900 font-semibold mb-2">"${escapeHtml(project?.title || '')}"</p>
        <p class="text-sm text-toss-gray-600">프로젝트를 삭제하시겠어요?<br>삭제한 프로젝트는 복구할 수 없어요.</p>
      </div>
    `,
    confirmText: '삭제하기',
    cancelText: '취소',
    confirmClass: 'bg-red-500 hover:bg-red-600',
    onConfirm: async () => {
      try {
        await axios.delete(`${API_BASE}/projects/${projectId}`);
        if (currentProject?.id === projectId) {
          currentProject = null;
        }
        await loadProjects();
        renderContent();
        showToast('프로젝트가 삭제되었습니다', 'success');
        return true;
      } catch (error) {
        console.error('Failed to delete project:', error);
        showToast('프로젝트 삭제에 실패했습니다', 'error');
        return false;
      }
    }
  });
}

// 기획안 평가 (분석 전에 실행)
async function evaluateProject() {
  if (!currentProject) return;
  
  // 이미지 URL 파싱
  let imageUrls = [];
  if (currentProject.image_urls) {
    try {
      imageUrls = JSON.parse(currentProject.image_urls);
    } catch (error) {
      console.error('Failed to parse image URLs:', error);
    }
  }
  
  const loadingMessage = imageUrls.length > 0 
    ? `기획안과 이미지 ${imageUrls.length}장을 평가하고 있어요...`
    : '기획안을 평가하고 있어요...';
  
  const loadingToast = showLoadingToast(loadingMessage);
  
  try {
    const response = await axios.post(`${API_BASE}/projects/${currentProject.id}/evaluate`, {
      image_urls: imageUrls
    }, {
      timeout: 180000 // 180초 (3분) - 이미지 포함 평가 시간 고려
    });
    const evaluation = response.data;
    
    hideToast(loadingToast);
    
    // 평가 결과 표시
    showModal({
      title: `기획안 평가 결과`,
      size: 'large',
      content: `
        <div class="space-y-6">
          <!-- 완성도 점수 -->
          <div style="background: linear-gradient(135deg, var(--blue-600) 0%, var(--blue-500) 100%); border-radius: 16px; padding: 24px; color: white;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div>
                <p style="font-size: 14px; color: rgba(255, 255, 255, 0.9); margin-bottom: 8px; font-weight: 500;">완성도 점수</p>
                <p style="font-size: 48px; font-weight: 700; color: white; line-height: 1;">
                  ${evaluation.completeness_score}<span style="font-size: 28px; color: rgba(255, 255, 255, 0.9);">/100</span>
                </p>
              </div>
              <div style="width: 96px; height: 96px; border-radius: 50%; border: 4px solid rgba(255, 255, 255, 0.3); display: flex; align-items: center; justify-content: center;">
                <i class="fas ${evaluation.completeness_score >= 80 ? 'fa-check-circle' : evaluation.completeness_score >= 60 ? 'fa-info-circle' : 'fa-exclamation-circle'}" style="font-size: 48px; color: white;"></i>
              </div>
            </div>
            <div style="height: 8px; background: rgba(255, 255, 255, 0.2); border-radius: 999px; overflow: hidden;">
              <div style="height: 100%; background: white; border-radius: 999px; transition: width 0.5s ease; width: ${evaluation.completeness_score}%;"></div>
            </div>
          </div>
          
          <!-- 프로젝트 성격 -->
          <div style="background: var(--blue-50); border: 1px solid var(--blue-200); border-radius: 12px; padding: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <i class="fas fa-tag" style="color: var(--blue-500); font-size: 20px;"></i>
              <div>
                <p class="text-body3" style="color: var(--grey-600); margin-bottom: 4px;">프로젝트 성격</p>
                <p class="text-body2" style="color: var(--grey-900); font-weight: 600;">${escapeHtml(evaluation.project_type)}</p>
              </div>
            </div>
          </div>
          
          ${evaluation.missing_items && evaluation.missing_items.length > 0 ? `
          <!-- 부족한 항목 -->
          <div>
            <h4 class="text-body2" style="color: var(--grey-900); font-weight: 600; margin-bottom: 12px;">
              <i class="fas fa-exclamation-triangle" style="color: var(--yellow-500); margin-right: 6px;"></i>
              보완하면 좋을 항목
            </h4>
            <ul style="display: flex; flex-direction: column; gap: 8px;">
              ${evaluation.missing_items.map(item => `
                <li style="display: flex; align-items: flex-start; gap: 8px; padding: 12px; background: var(--grey-50); border-radius: 8px;">
                  <i class="fas fa-circle" style="font-size: 6px; color: var(--orange-500); margin-top: 8px;"></i>
                  <span class="text-body3" style="color: var(--grey-700); line-height: 1.6;">${escapeHtml(item)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${evaluation.suggestions && evaluation.suggestions.length > 0 ? `
          <!-- 개선 제안 -->
          <div>
            <h4 class="text-body2" style="color: var(--grey-900); font-weight: 600; margin-bottom: 12px;">
              <i class="fas fa-lightbulb" style="color: var(--blue-500); margin-right: 6px;"></i>
              개선 제안
            </h4>
            <ul style="display: flex; flex-direction: column; gap: 8px;">
              ${evaluation.suggestions.map(suggestion => `
                <li style="display: flex; align-items: flex-start; gap: 8px; padding: 12px; background: var(--blue-50); border-radius: 8px; border: 1px solid var(--blue-100);">
                  <i class="fas fa-check" style="font-size: 12px; color: var(--blue-600); margin-top: 4px;"></i>
                  <span class="text-body3" style="color: var(--grey-700); line-height: 1.6;">${escapeHtml(suggestion)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${evaluation.dev_perspective_items && evaluation.dev_perspective_items.length > 0 ? `
          <!-- 개발 관점 보완 항목 -->
          <div>
            <h4 class="text-body2" style="color: var(--grey-900); font-weight: 600; margin-bottom: 12px;">
              <i class="fas fa-code" style="color: var(--purple-600); margin-right: 6px;"></i>
              개발 관점에서 보완하면 좋을 항목
            </h4>
            <ul style="display: flex; flex-direction: column; gap: 8px;">
              ${evaluation.dev_perspective_items.map(item => `
                <li style="display: flex; align-items: flex-start; gap: 8px; padding: 12px; background: var(--purple-50); border-radius: 8px; border: 1px solid var(--purple-100);">
                  <i class="fas fa-circle" style="font-size: 6px; color: var(--purple-600); margin-top: 8px;"></i>
                  <span class="text-body3" style="color: var(--grey-700); line-height: 1.6;">${escapeHtml(item)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${evaluation.ops_perspective_items && evaluation.ops_perspective_items.length > 0 ? `
          <!-- 운영 관점 보완 항목 -->
          <div>
            <h4 class="text-body2" style="color: var(--grey-900); font-weight: 600; margin-bottom: 8px;">
              <i class="fas fa-cog" style="color: var(--green-600); margin-right: 6px;"></i>
              운영 관점에서 보완하면 좋을 항목
            </h4>
            <p class="text-body3" style="color: var(--grey-600); margin-bottom: 12px; padding-left: 28px;">
              💡 아젠다에 따라 운영 범위가 다르므로 참고용으로 활용하세요
            </p>
            <ul style="display: flex; flex-direction: column; gap: 8px;">
              ${evaluation.ops_perspective_items.map(item => `
                <li style="display: flex; align-items: flex-start; gap: 8px; padding: 12px; background: var(--green-50); border-radius: 8px; border: 1px solid var(--green-100);">
                  <i class="fas fa-circle" style="font-size: 6px; color: var(--green-600); margin-top: 8px;"></i>
                  <span class="text-body3" style="color: var(--grey-700); line-height: 1.6;">${escapeHtml(item)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          <!-- 진행 가능 여부 -->
          <div style="background: ${evaluation.is_ready ? 'var(--green-50)' : 'var(--yellow-50)'}; border: 1px solid ${evaluation.is_ready ? 'var(--green-200)' : 'var(--yellow-200)'}; border-radius: 12px; padding: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <i class="fas ${evaluation.is_ready ? 'fa-check-circle' : 'fa-exclamation-triangle'}" style="font-size: 24px; color: ${evaluation.is_ready ? 'var(--green-600)' : 'var(--yellow-600)'};"></i>
              <div>
                <p class="text-body2" style="color: var(--grey-900); font-weight: 600; margin-bottom: 4px;">
                  ${evaluation.is_ready ? 'AI 분석을 진행할 수 있어요!' : '기획안을 보완하면 더 정확한 분석이 가능해요'}
                </p>
                <p class="text-body3" style="color: var(--grey-600);">
                  ${evaluation.is_ready ? 'AI 분석을 시작하시겠어요?' : '지금 바로 분석하거나, 기획안을 수정한 후 다시 평가해보세요'}
                </p>
              </div>
            </div>
          </div>
        </div>
      `,
      confirmText: evaluation.is_ready ? 'AI 분석 시작하기' : '기획안 수정하기',
      cancelText: evaluation.is_ready ? '나중에' : 'AI 분석 시작하기',
      onConfirm: async () => {
        if (evaluation.is_ready) {
          analyzeProject();
        } else {
          // 평가 결과를 전달하여 편집 팝업에서 표시
          editProjectOverview(evaluation);
        }
        return true;
      },
      onCancel: async () => {
        if (!evaluation.is_ready) {
          analyzeProject();
        }
        return true;
      }
    });
    
  } catch (error) {
    console.error('Failed to evaluate project:', error);
    hideToast(loadingToast);
    
    // 에러 상세 정보 표시
    let errorMessage = '기획안 평가에 실패했습니다';
    if (error.response) {
      // 서버에서 에러 응답을 받은 경우
      errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못한 경우
      errorMessage = '서버 응답이 없습니다. 네트워크를 확인해주세요.';
    } else if (error.code === 'ECONNABORTED') {
      // 타임아웃
      errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
    }
    
    showToast(errorMessage, 'error');
  }
}

async function analyzeProject() {
  if (!currentProject) return;
  
  const inputContent = currentProject.input_content;
  if (!inputContent) {
    showToast('분석할 기획안이 없습니다', 'error');
    return;
  }
  
  // 🆕 요건 생성 모드 선택 모달 표시
  showRequirementModeSelectionModal();
}

// 🆕 요건 생성 모드 선택 모달
function showRequirementModeSelectionModal() {
  const modalId = 'modal-mode-selection';
  const modalContainer = document.getElementById('modal-container');

  modalContainer.innerHTML += `
    <div id="${modalId}" class="fixed inset-0 modal-backdrop flex items-center justify-center z-50 animate-fade-in">
      <div class="modal-content bg-white rounded-3xl" style="max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; margin: 20px;">
        <div class="modal-header p-6 border-b border-toss-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 class="modal-title text-2xl font-bold text-toss-gray-900">
            <i class="fas fa-lightbulb" style="color: #FFB300; margin-right: 8px;"></i>
            요건 생성 방식 선택
          </h2>
          <button onclick="closeModalById('${modalId}')" class="modal-close w-8 h-8 rounded-full hover:bg-toss-gray-100 flex items-center justify-center text-toss-gray-600 transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body p-8">
          <p style="color: var(--grey-700); margin-bottom: 24px; font-size: 15px; line-height: 24px;">
            AI가 기획안을 분석하여 요건을 생성하는 방식을 선택하세요
          </p>

          <!-- 초기 기획용 모드 -->
          <div class="mode-card" onclick="selectRequirementMode('initial', '${modalId}')" style="cursor: pointer; border: 2px solid var(--grey-200); border-radius: 12px; padding: 20px; margin-bottom: 16px; transition: all 0.2s;">
            <div style="display: flex; align-items: start; margin-bottom: 12px;">
              <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <i class="fas fa-bolt" style="color: white; font-size: 18px;"></i>
              </div>
              <div style="flex: 1;">
                <h3 style="font-size: 16px; font-weight: 700; color: var(--grey-900); margin-bottom: 4px;">
                  초기 기획용 (빠른 분석)
                </h3>
                <p style="font-size: 13px; color: var(--grey-600); line-height: 20px;">
                  한 번에 15개 요건을 자동 생성하고 각 요건마다 질문을 제공해요
                </p>
              </div>
            </div>
            <div style="background: var(--grey-50); padding: 12px; border-radius: 8px; font-size: 13px; color: var(--grey-700); line-height: 20px;">
              ✅ 빠른 분석 (약 60초)<br>
              ✅ 전체 요건 한눈에 파악<br>
              ✅ 기획 초기 단계에 적합
            </div>
          </div>

          <!-- 챌린지형 모드 -->
          <div class="mode-card" onclick="selectRequirementMode('challenge', '${modalId}')" style="cursor: pointer; border: 2px solid var(--grey-200); border-radius: 12px; padding: 20px; transition: all 0.2s;">
            <div style="display: flex; align-items: start; margin-bottom: 12px;">
              <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <i class="fas fa-trophy" style="color: white; font-size: 18px;"></i>
              </div>
              <div style="flex: 1;">
                <h3 style="font-size: 16px; font-weight: 700; color: var(--grey-900); margin-bottom: 4px;">
                  챌린지형 (상세 구체화)
                </h3>
                <p style="font-size: 13px; color: var(--grey-600); line-height: 20px;">
                  5개씩 추천하고 하나씩 방향성을 분석하며 상세하게 구체화해요
                </p>
              </div>
            </div>
            <div style="background: var(--grey-50); padding: 12px; border-radius: 8px; font-size: 13px; color: var(--grey-700); line-height: 20px;">
              ✅ 단계별 상세 구체화<br>
              ✅ 방향성 분석 및 피드백<br>
              ✅ 중복 없는 정확한 요건<br>
              ✅ 구현 상세화 단계에 적합
            </div>
          </div>
        </div>

        <div class="modal-footer p-6 border-t border-toss-gray-100 flex justify-center sticky bottom-0 bg-white">
          <button onclick="closeModalById('${modalId}')" class="btn-secondary px-6 py-3 rounded-xl bg-toss-gray-100 hover:bg-toss-gray-200 text-toss-gray-900 font-bold transition-colors">취소</button>
        </div>
      </div>
    </div>
  `;

  // 호버 효과
  setTimeout(() => {
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--blue-500)';
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 4px 12px rgba(49, 130, 246, 0.15)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--grey-200)';
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      });
    });
  }, 0);
}

// 🆕 요건 생성 모드 선택 처리
async function selectRequirementMode(mode, modalId = null) {
  if (modalId) {
    closeModalById(modalId);
  } else {
    closeModal();
  }

  if (!currentProject) return;

  try {
    // 모드 저장
    await axios.post(`${API_BASE}/projects/${currentProject.id}/select-requirement-mode`, { mode });
    currentProject.requirement_mode = mode;

    if (mode === 'initial') {
      // 기존 방식: 즉시 분석 시작
      await executeInitialAnalysis();
    } else {
      // 챌린지형: 5개 요건 추천
      await executeChallengeRecommendation();
    }
  } catch (error) {
    console.error('Mode selection error:', error);
    showToast('모드 선택에 실패했습니다', 'error');
  }
}

// 🆕 초기 기획용 분석 실행
async function executeInitialAnalysis() {
  const inputContent = currentProject.input_content;
  
  let imageUrls = [];
  if (currentProject.image_urls) {
    try {
      imageUrls = JSON.parse(currentProject.image_urls);
    } catch (error) {
      console.error('Failed to parse image URLs:', error);
    }
  }
  
  const loadingMessage = imageUrls.length > 0 
    ? `AI가 기획안과 이미지 ${imageUrls.length}장을 분석하고 있어요...`
    : 'AI가 기획안을 분석하고 있어요...';
  
  const loadingToast = showLoadingToast(loadingMessage);
  
  try {
    await axios.post(`${API_BASE}/projects/${currentProject.id}/analyze`, {
      project_id: currentProject.id,
      input_content: inputContent,
      image_urls: imageUrls
    }, { timeout: 360000 });
    
    hideToast(loadingToast);
    await selectProject(currentProject.id);
    switchTab('requirements');
    
    if (imageUrls.length > 0) {
      showToast(`분석이 완료되었습니다! (이미지 ${imageUrls.length}장 포함) 요건을 확인해보세요`, 'success');
    } else {
      showToast('분석이 완료되었습니다! 요건을 확인해보세요', 'success');
    }
  } catch (error) {
    console.error('Failed to analyze project:', error);
    hideToast(loadingToast);
    const errorMessage = error.response?.data?.message || error.message;
    showToast(`분석에 실패했습니다: ${errorMessage}`, 'error');
  }
}

// 🆕 챌린지형 요건 추천 실행
async function executeChallengeRecommendation() {
  const loadingToast = showLoadingToast('AI가 추천할 요건을 분석하고 있어요...');
  
  try {
    const response = await axios.post(`${API_BASE}/projects/${currentProject.id}/recommend-requirements`, {}, { timeout: 180000 });
    
    hideToast(loadingToast);
    
    // 추천 결과 모달 표시
    showChallengeRecommendationModal(response.data.requirements);
  } catch (error) {
    console.error('Failed to recommend requirements:', error);
    hideToast(loadingToast);
    const errorMessage = error.response?.data?.message || error.message;
    showToast(`요건 추천에 실패했습니다: ${errorMessage}`, 'error');
  }
}

// 🆕 챌린지형 추천 결과 모달
function showChallengeRecommendationModal(recommendations) {
  const modalId = 'modal-challenge-recommendations';
  const modalContainer = document.getElementById('modal-container');

  // 전역에 저장
  window.currentRecommendations = recommendations;

  modalContainer.innerHTML += `
    <div id="${modalId}" class="fixed inset-0 modal-backdrop flex items-center justify-center z-50 animate-fade-in">
      <div class="modal-content bg-white rounded-3xl" style="max-width: 700px; width: 100%; max-height: 85vh; overflow-y: auto; margin: 20px;">
        <div class="modal-header p-6 border-b border-toss-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 class="modal-title text-2xl font-bold text-toss-gray-900">
            <i class="fas fa-magic" style="color: #f5576c; margin-right: 8px;"></i>
            다음 요건 추천 (5개)
          </h2>
          <button onclick="closeModalById('${modalId}')" class="modal-close w-8 h-8 rounded-full hover:bg-toss-gray-100 flex items-center justify-center text-toss-gray-600 transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body p-6">
          <p style="color: var(--grey-700); margin-bottom: 20px; font-size: 14px;">
            AI가 분석한 결과, 다음 요건들을 구체화하는 것을 추천해요. 원하는 요건을 선택하면 방향성을 먼저 분석한 후 등록할지 결정할 수 있어요.
          </p>

          <div id="recommendation-list-${modalId}">
            ${recommendations.map((req, idx) => `
              <div class="recommendation-item" data-index="${idx}" style="border: 2px solid var(--grey-200); border-radius: 12px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s;"
                   onmouseenter="this.style.borderColor='var(--blue-500)'; this.style.backgroundColor='var(--blue-50)'; this.style.transform='translateY(-2px)'"
                   onmouseleave="this.style.borderColor='var(--grey-200)'; this.style.backgroundColor='transparent'; this.style.transform='translateY(0)'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                  <h4 style="font-size: 15px; font-weight: 700; color: var(--grey-900); flex: 1;">
                    ${req.title}
                  </h4>
                  <span class="badge badge-small badge-fill-${req.priority === 'high' ? 'red' : req.priority === 'medium' ? 'blue' : 'grey'}">${req.priority === 'high' ? '높음' : req.priority === 'medium' ? '중간' : '낮음'}</span>
                </div>
                <p style="font-size: 13px; color: var(--grey-600); line-height: 20px; margin-bottom: 8px;">
                  ${req.description}
                </p>
                <p style="font-size: 12px; color: var(--grey-500); line-height: 18px;">
                  💡 ${req.rationale}
                </p>
                <div style="margin-top: 12px; text-align: right;">
                  <button onclick="previewRecommendationDirection(${idx})" class="btn-primary btn-small" style="padding: 8px 16px; font-size: 13px;">
                    <i class="fas fa-search" style="margin-right: 6px;"></i>
                    방향성 분석 및 등록
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="modal-footer p-6 border-t border-toss-gray-100 flex justify-center sticky bottom-0 bg-white">
          <button onclick="closeModalById('${modalId}')" class="btn-secondary px-6 py-3 rounded-xl bg-toss-gray-100 hover:bg-toss-gray-200 text-toss-gray-900 font-bold transition-colors">나중에</button>
        </div>
      </div>
    </div>
  `;
}

// 🆕 추천 요건 방향성 미리보기 (저장하지 않고 분석만)
async function previewRecommendationDirection(index) {
  const recommendation = window.currentRecommendations[index];

  closeModalById('modal-challenge-recommendations');

  const loadingToast = showLoadingToast('요건 방향성을 분석하고 있어요...');

  try {
    // 요건 저장 없이 방향성 분석만 실행하는 새로운 API 사용
    const apiKey = window.API_KEY || ''; // If needed, pass API key

    // 새로운 엔드포인트: 저장 없이 방향성만 분석
    const response = await axios.post(`${API_BASE}/requirements/preview-direction`, {
      project_id: currentProject.id,
      title: recommendation.title,
      description: recommendation.description,
      requirement_type: recommendation.requirement_type,
      priority: recommendation.priority
    }, { timeout: 180000 });

    hideToast(loadingToast);

    // 방향성 미리보기 모달 표시 (저장하기/뒤로가기 선택 가능)
    showDirectionPreviewModal(index, response.data.analysis);

  } catch (error) {
    console.error('Failed to preview direction:', error);
    hideToast(loadingToast);

    // API 호출 실패 시 원래 추천 모달로 복귀
    showToast('방향성 분석에 실패했습니다. 다시 시도해주세요.', 'error');
    showChallengeRecommendationModal(window.currentRecommendations);
  }
}

// 🆕 방향성 미리보기 모달 (저장하기/뒤로가기 선택)
function showDirectionPreviewModal(recommendationIndex, analysis) {
  const modalId = 'modal-direction-preview';
  const modalContainer = document.getElementById('modal-container');
  const recommendation = window.currentRecommendations[recommendationIndex];

  modalContainer.innerHTML += `
    <div id="${modalId}" class="fixed inset-0 modal-backdrop flex items-center justify-center z-50 animate-fade-in">
      <div class="modal-content bg-white rounded-3xl" style="max-width: 750px; width: 100%; max-height: 90vh; overflow-y: auto; margin: 20px;">
        <div class="modal-header p-6 border-b border-toss-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 class="modal-title text-2xl font-bold text-toss-gray-900">
            <i class="fas fa-compass" style="color: #667eea; margin-right: 8px;"></i>
            방향성 분석 결과
          </h2>
          <button onclick="closeModalById('${modalId}'); showChallengeRecommendationModal(window.currentRecommendations);" class="modal-close w-8 h-8 rounded-full hover:bg-toss-gray-100 flex items-center justify-center text-toss-gray-600 transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body p-6">
          <!-- 요건 정보 헤더 -->
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #3182f6;">
            <h4 style="font-size: 15px; font-weight: 700; color: var(--grey-900); margin-bottom: 8px;">
              ${recommendation.title}
            </h4>
            <p style="font-size: 13px; color: var(--grey-600); line-height: 20px;">
              ${recommendation.description}
            </p>
          </div>

          <!-- 핵심 방향성 -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h4 style="font-size: 14px; font-weight: 700; color: white; opacity: 0.9; margin-bottom: 8px;">
              <i class="fas fa-compass" style="margin-right: 6px;"></i>
              핵심 방향성
            </h4>
            <p style="font-size: 15px; color: white; line-height: 24px;">
              ${analysis.direction}
            </p>
          </div>

          <!-- 명확히 해야 할 사항 -->
          <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; font-weight: 700; color: var(--grey-900); margin-bottom: 12px;">
              <i class="fas fa-check-circle" style="color: #00c853; margin-right: 6px;"></i>
              명확히 해야 할 사항
            </h4>
            <ul style="padding-left: 20px; margin: 0;">
              ${analysis.clarifications.map(item => `
                <li style="color: var(--grey-700); font-size: 14px; line-height: 24px; margin-bottom: 8px;">${item}</li>
              `).join('')}
            </ul>
          </div>

          <!-- 제안 접근 방식 -->
          <div style="background: var(--grey-50); padding: 16px; border-radius: 10px; margin-bottom: 20px;">
            <h4 style="font-size: 14px; font-weight: 700; color: var(--grey-900); margin-bottom: 8px;">
              <i class="fas fa-lightbulb" style="color: #FFB300; margin-right: 6px;"></i>
              제안하는 접근 방식
            </h4>
            <p style="font-size: 14px; color: var(--grey-700); line-height: 22px;">
              ${analysis.suggested_approach}
            </p>
          </div>

          <!-- 구체화 질문 -->
          <div>
            <h4 style="font-size: 14px; font-weight: 700; color: var(--grey-900); margin-bottom: 12px;">
              <i class="fas fa-question-circle" style="color: #3182f6; margin-right: 6px;"></i>
              구체화 질문 (${analysis.questions.length}개)
            </h4>
            <div style="background: var(--grey-50); padding: 16px; border-radius: 10px;">
              <ul style="padding-left: 20px; margin: 0;">
                ${analysis.questions.map((q, idx) => `
                  <li style="color: var(--grey-700); font-size: 13px; line-height: 22px; margin-bottom: 6px;">
                    ${idx + 1}. ${q.question_text}
                  </li>
                `).join('')}
              </ul>
            </div>
            <p style="font-size: 12px; color: var(--grey-500); margin-top: 8px;">
              💡 요건을 등록하면 위 질문들이 자동으로 생성됩니다.
            </p>
          </div>
        </div>

        <div class="modal-footer p-6 border-t border-toss-gray-100 flex justify-between sticky bottom-0 bg-white">
          <button onclick="closeModalById('${modalId}'); showChallengeRecommendationModal(window.currentRecommendations);" class="btn-secondary px-6 py-3 rounded-xl bg-toss-gray-100 hover:bg-toss-gray-200 text-toss-gray-900 font-bold transition-colors">
            <i class="fas fa-arrow-left" style="margin-right: 6px;"></i>
            다른 추천 보기
          </button>
          <button onclick="saveRecommendationAndGo(${recommendationIndex})" class="btn-primary px-6 py-3 rounded-xl font-bold shadow-lg">
            <i class="fas fa-save" style="margin-right: 6px;"></i>
            이 요건으로 등록하기
          </button>
        </div>
      </div>
    </div>
  `;
}

// 🆕 추천 요건 저장 및 이동
async function saveRecommendationAndGo(recommendationIndex) {
  const recommendation = window.currentRecommendations[recommendationIndex];

  closeModalById('modal-direction-preview');

  const loadingToast = showLoadingToast('요건을 저장하고 있습니다...');

  try {
    // 요건 저장
    const createResponse = await axios.post(`${API_BASE}/requirements`, {
      project_id: currentProject.id,
      title: recommendation.title,
      description: recommendation.description,
      requirement_type: recommendation.requirement_type,
      priority: recommendation.priority
    });

    const requirementId = createResponse.data.id;

    // 요건 수락 상태로 변경
    await axios.post(`${API_BASE}/requirements/${requirementId}/accept`);

    // 방향성 분석 (질문 생성용)
    await axios.post(`${API_BASE}/requirements/${requirementId}/analyze-direction`, {}, { timeout: 180000 });

    hideToast(loadingToast);

    // 요건 관리 탭으로 이동
    await selectProject(currentProject.id);
    switchTab('requirements');

    showToast('요건이 등록되었습니다! 질문에 답변하여 요건을 완성하세요.', 'success');

    // 약간의 지연 후 상세 모달 열기
    setTimeout(() => {
      openRequirementDetails(requirementId);
    }, 300);

  } catch (error) {
    console.error('Failed to save recommendation:', error);
    hideToast(loadingToast);
    showToast('요건 저장에 실패했습니다', 'error');
  }
}

// 🆕 (레거시) 추천 요건 선택 - 더 이상 사용되지 않음
async function selectRecommendation(index, element) {
  // 새로운 흐름: 방향성 미리보기로 이동
  previewRecommendationDirection(index);
}

// ============ 탭 전환 ============

function switchTab(tab) {
  currentTab = tab;
  
  // 모든 탭 버튼에서 active 클래스 제거
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 선택된 탭에 active 클래스 추가
  const activeTab = document.getElementById(`tab-${tab}`);
  if (activeTab) {
    activeTab.classList.add('active');
  }
  
  renderContent();
}

function renderContent() {
  const content = document.getElementById('content');
  content.className = 'animate-fade-in';
  
  if (!currentProject) {
    content.innerHTML = `
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
    `;
    return;
  }
  
  switch (currentTab) {
    case 'overview':
      renderOverview();
      break;
    case 'requirements':
      renderRequirements();
      break;
    case 'tree':
      renderTree();
      break;
    case 'prd':
      renderPRD();
      break;
  }
}

// Continue in next part...

// ============ 개요 탭 ============

function renderOverview() {
  const content = document.getElementById('content');
  
  // 디버깅: currentProject 상태 확인
  console.log('[renderOverview] Current project:', currentProject?.title);
  console.log('[renderOverview] Image URLs:', currentProject?.image_urls);
  console.log('[renderOverview] Image URLs type:', typeof currentProject?.image_urls);
  console.log('[renderOverview] Image URLs length:', currentProject?.image_urls?.length);
  
  // 상태별 주요 액션 버튼 결정
  let primaryAction = '';
  let secondaryActions = '';
  
  if (currentProject.status === 'draft') {
    if (currentProject.input_content) {
      // Draft + 기획안 있음: AI 분석이 주요 액션
      primaryAction = `
        <button onclick="analyzeProject()" class="btn-primary btn-large">
          <i class="fas fa-magic" style="margin-right: 8px; font-size: 16px;"></i>
          AI 분석 시작하기
        </button>
      `;
      secondaryActions = `
        <button onclick="evaluateProject()" class="btn-secondary btn-medium">
          <i class="fas fa-chart-line" style="margin-right: 6px; font-size: 14px;"></i>
          기획안 평가하기
        </button>
      `;
    } else {
      // Draft + 기획안 없음: 편집 유도
      primaryAction = `
        <div class="bg-blue-50 border-2 border-blue-200 border-dashed rounded-2xl p-8 text-center">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-pen-to-square text-3xl text-toss-blue"></i>
          </div>
          <p class="text-lg font-bold text-toss-gray-900 mb-2">기획안을 작성해주세요</p>
          <p class="text-sm text-toss-gray-600 mb-4">프로젝트 목표, 사용자, 주요 기능 등을 입력하면<br>AI가 자동으로 세부 요건을 만들어드려요</p>
          <button onclick="editProjectOverview()" class="btn-primary btn-large">
            <i class="fas fa-edit" style="margin-right: 8px; font-size: 16px;"></i>
            기획안 작성하기
          </button>
        </div>
      `;
    }
  } else if (currentProject.status === 'in_progress') {
    // In Progress: 요건 확인이 주요 액션
    primaryAction = `
      <button onclick="switchTab('requirements')" class="btn-large btn-primary text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
        <i class="fas fa-list-check"></i>
        요건 확인하기
      </button>
    `;
    secondaryActions = `
      <button onclick="evaluateProject()" class="btn-small text-toss-gray-600 hover:text-toss-blue px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-all">
        <i class="fas fa-chart-line text-sm"></i>
        재평가
      </button>
    `;
  } else if (currentProject.status === 'completed') {
    // Completed: PRD 보기가 주요 액션
    primaryAction = `
      <button onclick="switchTab('prd')" class="btn-large bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
        <i class="fas fa-file-alt"></i>
        PRD 문서 보기
      </button>
    `;
    secondaryActions = `
      <button onclick="switchTab('requirements')" class="btn-medium text-toss-gray-700 hover:text-toss-blue px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border-2 border-toss-gray-200 hover:border-toss-blue transition-all">
        <i class="fas fa-list-check"></i>
        요건 다시 보기
      </button>
    `;
  }
  
  content.innerHTML = `
    <div class="max-w-4xl">
      <!-- 헤더 -->
      <div class="mb-8">
        <div class="flex items-start justify-between mb-3">
          <h1 class="text-4xl font-bold text-toss-gray-900 flex-1">${escapeHtml(currentProject.title)}</h1>
          <button onclick="editProjectOverview()" class="btn-icon text-toss-gray-400 hover:text-toss-blue transition-colors ml-4" title="편집">
            <i class="fas fa-edit text-xl"></i>
          </button>
        </div>
        <div class="flex items-center gap-3 text-sm text-toss-gray-600">
          <span><i class="far fa-calendar mr-1"></i>${formatDate(currentProject.created_at)}</span>
          ${getStatusBadge(currentProject.status)}
        </div>
      </div>
      
      <!-- 프로젝트 설명 -->
      ${currentProject.description ? `
        <div class="card p-6 mb-6">
          <h2 class="text-lg font-bold text-toss-gray-900 mb-3 flex items-center gap-2">
            <i class="fas fa-align-left text-toss-blue"></i>
            프로젝트 설명
          </h2>
          <p class="text-toss-gray-700 leading-relaxed">${escapeHtml(currentProject.description)}</p>
        </div>
      ` : ''}
      
      <!-- 상위 기획안 -->
      ${currentProject.input_content ? `
        <div class="card p-6 mb-6">
          <h2 class="text-lg font-bold text-toss-gray-900 mb-3 flex items-center gap-2">
            <i class="fas fa-file-alt text-toss-blue"></i>
            상위 기획안
          </h2>
          <div class="text-toss-gray-700 whitespace-pre-wrap leading-relaxed text-sm">${escapeHtml(currentProject.input_content)}</div>
        </div>
      ` : ''}
      
      <!-- 기획안 이미지 -->
      ${currentProject.image_urls && currentProject.image_urls !== 'null' && currentProject.image_urls.length > 2 ? `
        <div class="card p-6 mb-6">
          <h2 class="text-lg font-bold text-toss-gray-900 mb-3 flex items-center gap-2">
            <i class="fas fa-images text-toss-blue"></i>
            기획안 이미지
            <span class="text-sm font-normal text-toss-gray-500">(${JSON.parse(currentProject.image_urls).length}장)</span>
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            ${JSON.parse(currentProject.image_urls).map((imgUrl, index) => `
              <div class="relative group cursor-pointer" onclick="showImageModal('${imgUrl.replace(/'/g, "\\'")}', ${index + 1})">
                <img src="${imgUrl}" class="w-full h-48 object-cover rounded-xl border-2 border-toss-gray-200 hover:border-toss-blue transition-all">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-xl flex items-center justify-center">
                  <i class="fas fa-search-plus text-white text-2xl opacity-0 group-hover:opacity-100 transition-all"></i>
                </div>
                <div class="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-lg">
                  ${index + 1}/${JSON.parse(currentProject.image_urls).length}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- 액션 버튼들 -->
      <div class="flex items-center gap-3 flex-wrap">
        ${primaryAction}
        ${secondaryActions}
      </div>
    </div>
  `;
}

// 프로젝트 개요 편집
// 평가 결과가 있다면 자동으로 불러와서 표시
async function editProjectOverview(evaluationData = null) {
  if (!currentProject) return;
  
  // 기존 이미지 로드
  uploadedImages = [];
  if (currentProject.image_urls) {
    try {
      const urls = JSON.parse(currentProject.image_urls);
      uploadedImages = urls.map((data, index) => ({
        data: data,
        name: `image_${index + 1}.png`
      }));
    } catch (error) {
      console.error('Failed to parse image URLs:', error);
    }
  }
  
  // 평가 결과가 전달되지 않았다면 최근 평가 결과 불러오기 시도
  let evaluation = evaluationData;
  
  if (!evaluation && currentProject.id) {
    try {
      // 평가 결과를 조용히 불러오기 (실패해도 무시)
      const response = await axios.get(`${API_BASE}/projects/${currentProject.id}/last-evaluation`);
      if (response.data && response.data.completeness_score !== undefined) {
        evaluation = response.data;
      }
    } catch (error) {
      // 평가 결과가 없거나 실패해도 계속 진행
      console.log('No previous evaluation found');
    }
  }
  
  showModal({
    title: '프로젝트 개요 편집',
    size: 'large',
    content: `
      <div class="space-y-6">
        ${evaluation ? `
        <!-- 평가 결과 표시 -->
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%); border: 2px solid #bfdbfe; border-radius: 16px; padding: 20px;">
          <!-- 완성도 점수 영역 -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div>
                <div style="color: white; font-size: 14px; font-weight: 600; margin-bottom: 4px;">완성도 점수</div>
                <div style="color: rgba(255, 255, 255, 0.8); font-size: 12px;">현재 기획안의 완성도를 평가했어요</div>
              </div>
              <div style="display: flex; align-items: baseline; gap: 4px;">
                <span style="color: white; font-size: 48px; font-weight: 700; line-height: 1;">${evaluation.completeness_score}</span>
                <span style="color: rgba(255, 255, 255, 0.9); font-size: 20px; font-weight: 600;">/100</span>
              </div>
            </div>
            
            <!-- 진행 바 -->
            <div style="background: rgba(255, 255, 255, 0.2); height: 8px; border-radius: 999px; overflow: hidden;">
              <div style="background: white; height: 100%; width: ${evaluation.completeness_score}%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 999px;"></div>
            </div>
          </div>
          
          <!-- 프로젝트 성격 (있을 경우) -->
          ${evaluation.project_type ? `
          <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="color: var(--grey-900); font-size: 13px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-lightbulb" style="color: var(--blue-500);"></i>
              프로젝트 성격
            </div>
            <p style="color: var(--grey-700); font-size: 13px; line-height: 1.5;">${escapeHtml(evaluation.project_type)}</p>
          </div>
          ` : ''}
          
          <!-- 보완 항목 -->
          ${evaluation.missing_items && evaluation.missing_items.length > 0 ? `
          <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="color: var(--orange-600); font-size: 13px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-exclamation-circle"></i>
              보완하면 좋을 항목
            </div>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${evaluation.missing_items.map(item => `
                <li style="color: var(--grey-700); font-size: 13px; line-height: 1.6; padding: 6px 0; display: flex; align-items: start; gap: 8px;">
                  <i class="fas fa-circle" style="color: var(--orange-500); font-size: 6px; margin-top: 7px;"></i>
                  <span>${escapeHtml(item)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          <!-- 개선 제안 -->
          ${evaluation.suggestions && evaluation.suggestions.length > 0 ? `
          <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="color: var(--blue-500); font-size: 13px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-lightbulb"></i>
              개선 제안
            </div>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${evaluation.suggestions.map(suggestion => `
                <li style="color: var(--grey-700); font-size: 13px; line-height: 1.6; padding: 6px 0; display: flex; align-items: start; gap: 8px;">
                  <i class="fas fa-check" style="color: var(--blue-500); font-size: 10px; margin-top: 5px;"></i>
                  <span>${escapeHtml(suggestion)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          <!-- 개발 관점 보완 항목 -->
          ${evaluation.dev_perspective_items && evaluation.dev_perspective_items.length > 0 ? `
          <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="color: var(--purple-600); font-size: 13px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-code"></i>
              개발 관점에서 보완하면 좋을 항목
            </div>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${evaluation.dev_perspective_items.map(item => `
                <li style="color: var(--grey-700); font-size: 13px; line-height: 1.6; padding: 6px 0; display: flex; align-items: start; gap: 8px;">
                  <i class="fas fa-circle" style="color: var(--purple-500); font-size: 6px; margin-top: 7px;"></i>
                  <span>${escapeHtml(item)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          <!-- 운영 관점 보완 항목 -->
          ${evaluation.ops_perspective_items && evaluation.ops_perspective_items.length > 0 ? `
          <div style="background: white; border-radius: 12px; padding: 16px;">
            <div style="color: var(--green-600); font-size: 13px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-cog"></i>
              운영 관점에서 보완하면 좋을 항목
            </div>
            <p style="color: var(--grey-600); font-size: 11px; margin-bottom: 12px; padding-left: 20px;">
              💡 아젠다에 따라 운영 범위가 다르므로 참고용으로 활용하세요
            </p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${evaluation.ops_perspective_items.map(item => `
                <li style="color: var(--grey-700); font-size: 13px; line-height: 1.6; padding: 6px 0; display: flex; align-items: start; gap: 8px;">
                  <i class="fas fa-circle" style="color: var(--green-500); font-size: 6px; margin-top: 7px;"></i>
                  <span>${escapeHtml(item)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
        ` : ''}
      
        <!-- 프로젝트 이름 -->
        <div>
          <label class="block text-sm font-semibold text-toss-gray-900 mb-2">프로젝트 이름 *</label>
          <input type="text" id="edit-project-title" value="${escapeHtml(currentProject.title)}" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors">
        </div>
        
        <!-- 프로젝트 설명 -->
        <div>
          <label class="block text-sm font-semibold text-toss-gray-900 mb-2">프로젝트 설명</label>
          <textarea id="edit-project-description" rows="3" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors">${escapeHtml(currentProject.description || '')}</textarea>
        </div>
        
        <!-- 상위 기획안 -->
        <div>
          <label class="block text-sm font-semibold text-toss-gray-900 mb-2">상위 기획안</label>
          
          ${!evaluation ? `
          <!-- 작성 가이드 (평가 결과가 없을 때만 표시) -->
          <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-3">
            <div class="flex gap-3">
              <i class="fas fa-lightbulb text-toss-blue text-lg"></i>
              <div class="flex-1">
                <p class="text-sm font-semibold text-toss-gray-900 mb-2">💡 포함하면 좋은 내용</p>
                <ul class="text-xs text-toss-gray-700 space-y-1.5">
                  <li class="flex items-start gap-2">
                    <i class="fas fa-check text-toss-blue mt-0.5 text-[10px]"></i>
                    <span><strong>프로젝트 성격</strong>: 어떤 종류의 제품/서비스인가요?</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <i class="fas fa-check text-toss-blue mt-0.5 text-[10px]"></i>
                    <span><strong>목표 및 배경</strong>: 왜 만들고, 어떤 문제를 해결하나요?</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <i class="fas fa-check text-toss-blue mt-0.5 text-[10px]"></i>
                    <span><strong>타겟 사용자</strong>: 주요 사용자는 누구인가요?</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <i class="fas fa-check text-toss-blue mt-0.5 text-[10px]"></i>
                    <span><strong>핵심 기능</strong>: 반드시 필요한 기능들은 무엇인가요?</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <i class="fas fa-check text-toss-blue mt-0.5 text-[10px]"></i>
                    <span><strong>사용자 시나리오</strong>: 주요 사용 흐름은 어떻게 되나요?</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <i class="fas fa-check text-toss-blue mt-0.5 text-[10px]"></i>
                    <span><strong>기술 제약/외부 연동</strong>: 특별히 고려할 사항이 있나요?</span>
                  </li>
                </ul>
                <p class="text-xs text-toss-gray-600 mt-3 pt-3 border-t border-blue-200">
                  <i class="fas fa-info-circle mr-1"></i>
                  작성 후 개요 탭에서 <strong>'기획안 평가하기'</strong> 버튼으로 AI 피드백을 받을 수 있어요
                </p>
              </div>
            </div>
          </div>
          ` : ''}
          
          <textarea id="edit-project-input" rows="12" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors font-mono text-sm leading-relaxed" placeholder="프로젝트에 대해 자유롭게 작성해주세요...">${escapeHtml(currentProject.input_content || '')}</textarea>
          
          <!-- 이미지 업로드 -->
          <div class="mt-4">
            <label class="block text-sm font-semibold text-toss-gray-900 mb-2">
              기획안 이미지 (선택)
              <span class="text-xs font-normal text-toss-gray-500 ml-2">PPT 장표를 이미지로 저장해서 업로드하세요 (최대 10장)</span>
            </label>
            <div class="bg-white border-2 border-dashed border-toss-gray-300 rounded-xl p-6 text-center hover:border-toss-blue transition-colors cursor-pointer" onclick="document.getElementById('edit-project-images').click()">
              <i class="fas fa-images text-3xl text-toss-gray-400 mb-2"></i>
              <p class="text-sm text-toss-gray-600 mb-1">클릭하여 이미지 업로드</p>
              <p class="text-xs text-toss-gray-500">PNG, JPG 형식 (최대 10장)</p>
            </div>
            <input type="file" id="edit-project-images" accept="image/*" multiple style="display: none;" onchange="handleEditImageUpload(event)">
            <div id="edit-image-preview-container" class="mt-3 grid grid-cols-5 gap-2"></div>
          </div>
        </div>
      </div>
    `,
    confirmText: '저장하기',
    cancelText: '취소',
    onConfirm: async () => {
      const title = document.getElementById('edit-project-title').value.trim();
      const description = document.getElementById('edit-project-description').value.trim();
      const inputContent = document.getElementById('edit-project-input').value.trim();
      
      if (!title) {
        showToast('프로젝트 이름을 입력해주세요', 'error');
        return false;
      }
      
      try {
        // 이미지 URL 배열 생성 (Base64 데이터)
        const imageUrls = uploadedImages.map(img => img.data);
        
        await axios.put(`${API_BASE}/projects/${currentProject.id}`, {
          title,
          description,
          input_content: inputContent,
          status: currentProject.status,
          image_urls: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null
        });
        
        currentProject = { 
          ...currentProject, 
          title, 
          description, 
          input_content: inputContent,
          image_urls: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null
        };
        await loadProjects();
        renderContent();
        
        if (imageUrls.length > 0) {
          showToast(`프로젝트가 수정되었습니다 (이미지 ${imageUrls.length}장)`, 'success');
        } else {
          showToast('프로젝트가 수정되었습니다', 'success');
        }
        
        return true;
      } catch (error) {
        console.error('Failed to update project:', error);
        showToast('프로젝트 수정에 실패했습니다', 'error');
        return false;
      }
    }
  });
  
  // 모달이 렌더링된 후 이미지 미리보기 표시
  setTimeout(() => {
    renderEditImagePreviews();
  }, 100);
}

// ============ 요건 관리 탭 ============

async function renderRequirements(page = 1) {
  const content = document.getElementById('content');
  
  try {
    console.log('[요건 조회] 페이지:', page, '프로젝트 ID:', currentProject?.id);
    
    if (!currentProject || !currentProject.id) {
      console.error('[요건 조회] currentProject가 설정되지 않았습니다');
      content.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
          <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <i class="fas fa-exclamation-triangle text-4xl text-red-500"></i>
          </div>
          <h2 class="text-2xl font-bold text-toss-gray-900 mb-3">프로젝트를 선택해주세요</h2>
          <p class="text-toss-gray-600 text-center max-w-md mb-6">
            좌측 사이드바에서 프로젝트를 선택하거나 새로 생성하세요
          </p>
        </div>
      `;
      return;
    }
    
    console.log('[Performance] Loading requirements for page:', page);
    const startTime = performance.now();
    
    const response = await axios.get(`${API_BASE}/projects/${currentProject.id}/requirements`);
    requirements = response.data || [];
    totalRequirements = requirements.length;
    
    const loadTime = performance.now() - startTime;
    console.log(`[Performance] Requirements loaded in ${loadTime.toFixed(0)}ms (${requirements.length}개)`);
    
    if (!requirements.length) {
      content.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
          <div class="w-20 h-20 bg-toss-gray-100 rounded-full flex items-center justify-center mb-6">
            <i class="fas fa-clipboard-list text-4xl text-toss-gray-400"></i>
          </div>
          <h2 class="text-2xl font-bold text-toss-gray-900 mb-3">아직 요건이 없어요</h2>
          <p class="text-toss-gray-600 text-center max-w-md mb-6">
            AI 분석을 실행하면 자동으로 요건이 생성돼요
          </p>
          ${currentProject.input_content ? `
            <button onclick="analyzeProject()" class="btn-primary btn-large">
              <i class="fas fa-magic" style="margin-right: 8px; font-size: 16px;"></i>
              AI 분석 시작하기
            </button>
          ` : ''}
        </div>
      `;
      return;
    }
    
    // 🚀 페이지네이션: 상위 요건만 페이지네이션 적용
    const topLevelRequirements = requirements.filter(r => !r.parent_id);
    const totalPages = Math.ceil(topLevelRequirements.length / ITEMS_PER_PAGE);
    currentPage = Math.min(page, totalPages);
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedRequirements = topLevelRequirements.slice(startIndex, endIndex);
    
    console.log(`[Performance] Rendering ${paginatedRequirements.length}/${topLevelRequirements.length} requirements (page ${currentPage}/${totalPages})`);
    
    content.innerHTML = `
      <div>
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="text-3xl font-bold text-toss-gray-900 mb-2">요건 관리</h1>
            <p class="text-sm text-toss-gray-600">각 요건의 질문에 답변해주세요 · 총 ${topLevelRequirements.length}개</p>
          </div>
          <div class="flex gap-3">
            <button onclick="generateAdditionalRequirements()" 
                    class="btn-secondary btn-medium"
                    title="기존 요건과 중복되지 않는 새로운 요건을 AI가 제안합니다">
              <i class="fas fa-plus-circle" style="margin-right: 6px; font-size: 14px;"></i>
              추가 요건 생성
            </button>
            <button onclick="generatePRD()" 
                    class="btn-primary btn-medium">
              <i class="fas fa-file-alt" style="margin-right: 6px; font-size: 14px;"></i>
              PRD 생성하기
            </button>
          </div>
        </div>
        
        <div class="space-y-4" id="requirements-list">
          ${paginatedRequirements.map(req => renderRequirementCard(req)).join('')}
        </div>
        
        ${totalPages > 1 ? renderPagination(currentPage, totalPages) : ''}
      </div>
    `;
    
    const renderTime = performance.now() - startTime;
    console.log(`[Performance] Total render time: ${renderTime.toFixed(0)}ms`);
  } catch (error) {
    console.error('[요건 조회] 실패:', error);
    console.error('[요건 조회] 에러 상세:', error.response?.data);
    
    let errorMessage = '요건을 불러오는데 실패했습니다';
    let errorDetail = '';
    
    if (error.response) {
      // 서버 응답 에러
      if (error.response.status === 404) {
        errorMessage = '프로젝트를 찾을 수 없습니다';
        errorDetail = '프로젝트가 삭제되었거나 존재하지 않습니다';
      } else if (error.response.status === 500) {
        errorMessage = '서버 오류가 발생했습니다';
        errorDetail = error.response.data?.message || error.response.data?.error || '';
      } else {
        errorDetail = error.response.data?.message || error.response.data?.error || '';
      }
    } else if (error.request) {
      // 네트워크 에러
      errorMessage = '네트워크 연결을 확인해주세요';
      errorDetail = '서버에 연결할 수 없습니다';
    } else {
      // 기타 에러
      errorDetail = error.message || '';
    }
    
    content.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20">
        <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <i class="fas fa-exclamation-circle text-4xl text-red-500"></i>
        </div>
        <h2 class="text-2xl font-bold text-toss-gray-900 mb-3">${errorMessage}</h2>
        ${errorDetail ? `<p class="text-toss-gray-600 text-center max-w-md mb-6">${errorDetail}</p>` : ''}
        <button onclick="renderRequirements(1)" class="btn-secondary btn-medium">
          <i class="fas fa-redo" style="margin-right: 6px; font-size: 14px;"></i>
          다시 시도
        </button>
      </div>
    `;
  }
}

// 🚀 페이지네이션 UI 렌더링
function renderPagination(current, total) {
  const pages = [];
  const maxVisible = 5;
  
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  let end = Math.min(total, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return `
    <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 32px; padding: 16px;">
      <button 
        onclick="renderRequirements(${current - 1})" 
        ${current === 1 ? 'disabled' : ''}
        class="btn-secondary btn-small"
        style="${current === 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
        <i class="fas fa-chevron-left"></i>
      </button>
      
      ${start > 1 ? `
        <button onclick="renderRequirements(1)" class="btn-secondary btn-small">1</button>
        ${start > 2 ? '<span style="color: var(--grey-400); padding: 0 4px;">...</span>' : ''}
      ` : ''}
      
      ${pages.map(p => `
        <button 
          onclick="renderRequirements(${p})" 
          class="${p === current ? 'btn-primary' : 'btn-secondary'} btn-small"
          style="min-width: 40px;">
          ${p}
        </button>
      `).join('')}
      
      ${end < total ? `
        ${end < total - 1 ? '<span style="color: var(--grey-400); padding: 0 4px;">...</span>' : ''}
        <button onclick="renderRequirements(${total})" class="btn-secondary btn-small">${total}</button>
      ` : ''}
      
      <button 
        onclick="renderRequirements(${current + 1})" 
        ${current === total ? 'disabled' : ''}
        class="btn-secondary btn-small"
        style="${current === total ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
}

function renderRequirementCard(requirement) {
  const children = requirements.filter(r => r.parent_id === requirement.id);
  
  // 질문 통계
  const stats = requirement.question_stats || { total: 0, answered: 0, remaining: 0 };
  const progressPercent = stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0;
  
  // 토스 디자인 시스템 Badge 스타일
  const priorityBadges = {
    critical: 'badge badge-small badge-fill-red',
    high: 'badge badge-small badge-fill-yellow',
    medium: 'badge badge-small badge-fill-blue',
    low: 'badge badge-small badge-weak-grey',
  };
  
  const statusBadges = {
    completed: 'badge badge-small badge-fill-green',
    in_progress: 'badge badge-small badge-weak-blue',
    pending: 'badge badge-small badge-weak-grey'
  };
  
  const priorityIcons = {
    critical: 'fa-fire',
    high: 'fa-arrow-up',
    medium: 'fa-equals',
    low: 'fa-arrow-down'
  };
  
  const statusTexts = {
    completed: '완료',
    in_progress: '진행중',
    pending: '대기'
  };
  
  return `
    <div class="card p-6 card-hover requirement-card-mobile" data-requirement-id="${requirement.id}">
      <div class="requirement-header" style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            <h3 class="text-title4" style="color: var(--grey-900);">${escapeHtml(requirement.title)}</h3>
            <span class="${priorityBadges[requirement.priority] || priorityBadges.medium}">
              <i class="fas ${priorityIcons[requirement.priority] || priorityIcons.medium}" style="margin-right: 4px; font-size: 10px;"></i>${requirement.priority.toUpperCase()}
            </span>
            <span class="${statusBadges[requirement.status] || statusBadges.pending}">
              ${statusTexts[requirement.status] || '대기'}
            </span>
          </div>
          ${requirement.description ? `<p class="text-body2" style="color: var(--grey-600); line-height: 1.6; margin-bottom: 12px;">${escapeHtml(requirement.description)}</p>` : ''}
          
          ${stats.total > 0 ? `
            <div class="mobile-hide-progress" style="margin-top: 12px; padding: 12px; background: var(--grey-50); border-radius: var(--radius-8);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fas fa-clipboard-list" style="color: var(--blue-500); font-size: 13px;"></i>
                  <span class="text-body3" style="color: var(--grey-700); font-weight: 600;">질문 진행률</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <span class="text-body3" style="color: var(--blue-600); font-weight: 700;">${progressPercent}%</span>
                  <span class="text-body3" style="color: var(--grey-600);">
                    <span style="color: var(--green-600); font-weight: 600;">${stats.answered}</span>
                    /
                    <span style="font-weight: 600;">${stats.total}</span>
                    답변
                  </span>
                  ${stats.remaining > 0 ? `
                    <span class="badge badge-small badge-weak-red">
                      <i class="fas fa-exclamation-circle" style="margin-right: 4px; font-size: 9px;"></i>
                      ${stats.remaining}개 남음
                    </span>
                  ` : `
                    <span class="badge badge-small badge-fill-green">
                      <i class="fas fa-check-circle" style="margin-right: 4px; font-size: 9px;"></i>
                      완료
                    </span>
                  `}
                </div>
              </div>
              <div style="width: 100%; height: 6px; background: var(--grey-200); border-radius: 999px; overflow: hidden;">
                <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, var(--blue-500), var(--blue-400)); transition: width 0.3s ease;"></div>
              </div>
            </div>
          ` : ''}
          ${stats.total > 0 ? `
            <div style="display: none; margin-top: 8px;">
              <span class="text-xs text-grey-600">
                ${stats.answered}/${stats.total} 답변 (${progressPercent}%)
              </span>
            </div>
          ` : ''}
        </div>
        <div class="requirement-actions" style="display: flex; align-items: center; gap: 4px; margin-left: 16px;">
          <button onclick="editRequirement(${requirement.id})" class="btn-icon" title="편집">
            <i class="fas fa-edit" style="font-size: 13px;"></i>
          </button>
          <button onclick="deleteRequirement(${requirement.id})" class="btn-icon" title="삭제" style="color: var(--red-500);">
            <i class="fas fa-trash" style="font-size: 13px;"></i>
          </button>
          <button onclick="openRequirementDetails(${requirement.id})" class="btn-small text-toss-blue hover:text-blue-600 ml-2">
            <span>상세보기</span>
            <i class="fas fa-chevron-right text-xs ml-1"></i>
          </button>
        </div>
      </div>
      
      ${children.length > 0 ? `
        <div class="mt-4 pl-4 border-l-2 border-toss-gray-200 space-y-3">
          ${children.map(child => {
            const childStats = child.question_stats || { total: 0, answered: 0, remaining: 0 };
            const childProgress = childStats.total > 0 ? Math.round((childStats.answered / childStats.total) * 100) : 0;
            return `
              <div class="bg-toss-gray-50 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2 flex-1">
                    <span class="font-semibold text-sm text-toss-gray-900">${escapeHtml(child.title)}</span>
                    <span class="text-xs text-toss-blue bg-blue-50 px-2 py-0.5 rounded">파생</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button onclick="editRequirement(${child.id})" class="btn-icon text-toss-gray-400 hover:text-toss-blue text-xs" title="편집">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteRequirement(${child.id})" class="btn-icon text-toss-gray-400 hover:text-red-500 text-xs" title="삭제">
                      <i class="fas fa-trash"></i>
                    </button>
                    <button onclick="openRequirementDetails(${child.id})" class="btn-small text-toss-blue hover:text-blue-600 text-xs ml-1">
                      상세보기
                    </button>
                  </div>
                </div>
                ${childStats.total > 0 ? `
                  <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: white; border-radius: 6px;">
                    <div style="flex: 1; height: 4px; background: var(--grey-200); border-radius: 999px; overflow: hidden;">
                      <div style="width: ${childProgress}%; height: 100%; background: var(--blue-500); transition: width 0.3s ease;"></div>
                    </div>
                    <span class="text-xs text-grey-600">${childStats.answered}/${childStats.total}</span>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

async function openRequirementDetails(requirementId) {
  try {
    const response = await axios.get(`${API_BASE}/requirements/${requirementId}`);
    const requirement = response.data;
    const questions = requirement.questions || [];
    
    // 질문 트리 구조 생성 (parent_question_id 기반)
    const questionTree = buildQuestionTree(questions);
    
    // 답변된 질문 개수 확인
    const answeredCount = questions.filter(q => q.answer).length;
    const hasAnswers = answeredCount > 0;
    
    showModal({
      title: requirement.title,
      content: `
        <div class="space-y-6">
          ${requirement.description ? `
            <div class="bg-toss-gray-50 rounded-xl p-4">
              <p class="text-sm text-toss-gray-700 leading-relaxed">${escapeHtml(requirement.description)}</p>
            </div>
          ` : ''}
          
          ${questions.length > 0 ? `
            <div>
              <h3 class="font-bold text-toss-gray-900 mb-4 flex items-center gap-2">
                <i class="fas fa-question-circle text-toss-blue"></i>
                확인 질문 (${questions.length}개)
                ${hasAnswers ? `<span class="text-xs font-semibold text-green-600 ml-2">${answeredCount}/${questions.length} 답변 완료</span>` : ''}
              </h3>
              
              <div class="space-y-3">
                ${renderQuestionTree(questionTree, 0, requirementId)}
              </div>
              
              ${hasAnswers ? `
                <div class="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div class="flex items-start gap-3">
                    <i class="fas fa-magic text-toss-blue text-xl"></i>
                    <div class="flex-1">
                      <p class="text-sm font-semibold text-toss-gray-900 mb-1">답변을 바탕으로 파생 요건 생성하기</p>
                      <p class="text-xs text-toss-gray-600 mb-3">AI가 답변 내용을 분석하여 추가로 필요한 요건을 자동으로 생성해드려요</p>
                      <button onclick="closeAllModals(); generateDerivedRequirements(${requirementId})" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                        <i class="fas fa-plus-circle mr-1"></i>
                        파생 요건 생성하기
                      </button>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          ` : '<p class="text-sm text-toss-gray-500 text-center py-8">질문이 없습니다</p>'}
        </div>
      `,
      size: 'large'
    });
  } catch (error) {
    console.error('Failed to load requirement details:', error);
    showToast('요건 상세 정보를 불러오는데 실패했습니다', 'error');
  }
}

// 질문 트리 구조 생성
function buildQuestionTree(questions) {
  const questionMap = new Map();
  const rootQuestions = [];
  
  // 먼저 모든 질문을 맵에 저장
  questions.forEach(q => {
    questionMap.set(q.id, { ...q, children: [] });
  });
  
  // 부모-자식 관계 설정
  questions.forEach(q => {
    const node = questionMap.get(q.id);
    if (q.parent_question_id) {
      const parent = questionMap.get(q.parent_question_id);
      if (parent) {
        parent.children.push(node);
      } else {
        rootQuestions.push(node);
      }
    } else {
      rootQuestions.push(node);
    }
  });
  
  return rootQuestions;
}

// 질문 트리 렌더링 (재귀) - 그룹핑 강화
function renderQuestionTree(nodes, level = 0, requirementId = null) {
  return nodes.map((node, index) => {
    const isRoot = level === 0;
    const hasAnswer = node.answer && node.answer.answer_text;
    const hasChildren = node.children && node.children.length > 0;
    const childrenCount = hasChildren ? node.children.length : 0;
    
    return `
      <div class="question-group ${isRoot ? 'root-question-group' : 'child-question-group'} mb-6">
        <!-- 루트 질문: 강조된 카드 형태 -->
        ${isRoot ? `
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-10 h-10 rounded-full ${hasAnswer ? 'bg-green-500' : 'bg-toss-blue'} text-white flex items-center justify-center font-bold shadow-md">
                ${hasAnswer ? '<i class="fas fa-check text-lg"></i>' : '<span class="text-lg">?</span>'}
              </div>
              <div class="flex-1">
                <div class="flex items-start justify-between gap-3 mb-3">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs font-bold text-toss-blue uppercase tracking-wide">메인 질문</span>
                      ${hasChildren ? `<span class="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-semibold">+${childrenCount}개 파생</span>` : ''}
                    </div>
                    <p class="font-bold text-base text-toss-gray-900 leading-relaxed">${escapeHtml(node.question_text)}</p>
                  </div>
                  <button onclick="deleteQuestion(${node.id}, '${escapeHtml(node.question_text).replace(/'/g, "\\'")}'); event.stopPropagation();" 
                          class="btn-icon text-red-500 hover:bg-red-100 flex-shrink-0" 
                          title="질문 삭제">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
                
                ${hasAnswer ? `
                  <div class="bg-white border-2 border-green-300 rounded-lg p-4 shadow-sm">
                    <div class="flex items-center justify-between mb-2">
                      <p class="text-xs font-bold text-green-700 uppercase tracking-wide flex items-center gap-1">
                        <i class="fas fa-check-circle"></i>
                        답변 완료
                      </p>
                      <button onclick="editAnswer(${node.answer.id}, '${escapeHtml(node.answer.answer_text).replace(/'/g, "\\'")}', ${node.id}, ${requirementId}); event.stopPropagation();" 
                              class="text-toss-blue hover:text-blue-700 text-xs font-semibold flex items-center gap-1"
                              title="답변 수정">
                        <i class="fas fa-edit"></i>
                        수정
                      </button>
                    </div>
                    <p class="text-sm text-toss-gray-800 leading-relaxed whitespace-pre-wrap">${escapeHtml(node.answer.answer_text)}</p>
                  </div>
                ` : `
                  <div class="bg-white rounded-lg border-2 border-toss-gray-200 p-3">
                    <textarea id="answer-${node.id}" rows="3" class="w-full bg-transparent border-0 text-sm text-toss-gray-900 focus:outline-none resize-none" placeholder="답변을 입력해주세요..."></textarea>
                    <div class="flex justify-end mt-2">
                      <button onclick="submitAnswer(${node.id})" class="btn-primary text-white px-5 py-2 rounded-lg font-semibold text-sm">
                        <i class="fas fa-save mr-1"></i>
                        답변 저장
                      </button>
                    </div>
                  </div>
                `}
              </div>
            </div>
          </div>
          
          <!-- 파생 질문들: 들여쓰기와 연결선 -->
          ${hasChildren ? `
            <div class="ml-8 mt-3 pl-6 border-l-4 border-indigo-200">
              <div class="mb-2">
                <span class="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                  <i class="fas fa-level-down-alt mr-1"></i>
                  파생 질문 (${childrenCount}개)
                </span>
              </div>
              ${renderQuestionTree(node.children, level + 1, requirementId)}
            </div>
          ` : ''}
        ` : `
          <!-- 파생 질문: 심플한 카드 -->
          <div class="bg-white border border-toss-gray-200 rounded-lg p-4 hover:border-toss-blue transition-colors mb-3">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-7 h-7 rounded-full ${hasAnswer ? 'bg-green-400' : 'bg-purple-400'} text-white flex items-center justify-center text-sm">
                ${hasAnswer ? '<i class="fas fa-check"></i>' : '?'}
              </div>
              <div class="flex-1">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <p class="font-semibold text-sm text-toss-gray-800 flex items-center gap-2">
                    <i class="fas fa-arrow-turn-up text-purple-400 text-xs"></i>
                    ${escapeHtml(node.question_text)}
                  </p>
                  <button onclick="deleteQuestion(${node.id}, '${escapeHtml(node.question_text).replace(/'/g, "\\'")}'); event.stopPropagation();" 
                          class="btn-icon text-red-500 hover:bg-red-50 flex-shrink-0" 
                          title="질문 삭제">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
                
                ${hasAnswer ? `
                  <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div class="flex items-center justify-between mb-1">
                      <p class="text-xs font-semibold text-green-700 flex items-center gap-1">
                        <i class="fas fa-check-circle"></i>
                        답변
                      </p>
                      <button onclick="editAnswer(${node.answer.id}, '${escapeHtml(node.answer.answer_text).replace(/'/g, "\\'")}', ${node.id}); event.stopPropagation();" 
                              class="text-toss-blue hover:text-blue-700 text-xs font-semibold flex items-center gap-1"
                              title="답변 수정">
                        <i class="fas fa-edit"></i>
                        수정
                      </button>
                    </div>
                    <p class="text-sm text-toss-gray-800 leading-relaxed whitespace-pre-wrap">${escapeHtml(node.answer.answer_text)}</p>
                  </div>
                ` : `
                  <textarea id="answer-${node.id}" rows="2" class="w-full bg-toss-gray-50 border border-toss-gray-200 rounded-lg px-3 py-2 text-sm text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors mb-2" placeholder="답변을 입력해주세요..."></textarea>
                  <div class="flex justify-end">
                    <button onclick="submitAnswer(${node.id})" class="btn-primary text-white px-4 py-1.5 rounded-lg font-semibold text-xs">
                      답변 저장
                    </button>
                  </div>
                `}
              </div>
            </div>
            
            ${hasChildren ? `
              <div class="mt-3 ml-10 space-y-2">
                ${renderQuestionTree(node.children, level + 1, requirementId)}
              </div>
            ` : ''}
          </div>
        `}
      </div>
    `;
  }).join('');
}

async function submitAnswer(questionId) {
  const answerInput = document.getElementById(`answer-${questionId}`);
  const answerText = answerInput.value.trim();
  
  if (!answerText) {
    showToast('답변을 입력해주세요', 'error');
    return;
  }
  
  // 버튼 찾기 및 로딩 상태 설정
  const submitButton = document.querySelector(`button[onclick="submitAnswer(${questionId})"]`);
  const originalButtonHTML = submitButton ? submitButton.innerHTML : '';
  
  console.log('[Performance] Submit answer start');
  const startTime = performance.now();
  
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
  }
  
  try {
    // 낙관적 UI 업데이트: 입력창 비활성화
    answerInput.disabled = true;
    
    const response = await axios.post(`${API_BASE}/questions/${questionId}/answer`, {
      question_id: questionId,
      answer_text: answerText,
    });
    
    const apiTime = performance.now() - startTime;
    console.log(`[Performance] Answer saved in ${apiTime.toFixed(0)}ms`);
    
    showToast('답변이 저장되었습니다! ✨', 'success');
    
    // 파생 질문은 백그라운드에서 생성되므로 즉시 알림
    if (response.data.message) {
      console.log('[Background] 파생 질문 생성 중...');
      showToast('파생 질문은 백그라운드에서 생성됩니다', 'info');
    }
    
    closeAllModals();
    
    // 🚀 최적화: 해당 요건만 업데이트 (전체 재렌더링 방지)
    if (response.data.requirement_id) {
      await updateSingleRequirement(response.data.requirement_id);
    }
    
    const totalTime = performance.now() - startTime;
    console.log(`[Performance] Total submit time: ${totalTime.toFixed(0)}ms`);
    
  } catch (error) {
    console.error('Failed to submit answer:', error);
    showToast('답변 저장에 실패했습니다', 'error');
    
    // 에러 시 입력창 다시 활성화
    answerInput.disabled = false;
    
    // 버튼 복구
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonHTML;
    }
  }
}

// 🚀 개별 요건만 업데이트하는 함수 (성능 최적화)
async function updateSingleRequirement(requirementId) {
  try {
    console.log('[Performance] Updating single requirement:', requirementId);
    
    // 해당 요건의 최신 데이터만 가져오기
    const response = await axios.get(`${API_BASE}/requirements/${requirementId}`);
    const updatedRequirement = response.data;
    
    // requirements 배열에서 해당 요건 업데이트
    const index = requirements.findIndex(r => r.id === requirementId);
    if (index !== -1) {
      requirements[index] = updatedRequirement;
    }
    
    // 해당 요건 카드만 찾아서 교체
    const cardElement = document.querySelector(`[data-requirement-id="${requirementId}"]`);
    if (cardElement) {
      const newCardHTML = renderRequirementCard(updatedRequirement);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newCardHTML;
      cardElement.replaceWith(tempDiv.firstElementChild);
      console.log('[Performance] Single card updated successfully');
    } else {
      // 카드를 찾지 못하면 전체 렌더링 (fallback)
      console.log('[Performance] Card not found, fallback to full render');
      await renderRequirements();
    }
  } catch (error) {
    console.error('[Performance] Failed to update single requirement, fallback to full render:', error);
    await renderRequirements();
  }
}


// ============ 정보구조도 & PRD 탭 ============

function renderTree() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="flex flex-col items-center justify-center py-20">
      <div class="w-20 h-20 bg-toss-gray-100 rounded-full flex items-center justify-center mb-6">
        <i class="fas fa-sitemap text-4xl text-toss-gray-400"></i>
      </div>
      <h2 class="text-2xl font-bold text-toss-gray-900 mb-3">곧 만나요!</h2>
      <p class="text-toss-gray-600 text-center max-w-md">
        트리 시각화 기능은 개발 중이에요<br>
        요건 관리 탭에서 요건들을 확인할 수 있어요
      </p>
    </div>
  `;
}

async function renderPRD() {
  const content = document.getElementById('content');
  
  // currentProject 유효성 검증
  if (!currentProject || !currentProject.id) {
    content.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px;">
        <div style="width: 80px; height: 80px; background: var(--red-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <i class="fas fa-exclamation-triangle" style="font-size: 36px; color: var(--red-500);"></i>
        </div>
        <h2 class="text-title2" style="color: var(--grey-900); margin-bottom: 12px;">프로젝트를 선택해주세요</h2>
        <p class="text-body2" style="color: var(--grey-600); text-align: center; max-width: 400px;">
          좌측 사이드바에서 프로젝트를 선택하거나 새로 생성하세요
        </p>
      </div>
    `;
    return;
  }
  
  try {
    const response = await axios.get(`${API_BASE}/projects/${currentProject.id}/prd`);
    const prd = response.data;
    
    // 메타데이터 파싱
    let metadata = null;
    try {
      metadata = prd.metadata ? JSON.parse(prd.metadata) : null;
    } catch (e) {
      console.error('Failed to parse metadata:', e);
    }
    
    // PRD 내용 렌더링
    content.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
          <div>
            <h1 class="text-title1" style="color: var(--grey-900); margin-bottom: 8px;">
              <i class="fas fa-file-alt" style="color: var(--blue-500); margin-right: 10px;"></i>
              PRD 문서
            </h1>
            <p class="text-body3" style="color: var(--grey-600);">
              <i class="far fa-clock" style="margin-right: 4px;"></i>
              최종 작성: ${formatKSTDateTime(prd.created_at)}
            </p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="regeneratePRD()" class="btn-weak-primary btn-medium">
              <i class="fas fa-sync-alt" style="margin-right: 6px; font-size: 13px;"></i>
              PRD 다시 생성
            </button>
            <button onclick="downloadPRD()" class="btn-primary btn-medium">
              <i class="fas fa-download" style="margin-right: 6px; font-size: 13px;"></i>
              다운로드
            </button>
          </div>
        </div>
        
        ${metadata && metadata.requirements ? `
          <div style="background: var(--blue-50); border: 1px solid var(--blue-200); border-radius: var(--radius-12); padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <i class="fas fa-info-circle" style="color: var(--blue-500);"></i>
              <p class="text-body2" style="font-weight: 600; color: var(--blue-600);">검증 모드 활성화</p>
            </div>
            <p class="text-body3" style="color: var(--grey-700);">
              PRD의 정책 문장을 클릭하면 해당 내용이 어떤 요건의 어떤 질문/답변에서 도출되었는지 확인할 수 있어요
            </p>
          </div>
        ` : ''}
        
        <!-- 노션 스타일 PRD 문서 -->
        <div class="prd-document" id="prd-content">
          ${marked.parse(prd.content)}
        </div>
      </div>
    `;
    
    // 메타데이터가 있으면 인터랙티브 기능 추가
    if (metadata && metadata.requirements) {
      enhancePRDWithMetadata(metadata);
    }
  } catch (error) {
    content.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px;">
        <div style="width: 80px; height: 80px; background: var(--grey-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <i class="fas fa-file-alt" style="font-size: 36px; color: var(--grey-400);"></i>
        </div>
        <h2 class="text-title2" style="color: var(--grey-900); margin-bottom: 12px;">아직 PRD가 없어요</h2>
        <p class="text-body2" style="color: var(--grey-600); text-align: center; max-width: 400px; margin-bottom: 24px;">
          요건을 모두 확인한 후 PRD를 생성해보세요
        </p>
        <button onclick="generatePRD()" class="btn-primary btn-large">
          <i class="fas fa-file-alt" style="margin-right: 6px; font-size: 14px;"></i>
          PRD 생성하기
        </button>
      </div>
    `;
  }
}

// PRD에 메타데이터 기반 인터랙티브 기능 추가
function enhancePRDWithMetadata(metadata) {
  const prdContent = document.getElementById('prd-content');
  if (!prdContent) return;
  
  const requirements = metadata.requirements || [];
  
  console.log('🔍 PRD 인터랙티브 기능 추가 시작');
  console.log('📊 전체 요건 수:', requirements.length);
  console.log('📝 요건 목록:', requirements.map(r => r.title));
  
  // 1. 헤딩(h2, h3)에 요건 정보 배지 추가
  const headings = prdContent.querySelectorAll('h2, h3');
  console.log('📍 찾은 헤딩 수:', headings.length);
  
  headings.forEach((heading) => {
    const headingText = heading.textContent.trim();
    
    // 요건 제목과 매칭 (더 유연한 매칭)
    const matchedReq = requirements.find(req => {
      const reqTitle = req.title.toLowerCase().trim();
      const headingLower = headingText.toLowerCase();
      return headingLower.includes(reqTitle) || reqTitle.includes(headingLower.substring(0, 20));
    });
    
    if (matchedReq && matchedReq.questions && matchedReq.questions.length > 0) {
      console.log('✅ 매칭된 요건:', matchedReq.title, '(질문 수:', matchedReq.questions.length + ')');
      
      // 요건 정보 배지 추가
      const badge = document.createElement('button');
      badge.className = 'inline-flex items-center gap-1 ml-2 badge-small badge-fill-purple';
      badge.style.cssText = 'vertical-align: middle;';
      badge.innerHTML = `
        <i class="fas fa-question-circle"></i>
        ${matchedReq.questions.length}개 질문
      `;
      badge.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showRequirementDetails(matchedReq);
      };
      heading.appendChild(badge);
    }
  });
  
  // 2. 모든 리스트 아이템(li)을 클릭 가능하게 만들기
  const listItems = prdContent.querySelectorAll('ul li, ol li');
  console.log('📋 찾은 리스트 항목 수:', listItems.length);
  
  listItems.forEach((li) => {
    // 해당 리스트 항목이 속한 섹션의 요건 찾기
    let requirementTitle = '';
    let currentElement = li.parentElement; // ul 또는 ol부터 시작
    let depth = 0;
    const maxDepth = 10; // 무한 루프 방지
    
    // 부모를 거슬러 올라가며 가장 가까운 h2/h3 찾기
    while (currentElement && currentElement !== prdContent && depth < maxDepth) {
      depth++;
      
      // 이전 형제 중 h2/h3 찾기
      let sibling = currentElement.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === 'H2' || sibling.tagName === 'H3') {
          requirementTitle = sibling.textContent.trim();
          break;
        }
        sibling = sibling.previousElementSibling;
      }
      
      if (requirementTitle) break;
      
      // 한 단계 위로
      currentElement = currentElement.parentElement;
    }
    
    if (requirementTitle) {
      const matchedReq = requirements.find(req => {
        const reqTitle = req.title.toLowerCase().trim();
        const titleLower = requirementTitle.toLowerCase();
        return titleLower.includes(reqTitle) || reqTitle.includes(titleLower.substring(0, 20));
      });
      
      if (matchedReq && matchedReq.questions && matchedReq.questions.length > 0) {
        // 리스트 항목을 클릭 가능하게 스타일링
        li.style.cssText = `
          cursor: pointer;
          padding: 8px 12px;
          margin: 4px 0;
          border-radius: 8px;
          transition: all 0.2s ease;
          position: relative;
        `;
        
        // 호버 효과
        li.addEventListener('mouseenter', () => {
          li.style.backgroundColor = 'var(--blue-50)';
          li.style.paddingLeft = '16px';
        });
        
        li.addEventListener('mouseleave', () => {
          li.style.backgroundColor = 'transparent';
          li.style.paddingLeft = '12px';
        });
        
        // 클릭 이벤트
        li.addEventListener('click', (e) => {
          e.stopPropagation();
          showRequirementDetails(matchedReq);
        });
        
        // 작은 아이콘 추가
        const icon = document.createElement('i');
        icon.className = 'fas fa-info-circle';
        icon.style.cssText = `
          margin-left: 6px;
          font-size: 11px;
          color: var(--blue-500);
          opacity: 0.6;
        `;
        li.appendChild(icon);
      }
    }
  });
  
  // 3. 표의 각 행을 클릭 가능하게 만들기
  const tables = prdContent.querySelectorAll('table');
  console.log('📊 찾은 테이블 수:', tables.length);
  
  tables.forEach((table) => {
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach((row, rowIdx) => {
      // 해당 행이 속한 섹션의 요건 찾기
      let currentElement = table;
      let requirementTitle = '';
      
      while (currentElement && currentElement !== prdContent) {
        currentElement = currentElement.previousElementSibling;
        if (currentElement && (currentElement.tagName === 'H2' || currentElement.tagName === 'H3')) {
          requirementTitle = currentElement.textContent.trim();
          break;
        }
      }
      
      if (requirementTitle) {
        const matchedReq = requirements.find(req => {
          const reqTitle = req.title.toLowerCase().trim();
          const titleLower = requirementTitle.toLowerCase();
          return titleLower.includes(reqTitle) || reqTitle.includes(titleLower.substring(0, 20));
        });
        
        if (matchedReq && matchedReq.questions && matchedReq.questions.length > 0) {
          // 행을 클릭 가능하게 스타일링
          row.style.cssText = `
            cursor: pointer;
            transition: background-color 0.2s ease;
          `;
          
          // 호버 효과
          row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = 'var(--blue-50)';
          });
          
          row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = 'transparent';
          });
          
          // 클릭 이벤트
          row.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('📌 표 행 클릭됨:', {
              rowIdx,
              requirementTitle: matchedReq.title,
              questionsCount: matchedReq.questions.length,
              matchedQuestion: matchedReq.questions[rowIdx]
            });
            // 특정 질문이 매칭되면 해당 질문 강조, 아니면 전체 요건 표시
            if (matchedReq.questions[rowIdx]) {
              showRequirementDetails(matchedReq, rowIdx);
            } else {
              showRequirementDetails(matchedReq);
            }
          });
        }
      }
    });
  });
  
  console.log('✅ PRD 인터랙티브 기능 추가 완료');
}

// 근거 상세 정보 모달 (특정 질문 강조)
function showEvidenceDetails(requirement, questionIdx) {
  const question = requirement.questions[questionIdx];
  
  if (!question) return;
  
  showModal({
    title: `📌 근거 확인`,
    size: 'medium',
    content: `
      <div class="space-y-4">
        <div class="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <i class="fas fa-clipboard-check text-blue-600 text-lg"></i>
            <h3 class="font-bold text-blue-900">요건: ${escapeHtml(requirement.title)}</h3>
          </div>
          ${requirement.description ? `
            <p class="text-sm text-toss-gray-700 mb-3">${escapeHtml(requirement.description)}</p>
          ` : ''}
        </div>
        
        <div class="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <i class="fas fa-question-circle text-yellow-700"></i>
            <p class="font-bold text-yellow-900">질문</p>
          </div>
          <p class="text-sm text-toss-gray-900 leading-relaxed">${escapeHtml(question.question)}</p>
        </div>
        
        <div class="bg-green-50 border-2 border-green-300 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <i class="fas fa-check-circle text-green-700"></i>
            <p class="font-bold text-green-900">답변</p>
          </div>
          <p class="text-sm text-toss-gray-900 leading-relaxed whitespace-pre-wrap">${escapeHtml(question.answer)}</p>
        </div>
        
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <p class="text-xs text-purple-800 flex items-center gap-2">
            <i class="fas fa-lightbulb"></i>
            위 질문과 답변을 바탕으로 PRD의 정책이 도출되었습니다
          </p>
        </div>
      </div>
    `
  });
}

// 요건 상세 정보 모달 표시
function showRequirementDetails(requirement, highlightRowIdx = null) {
  const questionsHtml = requirement.questions.map((q, idx) => `
    <div class="mb-4 p-4 rounded-lg ${highlightRowIdx === idx ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-toss-gray-50'}">
      <div class="flex items-start gap-2 mb-2">
        <span class="text-xs font-bold text-toss-blue">${highlightRowIdx === idx ? '👉 ' : ''}Q${idx + 1}</span>
        <p class="text-sm font-semibold text-toss-gray-900 flex-1">${escapeHtml(q.question)}</p>
      </div>
      <div class="flex items-start gap-2 ml-6">
        <span class="text-xs font-bold text-green-600">A${idx + 1}</span>
        <p class="text-sm text-toss-gray-800 flex-1">${escapeHtml(q.answer)}</p>
      </div>
    </div>
  `).join('');
  
  showModal({
    title: `📋 ${requirement.title}`,
    size: 'large',
    content: `
      <div class="space-y-4">
        ${requirement.description ? `
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm text-toss-gray-800">${escapeHtml(requirement.description)}</p>
          </div>
        ` : ''}
        
        <div>
          <h3 class="font-bold text-toss-gray-900 mb-3 flex items-center gap-2">
            <i class="fas fa-clipboard-question text-toss-blue"></i>
            확인 질문 및 답변 (${requirement.questions.length}개)
          </h3>
          ${questionsHtml}
        </div>
        
        ${highlightRowIdx !== null ? `
          <div class="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            <p class="text-xs text-yellow-800 flex items-center gap-2">
              <i class="fas fa-lightbulb"></i>
              위 ${highlightRowIdx + 1}번째 질문/답변이 PRD의 해당 정책 항목의 근거입니다
            </p>
          </div>
        ` : ''}
      </div>
    `
  });
}

// PRD 재생성 함수
async function regeneratePRD() {
  showModal({
    title: 'PRD 다시 생성',
    content: `
      <div class="text-center py-6">
        <div class="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-sync-alt text-2xl text-purple-600"></i>
        </div>
        <p class="text-toss-gray-900 font-semibold mb-2">PRD 문서를 다시 생성하시겠어요?</p>
        <p class="text-sm text-toss-gray-600 mb-4">
          최신 요건과 답변을 반영하여 PRD를 새로 만들어드려요<br>
          이전 문서는 덮어쓰여집니다
        </p>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p class="text-xs text-yellow-800 flex items-center justify-center gap-2">
            <i class="fas fa-info-circle"></i>
            변경된 요건이나 답변이 있다면 다시 생성을 권장해요
          </p>
        </div>
      </div>
    `,
    confirmText: 'PRD 다시 생성',
    cancelText: '취소',
    onConfirm: async () => {
      // 진행 상태 바 표시
      showPRDProgressBar();
      
      try {
        await axios.post(`${API_BASE}/projects/${currentProject.id}/generate-prd`, {}, {
          timeout: 360000 // 360초 (6분)
        });
        
        // 진행 바를 100%로 업데이트 후 제거
        const progressFill = document.getElementById('prd-progress-fill');
        if (progressFill) {
          progressFill.style.width = '100%';
        }
        
        setTimeout(() => {
          hidePRDProgressBar();
          showToast('PRD가 재생성되었습니다!', 'success');
          renderPRD(); // 화면 갱신
        }, 500);
        
        return true;
      } catch (error) {
        console.error('Failed to regenerate PRD:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        hidePRDProgressBar();
        const errorMsg = error.response?.data?.message || error.message || '알 수 없는 오류';
        showToast(`PRD 재생성에 실패했습니다: ${errorMsg}`, 'error');
        return false;
      }
    }
  });
}

async function generatePRD() {
  // PRD 생성 전 검증: 답변된 요건이 있는지 확인
  try {
    const response = await axios.get(`${API_BASE}/projects/${currentProject.id}/requirements`);
    const reqs = response.data || [];
    
    if (reqs.length === 0) {
      showToast('요건이 없어서 PRD를 생성할 수 없어요. AI 분석을 먼저 실행하세요', 'error');
      return;
    }
    
    // 답변된 요건 확인 (적어도 한 개의 질문에 답변이 있는지)
    const hasAnsweredQuestions = reqs.some(req => 
      req.question_stats && req.question_stats.answered > 0
    );
    
    if (!hasAnsweredQuestions) {
      showModal({
        title: 'PRD 생성',
        content: `
          <div class="text-center py-6">
            <div class="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-exclamation-triangle text-2xl text-yellow-600"></i>
            </div>
            <p class="text-toss-gray-900 font-semibold mb-2">답변된 질문이 없어요</p>
            <p class="text-sm text-toss-gray-600 mb-3">적어도 한 개 이상의 질문에 답변하면<br>PRD를 생성할 수 있어요</p>
          </div>
        `,
        confirmText: '요건 확인하기',
        onConfirm: async () => {
          switchTab('requirements');
          return true;
        }
      });
      return;
    }
  } catch (error) {
    console.error('Failed to check requirements:', error);
    showToast('요건을 확인하는데 실패했습니다', 'error');
    return;
  }
  
  showModal({
    title: 'PRD 생성',
    content: `
      <div class="text-center py-6">
        <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-file-alt text-2xl text-green-600"></i>
        </div>
        <p class="text-toss-gray-900 font-semibold mb-2">PRD 문서를 생성하시겠어요?</p>
        <p class="text-sm text-toss-gray-600 mb-3">모든 요건과 답변을 종합하여 완전한 기획 문서를 만들어드려요</p>
        <p class="text-xs text-orange-600">
          <i class="fas fa-clock mr-1"></i>
          약 4-5분 소요됩니다. 완료될 때까지 기다려주세요.
        </p>
      </div>
    `,
    confirmText: 'PRD 생성',
    onConfirm: async () => {
      // 모달 닫기
      closeAllModals();
      
      // 진행 상태 바 표시
      showPRDProgressBar();
      
      try {
        const response = await axios.post(`${API_BASE}/projects/${currentProject.id}/generate-prd`, {}, {
          timeout: 360000 // 360초 (6분) - 8개 요건 = 3배치 = 약 5분
        });
        
        // 진행 바를 100%로 업데이트 후 제거
        const progressFill = document.getElementById('prd-progress-fill');
        if (progressFill) {
          progressFill.style.width = '100%';
        }
        
        setTimeout(() => {
          hidePRDProgressBar();
          
          // 성공 메시지
          showToast('PRD가 생성되었습니다! 🎉', 'success');
          
          // 프로젝트 정보 새로고침
          selectProject(currentProject.id);
          
          // PRD 탭으로 전환
          switchTab('prd');
        }, 500);
        
        return true;
      } catch (error) {
        console.error('Failed to generate PRD:', error);
        hidePRDProgressBar();
        const errorMessage = error.response?.data?.message || error.message;
        showToast(`PRD 생성에 실패했습니다: ${errorMessage}`, 'error');
        return false;
      }
    }
  });
}

function downloadPRD() {
  showToast('다운로드 기능은 곧 추가될 예정이에요', 'info');
}

// ============ UI 유틸리티 ============

function showModal({ title, content, confirmText = '확인', cancelText = '취소', onConfirm = null, confirmClass = 'btn-primary', size = 'default' }) {
  const modalContainer = document.getElementById('modal-container');
  const modalId = 'modal-' + Date.now();
  
  const sizeClasses = {
    default: 'max-w-2xl',
    large: 'max-w-4xl',
    small: 'max-w-md'
  };
  
  modalContainer.innerHTML += `
    <div id="${modalId}" class="fixed inset-0 modal-backdrop flex items-center justify-center z-50 animate-fade-in">
      <div class="bg-white rounded-3xl ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        <div class="p-6 border-b border-toss-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 class="text-2xl font-bold text-toss-gray-900">${title}</h2>
          <button onclick="closeModal('${modalId}')" class="w-8 h-8 rounded-full hover:bg-toss-gray-100 flex items-center justify-center text-toss-gray-600 transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-6">
          ${content}
        </div>
        ${onConfirm ? `
          <div class="p-6 border-t border-toss-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button onclick="closeModal('${modalId}')" class="px-6 py-3 rounded-xl bg-toss-gray-100 hover:bg-toss-gray-200 text-toss-gray-900 font-bold transition-colors">
              ${cancelText}
            </button>
            <button onclick="handleModalConfirm('${modalId}')" class="${confirmClass} text-white px-6 py-3 rounded-xl font-bold shadow-lg">
              ${confirmText}
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  if (onConfirm) {
    window[`modalConfirm_${modalId}`] = onConfirm;
  }
  
  return modalId;
}

async function handleModalConfirm(modalId) {
  console.log('[Modal] handleModalConfirm called for:', modalId);
  const confirmFn = window[`modalConfirm_${modalId}`];
  if (confirmFn) {
    console.log('[Modal] Executing confirm function...');
    const result = await confirmFn();
    console.log('[Modal] Confirm function returned:', result);
    if (result !== false) {
      console.log('[Modal] Closing modal...');
      closeModal(modalId);
    } else {
      console.log('[Modal] Keeping modal open (result was false)');
    }
  } else {
    console.warn('[Modal] No confirm function found for:', modalId);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.remove();
  }
  delete window[`modalConfirm_${modalId}`];
}

function closeAllModals() {
  const modalContainer = document.getElementById('modal-container');
  modalContainer.innerHTML = '';
}

// Modal ID로 닫기 (showModal 없이 생성된 모달용)
function closeModalById(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.remove();
  }
}

// 토스트 알림
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toastId = 'toast-' + Date.now();
  
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `toast ${type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '8px';
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle'
  };
  
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}" style="font-size: 16px;"></i>
    <span style="font-weight: 600; flex: 1;">${message}</span>
    <button onclick="hideToast('${toastId}')" class="btn-icon" style="width: 24px; height: 24px; background: transparent; color: inherit;">
      <i class="fas fa-times" style="font-size: 12px;"></i>
    </button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    hideToast(toastId);
  }, 4000);
  
  return toastId;
}

function showLoadingToast(message) {
  const container = document.getElementById('toast-container');
  const toastId = 'toast-' + Date.now();
  
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = 'toast';
  toast.style.background = 'var(--blue-500)';
  toast.style.color = 'white';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '8px';
  toast.innerHTML = `
    <i class="fas fa-spinner fa-spin" style="font-size: 16px;"></i>
    <span style="font-weight: 600; flex: 1;">${message}</span>
  `;
  
  container.appendChild(toast);
  
  return toastId;
}

// 🚀 PRD 생성 진행 상태 바 (하단 고정)
function showPRDProgressBar() {
  // 기존 진행 바가 있으면 제거
  const existing = document.getElementById('prd-progress-bar');
  if (existing) {
    existing.remove();
  }
  
  const progressBar = document.createElement('div');
  progressBar.id = 'prd-progress-bar';
  progressBar.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid var(--grey-200);
    padding: 20px 24px;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    animation: slideUp 0.3s ease-out;
  `;
  
  progressBar.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto;">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, var(--blue-50) 0%, var(--purple-50) 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i class="fas fa-file-alt" style="font-size: 20px; color: var(--blue-500); animation: pulse 2s ease-in-out infinite;"></i>
        </div>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <h3 class="text-body1" style="font-weight: 700; color: var(--grey-900); margin: 0;">PRD 문서 생성 중</h3>
            <span id="prd-elapsed-time" style="font-size: 14px; color: var(--grey-600); font-weight: 500;">0초</span>
          </div>
          <p class="text-caption" style="color: var(--grey-600); margin: 0;">
            AI가 요건과 답변을 종합하여 완전한 기획 문서를 작성하고 있습니다 (예상 소요: 약 4-5분)
          </p>
        </div>
        <button onclick="hidePRDProgressBar()" style="width: 32px; height: 32px; border-radius: 8px; background: var(--grey-100); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i class="fas fa-times" style="color: var(--grey-600); font-size: 14px;"></i>
        </button>
      </div>
      
      <div style="position: relative; width: 100%; height: 8px; background: var(--grey-100); border-radius: 4px; overflow: hidden;">
        <div id="prd-progress-fill" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: linear-gradient(90deg, var(--blue-500), var(--purple-500)); border-radius: 4px; transition: width 1s linear;"></div>
      </div>
    </div>
    
    <style>
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    </style>
  `;
  
  document.body.appendChild(progressBar);
  
  // 경과 시간 업데이트
  const startTime = Date.now();
  window.prdProgressTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const elapsedTimeEl = document.getElementById('prd-elapsed-time');
    if (elapsedTimeEl) {
      if (minutes > 0) {
        elapsedTimeEl.textContent = `${minutes}분 ${seconds}초`;
      } else {
        elapsedTimeEl.textContent = `${seconds}초`;
      }
    }
    
    // 진행률 업데이트 (최대 90%까지)
    const progressFill = document.getElementById('prd-progress-fill');
    if (progressFill) {
      const progress = Math.min(90, (elapsed / 360) * 100); // 360초 = 6분
      progressFill.style.width = `${progress}%`;
    }
  }, 1000);
}

function hidePRDProgressBar() {
  const progressBar = document.getElementById('prd-progress-bar');
  if (progressBar) {
    progressBar.style.animation = 'slideDown 0.3s ease-out';
    setTimeout(() => {
      progressBar.remove();
    }, 300);
  }
  
  // 타이머 정리
  if (window.prdProgressTimer) {
    clearInterval(window.prdProgressTimer);
    window.prdProgressTimer = null;
  }
}

// slideDown 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);


function hideToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    setTimeout(() => toast.remove(), 300);
  }
}

// ============ 헬퍼 함수 ============

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// 한국 시간(KST)으로 변환
function toKST(dateString) {
  const date = new Date(dateString);
  // UTC 시간에 9시간 추가
  return new Date(date.getTime() + (9 * 60 * 60 * 1000));
}

// 한국 시간으로 포맷팅
function formatKSTDateTime(dateString) {
  const kstDate = toKST(dateString);
  return kstDate.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatRelativeTime(dateString) {
  const date = toKST(dateString); // KST로 변환
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}


// ============ 요건 편집 및 삭제 ============

// 요건 편집
async function editRequirement(requirementId) {
  try {
    const response = await axios.get(`${API_BASE}/requirements/${requirementId}`);
    const requirement = response.data;
    
    showModal({
      title: '요건 편집',
      size: 'large',
      content: `
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-semibold text-toss-gray-900 mb-2">요건 제목 *</label>
            <input type="text" id="edit-req-title" value="${escapeHtml(requirement.title)}" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors">
          </div>
          <div>
            <label class="block text-sm font-semibold text-toss-gray-900 mb-2">설명</label>
            <textarea id="edit-req-description" rows="4" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors">${escapeHtml(requirement.description || '')}</textarea>
          </div>
          <div>
            <label class="block text-sm font-semibold text-toss-gray-900 mb-2">우선순위</label>
            <select id="edit-req-priority" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors">
              <option value="critical" ${requirement.priority === 'critical' ? 'selected' : ''}>Critical (긴급)</option>
              <option value="high" ${requirement.priority === 'high' ? 'selected' : ''}>High (높음)</option>
              <option value="medium" ${requirement.priority === 'medium' ? 'selected' : ''}>Medium (보통)</option>
              <option value="low" ${requirement.priority === 'low' ? 'selected' : ''}>Low (낮음)</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-toss-gray-900 mb-2">상태</label>
            <select id="edit-req-status" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors">
              <option value="pending" ${requirement.status === 'pending' ? 'selected' : ''}>대기</option>
              <option value="in_progress" ${requirement.status === 'in_progress' ? 'selected' : ''}>진행중</option>
              <option value="completed" ${requirement.status === 'completed' ? 'selected' : ''}>완료</option>
            </select>
          </div>
        </div>
      `,
      confirmText: '저장하기',
      onConfirm: async () => {
        const title = document.getElementById('edit-req-title').value.trim();
        const description = document.getElementById('edit-req-description').value.trim();
        const priority = document.getElementById('edit-req-priority').value;
        const status = document.getElementById('edit-req-status').value;
        
        if (!title) {
          showToast('요건 제목을 입력해주세요', 'error');
          return false;
        }
        
        try {
          await axios.put(`${API_BASE}/requirements/${requirementId}`, {
            title,
            description,
            priority,
            status,
          });
          
          await renderRequirements();
          showToast('요건이 수정되었습니다', 'success');
          return true;
        } catch (error) {
          console.error('Failed to update requirement:', error);
          showToast('요건 수정에 실패했습니다', 'error');
          return false;
        }
      }
    });
  } catch (error) {
    console.error('Failed to load requirement:', error);
    showToast('요건을 불러오는데 실패했습니다', 'error');
  }
}

// 요건 삭제
async function deleteRequirement(requirementId) {
  showModal({
    title: '요건 삭제',
    content: `
      <div class="text-center py-4">
        <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
        </div>
        <p class="text-toss-gray-900 font-semibold mb-2">요건을 삭제하시겠어요?</p>
        <p class="text-sm text-toss-gray-600">삭제한 요건은 복구할 수 없어요.</p>
      </div>
    `,
    confirmText: '삭제하기',
    cancelText: '취소',
    confirmClass: 'bg-red-500 hover:bg-red-600',
    onConfirm: async () => {
      try {
        await axios.delete(`${API_BASE}/requirements/${requirementId}`);
        await renderRequirements();
        showToast('요건이 삭제되었습니다', 'success');
        return true;
      } catch (error) {
        console.error('Failed to delete requirement:', error);
        showToast('요건 삭제에 실패했습니다', 'error');
        return false;
      }
    }
  });
}

// 파생 요건 자동 생성
async function generateDerivedRequirements(requirementId) {
  const loadingToast = showLoadingToast('답변을 분석하여 파생 요건을 생성하고 있어요...');
  
  try {
    const response = await axios.post(`${API_BASE}/requirements/${requirementId}/generate-derived`);
    
    hideToast(loadingToast);
    
    if (response.data.success) {
      const count = response.data.derived_count;
      
      if (count > 0) {
        await renderRequirements();
        showToast(`${count}개의 파생 요건이 생성되었습니다! 🎉`, 'success');
      } else {
        showToast('추가 파생 요건이 필요하지 않습니다', 'info');
      }
    } else {
      showToast(response.data.message || '파생 요건 생성에 실패했습니다', 'error');
    }
  } catch (error) {
    console.error('Failed to generate derived requirements:', error);
    hideToast(loadingToast);
    showToast('파생 요건 생성에 실패했습니다', 'error');
  }
}

// ============ 답변 수정 기능 ============
async function editAnswer(answerId, currentText, questionId, requirementId) {
  showModal({
    title: '답변 수정',
    size: 'medium',
    content: `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-toss-gray-900 mb-2">답변 내용</label>
          <textarea id="edit-answer-text" rows="6" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors">${escapeHtml(currentText)}</textarea>
        </div>
      </div>
    `,
    confirmText: '수정 완료',
    cancelText: '취소',
    onConfirm: async () => {
      const newText = document.getElementById('edit-answer-text').value.trim();
      
      if (!newText) {
        showToast('답변 내용을 입력해주세요', 'error');
        return false;
      }
      
      try {
        await axios.put(`${API_BASE}/answers/${answerId}`, {
          answer_text: newText
        });
        
        showToast('답변이 수정되었습니다', 'success');
        
        // 해당 요건 상세 다시 열기 (requirementId 사용)
        if (requirementId) {
          openRequirementDetails(requirementId);
        }
        
        return true;
      } catch (error) {
        console.error('Failed to update answer:', error);
        showToast('답변 수정에 실패했습니다', 'error');
        return false;
      }
    }
  });
}

// ============ 질문 삭제 기능 ============
async function deleteQuestion(questionId, questionText) {
  showModal({
    title: '질문 삭제',
    content: `
      <div class="space-y-4">
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div class="flex gap-3">
            <i class="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
            <div>
              <p class="text-sm font-semibold text-toss-gray-900 mb-2">이 질문을 삭제하시겠어요?</p>
              <p class="text-sm text-toss-gray-700 mb-3">"${escapeHtml(questionText)}"</p>
              <p class="text-xs text-toss-gray-600">관련된 답변도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    `,
    confirmText: '삭제하기',
    cancelText: '취소',
    onConfirm: async () => {
      try {
        await axios.delete(`${API_BASE}/questions/${questionId}`);
        
        showToast('질문이 삭제되었습니다', 'success');
        
        // 요건 목록 새로고침
        await renderRequirements();
        
        return true;
      } catch (error) {
        console.error('Failed to delete question:', error);
        showToast('질문 삭제에 실패했습니다', 'error');
        return false;
      }
    }
  });
}

// ============ 추가 요건 생성 기능 ============
async function generateAdditionalRequirements() {
  if (!currentProject) return;
  
  showModal({
    title: '추가 요건 생성',
    size: 'large',
    content: `
      <div id="category-selection-step">
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-sparkles text-2xl text-blue-600 animate-pulse"></i>
          </div>
          <p class="text-toss-gray-900 font-semibold mb-2">AI가 추가 요건 카테고리를 분석하고 있어요...</p>
          <p class="text-sm text-toss-gray-600">기존 요건을 검토하여 누락된 영역을 찾아드릴게요</p>
        </div>
      </div>
    `,
    confirmText: null, // 확인 버튼 숨김
    cancelText: '닫기'
  });
  
  try {
    // AI 카테고리 추천 요청
    const response = await axios.get(`${API_BASE}/projects/${currentProject.id}/suggest-categories`);
    const { categories } = response.data;
    
    if (!categories || categories.length === 0) {
      document.getElementById('category-selection-step').innerHTML = `
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-check-circle text-2xl text-green-600"></i>
          </div>
          <p class="text-toss-gray-900 font-semibold mb-2">현재 요건이 충분합니다</p>
          <p class="text-sm text-toss-gray-600">추가로 필요한 요건이 없어요</p>
        </div>
      `;
      return;
    }
    
    // 카테고리 선택 UI 표시
    document.getElementById('category-selection-step').innerHTML = `
      <div class="space-y-4">
        <div class="text-center mb-6">
          <p class="text-toss-gray-900 font-semibold mb-2">어떤 영역의 요건을 추가할까요?</p>
          <p class="text-sm text-toss-gray-600">AI가 분석한 추가 요건 카테고리를 선택하거나 직접 입력하세요</p>
        </div>
        
        <div class="space-y-3">
          ${categories.map((cat, idx) => `
            <button 
              onclick="selectCategory('${escapeHtml(cat)}')" 
              class="w-full text-left p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 rounded-xl transition-all group"
            >
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <i class="fas fa-plus text-sm"></i>
                </div>
                <div class="flex-1">
                  <p class="text-toss-gray-900 font-semibold mb-1">${escapeHtml(cat)}</p>
                </div>
                <i class="fas fa-arrow-right text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>
              </div>
            </button>
          `).join('')}
        </div>
        
        <div class="mt-6 pt-6 border-t border-toss-gray-200">
          <p class="text-sm text-toss-gray-700 font-semibold mb-3">💡 또는 직접 입력하기</p>
          <div class="flex gap-2">
            <input 
              type="text" 
              id="custom-category-input" 
              placeholder="예: 데이터 백업 및 복구 전략"
              class="flex-1 bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors"
              onkeypress="if(event.key==='Enter') selectCustomCategory()"
            >
            <button 
              onclick="selectCustomCategory()" 
              class="btn-primary text-white px-6 py-3 rounded-xl font-bold whitespace-nowrap"
            >
              추가
            </button>
          </div>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Failed to suggest categories:', error);
    document.getElementById('category-selection-step').innerHTML = `
      <div class="text-center py-8">
        <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
        </div>
        <p class="text-toss-gray-900 font-semibold mb-2">카테고리 추천에 실패했습니다</p>
        <p class="text-sm text-toss-gray-600">${error.response?.data?.message || error.message}</p>
        
        <div class="mt-6">
          <p class="text-sm text-toss-gray-700 font-semibold mb-3">직접 입력하여 진행할 수 있어요</p>
          <div class="flex gap-2">
            <input 
              type="text" 
              id="custom-category-input" 
              placeholder="추가하고 싶은 요건 카테고리를 입력하세요"
              class="flex-1 bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors"
              onkeypress="if(event.key==='Enter') selectCustomCategory()"
            >
            <button 
              onclick="selectCustomCategory()" 
              class="btn-primary text-white px-6 py-3 rounded-xl font-bold whitespace-nowrap"
            >
              추가
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

async function selectCategory(category) {
  console.log('[Category] Selected:', category);
  
  // 로딩 상태로 변경
  document.getElementById('category-selection-step').innerHTML = `
    <div class="text-center py-8">
      <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-cog text-2xl text-green-600 animate-spin"></i>
      </div>
      <p class="text-toss-gray-900 font-semibold mb-2">"${escapeHtml(category)}" 요건을 생성하고 있어요...</p>
      <p class="text-sm text-toss-gray-600">잠시만 기다려주세요</p>
    </div>
  `;
  
  try {
    const response = await axios.post(`${API_BASE}/projects/${currentProject.id}/generate-by-category`, {
      category: category
    });
    
    if (response.data.success) {
      const count = response.data.added_count;
      
      closeAllModals();
      await renderRequirements();
      showToast(`${count}개의 새로운 요건이 추가되었습니다! 🎉`, 'success');
    } else {
      throw new Error(response.data.message || '요건 생성에 실패했습니다');
    }
  } catch (error) {
    console.error('Failed to generate requirements:', error);
    const errorMessage = error.response?.data?.message || error.message;
    
    document.getElementById('category-selection-step').innerHTML = `
      <div class="text-center py-8">
        <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
        </div>
        <p class="text-toss-gray-900 font-semibold mb-2">요건 생성에 실패했습니다</p>
        <p class="text-sm text-toss-gray-600">${errorMessage}</p>
        <button 
          onclick="closeAllModals()" 
          class="mt-4 btn-primary text-white px-6 py-3 rounded-xl font-bold"
        >
          닫기
        </button>
      </div>
    `;
  }
}

function selectCustomCategory() {
  const input = document.getElementById('custom-category-input');
  const category = input.value.trim();
  
  if (!category) {
    showToast('카테고리를 입력해주세요', 'error');
    return;
  }
  
  selectCategory(category);
}

// 모바일 사이드바 토글
function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebar && overlay) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  }
}

