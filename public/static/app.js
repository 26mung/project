// 전역 상태
let currentProject = null;
let currentTab = 'overview';
let projects = [];
let requirements = [];

// API 기본 URL
const API_BASE = window.location.origin + '/api';

// ============ 초기화 ============
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
});

// ============ 프로젝트 관리 ============

async function loadProjects() {
  try {
    const response = await axios.get(`${API_BASE}/projects`);
    projects = response.data;
    renderProjectList();
  } catch (error) {
    console.error('Failed to load projects:', error);
    showNotification('프로젝트 목록을 불러오는데 실패했습니다.', 'error');
  }
}

function renderProjectList() {
  const container = document.getElementById('project-list');
  if (!projects.length) {
    container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">프로젝트가 없습니다</p>';
    return;
  }
  
  container.innerHTML = projects.map(project => `
    <div class="p-3 rounded hover:bg-dark-bg cursor-pointer transition ${currentProject?.id === project.id ? 'bg-dark-bg border-l-2 border-blue-500' : ''}"
         onclick="selectProject(${project.id})">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="font-medium text-sm">${escapeHtml(project.title)}</h3>
          <p class="text-xs text-gray-400 mt-1">${getStatusBadge(project.status)}</p>
        </div>
        <button onclick="deleteProject(${project.id}, event)" class="text-gray-500 hover:text-red-500 text-xs ml-2">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function getStatusBadge(status) {
  const badges = {
    draft: '<span class="bg-gray-600 text-white px-2 py-0.5 rounded text-xs">초안</span>',
    analyzing: '<span class="bg-yellow-600 text-white px-2 py-0.5 rounded text-xs">분석중</span>',
    in_progress: '<span class="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">진행중</span>',
    completed: '<span class="bg-green-600 text-white px-2 py-0.5 rounded text-xs">완료</span>',
  };
  return badges[status] || badges.draft;
}

async function selectProject(projectId) {
  try {
    const response = await axios.get(`${API_BASE}/projects/${projectId}`);
    currentProject = response.data;
    renderProjectList();
    switchTab(currentTab);
  } catch (error) {
    console.error('Failed to load project:', error);
    showNotification('프로젝트를 불러오는데 실패했습니다.', 'error');
  }
}

function createNewProject() {
  showModal('새 프로젝트 만들기', `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">프로젝트 제목</label>
        <input type="text" id="project-title" class="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-white" placeholder="예: AI 기반 이메일 아시스턴트">
      </div>
      <div>
        <label class="block text-sm font-medium mb-2">간단한 설명</label>
        <textarea id="project-description" rows="3" class="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-white" placeholder="프로젝트에 대한 간단한 설명"></textarea>
      </div>
      <div>
        <label class="block text-sm font-medium mb-2">상위 기획안 (선택사항)</label>
        <textarea id="project-input" rows="6" class="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-white" placeholder="AI가 분석할 상위 기획안을 입력하세요..."></textarea>
      </div>
    </div>
  `, async () => {
    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-description').value.trim();
    const inputContent = document.getElementById('project-input').value.trim();
    
    if (!title) {
      showNotification('프로젝트 제목을 입력해주세요.', 'error');
      return false;
    }
    
    try {
      const response = await axios.post(`${API_BASE}/projects`, {
        title,
        description,
        input_content: inputContent,
      });
      
      currentProject = response.data;
      await loadProjects();
      
      // 기획안이 있으면 바로 분석
      if (inputContent) {
        analyzeProject();
      } else {
        switchTab('overview');
      }
      
      showNotification('프로젝트가 생성되었습니다.', 'success');
      return true;
    } catch (error) {
      console.error('Failed to create project:', error);
      showNotification('프로젝트 생성에 실패했습니다.', 'error');
      return false;
    }
  });
}

async function deleteProject(projectId, event) {
  event.stopPropagation();
  
  if (!confirm('정말 이 프로젝트를 삭제하시겠습니까?')) {
    return;
  }
  
  try {
    await axios.delete(`${API_BASE}/projects/${projectId}`);
    if (currentProject?.id === projectId) {
      currentProject = null;
    }
    await loadProjects();
    renderContent();
    showNotification('프로젝트가 삭제되었습니다.', 'success');
  } catch (error) {
    console.error('Failed to delete project:', error);
    showNotification('프로젝트 삭제에 실패했습니다.', 'error');
  }
}

async function analyzeProject() {
  if (!currentProject) return;
  
  const inputContent = currentProject.input_content;
  if (!inputContent) {
    showNotification('분석할 기획안이 없습니다.', 'error');
    return;
  }
  
  const loadingModal = showLoadingModal('AI가 기획안을 분석하고 있습니다...');
  
  try {
    await axios.post(`${API_BASE}/projects/${currentProject.id}/analyze`, {
      project_id: currentProject.id,
      input_content: inputContent,
    });
    
    closeModal(loadingModal);
    await selectProject(currentProject.id);
    switchTab('requirements');
    showNotification('분석이 완료되었습니다!', 'success');
  } catch (error) {
    console.error('Failed to analyze project:', error);
    closeModal(loadingModal);
    showNotification('분석에 실패했습니다: ' + (error.response?.data?.message || error.message), 'error');
  }
}

// ============ 탭 전환 ============

function switchTab(tab) {
  currentTab = tab;
  
  // 탭 버튼 스타일 업데이트
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('border-blue-500', 'text-blue-500');
    btn.classList.add('text-gray-400', 'border-transparent');
  });
  
  const activeTab = document.getElementById(`tab-${tab}`);
  if (activeTab) {
    activeTab.classList.remove('text-gray-400', 'border-transparent');
    activeTab.classList.add('border-blue-500', 'text-blue-500');
  }
  
  renderContent();
}

function renderContent() {
  const content = document.getElementById('content');
  
  if (!currentProject) {
    content.innerHTML = `
      <div class="text-center py-20">
        <i class="fas fa-folder-open text-6xl text-gray-600 mb-4"></i>
        <h2 class="text-2xl font-bold text-gray-400 mb-2">환영합니다!</h2>
        <p class="text-gray-500">새 프로젝트를 만들거나 기존 프로젝트를 선택하세요.</p>
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

// ============ 개요 탭 ============

function renderOverview() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="max-w-4xl">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">${escapeHtml(currentProject.title)}</h1>
        <div class="flex items-center gap-4 text-sm text-gray-400">
          <span><i class="fas fa-calendar mr-2"></i>${formatDate(currentProject.created_at)}</span>
          <span>${getStatusBadge(currentProject.status)}</span>
        </div>
      </div>
      
      ${currentProject.description ? `
        <div class="bg-dark-card p-6 rounded-lg mb-6">
          <h2 class="text-lg font-semibold mb-3"><i class="fas fa-info-circle mr-2 text-blue-500"></i>설명</h2>
          <p class="text-gray-300">${escapeHtml(currentProject.description)}</p>
        </div>
      ` : ''}
      
      ${currentProject.input_content ? `
        <div class="bg-dark-card p-6 rounded-lg mb-6">
          <h2 class="text-lg font-semibold mb-3"><i class="fas fa-file-alt mr-2 text-yellow-500"></i>상위 기획안</h2>
          <div class="text-gray-300 whitespace-pre-wrap">${escapeHtml(currentProject.input_content)}</div>
        </div>
      ` : ''}
      
      <div class="flex gap-4">
        ${currentProject.status === 'draft' && currentProject.input_content ? `
          <button onclick="analyzeProject()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded flex items-center gap-2">
            <i class="fas fa-magic"></i>
            AI 분석 시작하기
          </button>
        ` : ''}
        
        ${currentProject.status === 'in_progress' ? `
          <button onclick="switchTab('requirements')" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded flex items-center gap-2">
            <i class="fas fa-list-check"></i>
            요건 확인하기
          </button>
        ` : ''}
        
        ${currentProject.status === 'completed' ? `
          <button onclick="switchTab('prd')" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded flex items-center gap-2">
            <i class="fas fa-file-alt"></i>
            PRD 보기
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// ============ 요건 관리 탭 ============

async function renderRequirements() {
  const content = document.getElementById('content');
  
  try {
    const response = await axios.get(`${API_BASE}/projects/${currentProject.id}/requirements`);
    requirements = response.data;
    
    if (!requirements.length) {
      content.innerHTML = `
        <div class="text-center py-20">
          <i class="fas fa-clipboard-list text-6xl text-gray-600 mb-4"></i>
          <h2 class="text-xl font-bold text-gray-400 mb-2">요건이 없습니다</h2>
          <p class="text-gray-500">AI 분석을 실행하여 요건을 생성하세요.</p>
          ${currentProject.input_content ? `
            <button onclick="analyzeProject()" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
              AI 분석 시작하기
            </button>
          ` : ''}
        </div>
      `;
      return;
    }
    
    // 계층 구조로 표시
    const topLevelRequirements = requirements.filter(r => !r.parent_id);
    
    content.innerHTML = `
      <div class="max-w-6xl">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">요건 관리</h1>
          <button onclick="generatePRD()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2">
            <i class="fas fa-file-alt"></i>
            PRD 생성
          </button>
        </div>
        
        <div class="space-y-4">
          ${topLevelRequirements.map(req => renderRequirementCard(req)).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Failed to load requirements:', error);
    content.innerHTML = '<p class="text-red-500">요건을 불러오는데 실패했습니다.</p>';
  }
}

function renderRequirementCard(requirement) {
  const children = requirements.filter(r => r.parent_id === requirement.id);
  const priorityColors = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-gray-500',
  };
  
  return `
    <div class="bg-dark-card rounded-lg p-6 border border-dark-border">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <h3 class="text-lg font-semibold">${escapeHtml(requirement.title)}</h3>
            <span class="text-xs px-2 py-1 rounded bg-dark-bg ${priorityColors[requirement.priority]}">${requirement.priority.toUpperCase()}</span>
            <span class="text-xs px-2 py-1 rounded ${requirement.status === 'completed' ? 'bg-green-600' : requirement.status === 'in_progress' ? 'bg-blue-600' : 'bg-gray-600'}">${requirement.status}</span>
          </div>
          ${requirement.description ? `<p class="text-gray-400 text-sm">${escapeHtml(requirement.description)}</p>` : ''}
        </div>
        <button onclick="openRequirementDetails(${requirement.id})" class="text-blue-500 hover:text-blue-400 text-sm flex items-center gap-1">
          <i class="fas fa-edit"></i>
          상세
        </button>
      </div>
      
      ${children.length > 0 ? `
        <div class="ml-6 mt-4 space-y-3 border-l-2 border-dark-border pl-4">
          ${children.map(child => `
            <div class="bg-dark-bg rounded p-3">
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">${escapeHtml(child.title)}</span>
                <button onclick="openRequirementDetails(${child.id})" class="text-blue-500 hover:text-blue-400 text-xs">
                  <i class="fas fa-edit"></i>
                </button>
              </div>
            </div>
          `).join('')}
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
    
    showModal(`요건 상세: ${requirement.title}`, `
      <div class="space-y-6">
        <div>
          <p class="text-gray-300">${escapeHtml(requirement.description || '')}</p>
        </div>
        
        ${questions.length > 0 ? `
          <div>
            <h3 class="font-semibold mb-4 text-lg">확인 질문</h3>
            <div class="space-y-4">
              ${questions.map((q, index) => `
                <div class="bg-dark-bg rounded p-4">
                  <p class="font-medium mb-2">${index + 1}. ${escapeHtml(q.question_text)}</p>
                  ${q.answer ? `
                    <div class="bg-dark-card p-3 rounded mt-2">
                      <p class="text-sm text-gray-400 mb-1">답변:</p>
                      <p class="text-green-400">${escapeHtml(q.answer.answer_text)}</p>
                    </div>
                  ` : `
                    <textarea id="answer-${q.id}" rows="2" class="w-full bg-dark-card border border-dark-border rounded px-3 py-2 text-white mt-2" placeholder="답변을 입력하세요..."></textarea>
                    <button onclick="submitAnswer(${q.id})" class="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-sm">
                      답변 저장
                    </button>
                  `}
                </div>
              `).join('')}
            </div>
          </div>
        ` : '<p class="text-gray-400">질문이 없습니다.</p>'}
      </div>
    `, null, '닫기');
  } catch (error) {
    console.error('Failed to load requirement details:', error);
    showNotification('요건 상세 정보를 불러오는데 실패했습니다.', 'error');
  }
}

async function submitAnswer(questionId) {
  const answerText = document.getElementById(`answer-${questionId}`).value.trim();
  
  if (!answerText) {
    showNotification('답변을 입력해주세요.', 'error');
    return;
  }
  
  try {
    await axios.post(`${API_BASE}/questions/${questionId}/answer`, {
      question_id: questionId,
      answer_text: answerText,
    });
    
    showNotification('답변이 저장되었습니다.', 'success');
    closeAllModals();
    renderRequirements();
  } catch (error) {
    console.error('Failed to submit answer:', error);
    showNotification('답변 저장에 실패했습니다.', 'error');
  }
}

// ============ 정보구조도 탭 ============

function renderTree() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="max-w-6xl">
      <h1 class="text-2xl font-bold mb-6">정보구조도</h1>
      <div class="bg-dark-card rounded-lg p-8 text-center">
        <i class="fas fa-sitemap text-6xl text-gray-600 mb-4"></i>
        <p class="text-gray-400">트리 시각화 기능은 개발 중입니다.</p>
        <p class="text-sm text-gray-500 mt-2">요건 관리 탭에서 요건들을 확인할 수 있습니다.</p>
      </div>
    </div>
  `;
}

// ============ PRD 탭 ============

async function renderPRD() {
  const content = document.getElementById('content');
  
  try {
    const response = await axios.get(`${API_BASE}/projects/${currentProject.id}/prd`);
    const prd = response.data;
    
    content.innerHTML = `
      <div class="max-w-4xl">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">PRD 문서</h1>
          <button onclick="downloadPRD()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2">
            <i class="fas fa-download"></i>
            다운로드
          </button>
        </div>
        
        <div class="bg-dark-card rounded-lg p-8 prose prose-invert max-w-none">
          ${marked.parse(prd.content)}
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = `
      <div class="text-center py-20">
        <i class="fas fa-file-alt text-6xl text-gray-600 mb-4"></i>
        <h2 class="text-xl font-bold text-gray-400 mb-2">PRD 문서가 없습니다</h2>
        <p class="text-gray-500 mb-4">요건을 모두 확인한 후 PRD를 생성하세요.</p>
        <button onclick="generatePRD()" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded">
          PRD 생성하기
        </button>
      </div>
    `;
  }
}

async function generatePRD() {
  if (!confirm('PRD 문서를 생성하시겠습니까? 이 작업은 몇 분 정도 소요될 수 있습니다.')) {
    return;
  }
  
  const loadingModal = showLoadingModal('PRD 문서를 생성하고 있습니다...');
  
  try {
    await axios.post(`${API_BASE}/projects/${currentProject.id}/generate-prd`);
    
    closeModal(loadingModal);
    await selectProject(currentProject.id);
    switchTab('prd');
    showNotification('PRD가 생성되었습니다!', 'success');
  } catch (error) {
    console.error('Failed to generate PRD:', error);
    closeModal(loadingModal);
    showNotification('PRD 생성에 실패했습니다: ' + (error.response?.data?.message || error.message), 'error');
  }
}

function downloadPRD() {
  // PRD 다운로드 기능
  showNotification('다운로드 기능은 개발 중입니다.', 'info');
}

// ============ UI 유틸리티 ============

function showModal(title, content, onConfirm = null, confirmText = '확인', cancelText = '취소') {
  const modalContainer = document.getElementById('modal-container');
  const modalId = 'modal-' + Date.now();
  
  modalContainer.innerHTML += `
    <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-dark-card rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-dark-border flex justify-between items-center">
          <h2 class="text-xl font-bold">${title}</h2>
          <button onclick="closeModal('${modalId}')" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-6">
          ${content}
        </div>
        ${onConfirm ? `
          <div class="p-6 border-t border-dark-border flex justify-end gap-3">
            <button onclick="closeModal('${modalId}')" class="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white">
              ${cancelText}
            </button>
            <button onclick="handleModalConfirm('${modalId}')" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">
              ${confirmText}
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // onConfirm 함수를 전역에 저장
  if (onConfirm) {
    window[`modalConfirm_${modalId}`] = onConfirm;
  }
  
  return modalId;
}

async function handleModalConfirm(modalId) {
  const confirmFn = window[`modalConfirm_${modalId}`];
  if (confirmFn) {
    const result = await confirmFn();
    if (result !== false) {
      closeModal(modalId);
    }
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

function showLoadingModal(message) {
  const modalId = 'loading-modal-' + Date.now();
  const modalContainer = document.getElementById('modal-container');
  
  modalContainer.innerHTML += `
    <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-dark-card rounded-lg p-8 text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p class="text-lg">${message}</p>
      </div>
    </div>
  `;
  
  return modalId;
}

function showNotification(message, type = 'info') {
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-600',
  };
  
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in`;
  notification.innerHTML = `
    <div class="flex items-center gap-3">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ============ 헬퍼 함수 ============

function escapeHtml(text) {
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
