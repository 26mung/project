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
  initTabStyles();
});

function initTabStyles() {
  const tabs = document.querySelectorAll('.tab-button');
  tabs.forEach(tab => {
    tab.classList.add('text-toss-gray-600', 'border-b-2', 'border-transparent');
  });
  
  const activeTab = document.getElementById('tab-overview');
  if (activeTab) {
    activeTab.classList.remove('text-toss-gray-600', 'border-transparent');
    activeTab.classList.add('text-toss-blue', 'border-toss-blue');
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
      <div class="text-center py-8">
        <p class="text-sm text-toss-gray-500">아직 프로젝트가 없어요</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = projects.map(project => `
    <div class="project-item rounded-xl p-4 cursor-pointer ${currentProject?.id === project.id ? 'active' : ''}"
         onclick="selectProject(${project.id})">
      <div class="flex items-start justify-between mb-2">
        <h3 class="font-semibold text-sm text-toss-gray-900 flex-1 pr-2">${escapeHtml(project.title)}</h3>
        <button onclick="deleteProject(${project.id}, event)" class="text-toss-gray-400 hover:text-red-500 text-xs">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="flex items-center gap-2">
        ${getStatusBadge(project.status)}
        <span class="text-xs text-toss-gray-500">${formatRelativeTime(project.updated_at)}</span>
      </div>
    </div>
  `).join('');
}

function getStatusBadge(status) {
  const badges = {
    draft: '<span class="status-badge bg-toss-gray-100 text-toss-gray-700">준비중</span>',
    analyzing: '<span class="status-badge bg-blue-50 text-toss-blue"><i class="fas fa-spinner fa-spin mr-1"></i>분석중</span>',
    in_progress: '<span class="status-badge bg-blue-50 text-toss-blue">진행중</span>',
    completed: '<span class="status-badge bg-green-50 text-green-600">완료</span>',
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
    showToast('프로젝트를 불러오는데 실패했습니다', 'error');
  }
}

function createNewProject() {
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
        const response = await axios.post(`${API_BASE}/projects`, {
          title,
          description,
          input_content: inputContent,
        });
        
        currentProject = response.data;
        await loadProjects();
        
        // 프로젝트 생성 후 Overview로 이동 (자동 평가 제거)
        switchTab('overview');
        showToast('프로젝트가 생성되었습니다! 개요에서 기획안을 평가해보세요', 'success');
        
        return true;
      } catch (error) {
        console.error('Failed to create project:', error);
        showToast('프로젝트 생성에 실패했습니다', 'error');
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
  
  const loadingToast = showLoadingToast('기획안을 평가하고 있어요...');
  
  try {
    const response = await axios.post(`${API_BASE}/projects/${currentProject.id}/evaluate`);
    const evaluation = response.data;
    
    hideToast(loadingToast);
    
    // 평가 결과 표시
    showModal({
      title: `기획안 평가 결과`,
      size: 'large',
      content: `
        <div class="space-y-6">
          <!-- 완성도 점수 -->
          <div class="bg-gradient-to-r from-toss-blue to-blue-500 rounded-2xl p-6 text-white">
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-sm opacity-90 mb-1">완성도 점수</p>
                <p class="text-4xl font-bold">${evaluation.completeness_score}<span class="text-2xl">/100</span></p>
              </div>
              <div class="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
                <i class="fas ${evaluation.completeness_score >= 80 ? 'fa-check-circle' : evaluation.completeness_score >= 60 ? 'fa-info-circle' : 'fa-exclamation-circle'} text-4xl"></i>
              </div>
            </div>
            <div class="h-2 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-white rounded-full transition-all duration-500" style="width: ${evaluation.completeness_score}%"></div>
            </div>
          </div>
          
          <!-- 프로젝트 성격 -->
          <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div class="flex items-center gap-3">
              <i class="fas fa-tag text-toss-blue text-xl"></i>
              <div>
                <p class="text-xs text-toss-gray-600 mb-1">프로젝트 성격</p>
                <p class="text-sm font-semibold text-toss-gray-900">${evaluation.project_type}</p>
              </div>
            </div>
          </div>
          
          ${evaluation.missing_items && evaluation.missing_items.length > 0 ? `
          <!-- 부족한 항목 -->
          <div>
            <h4 class="text-sm font-semibold text-toss-gray-900 mb-3">⚠️ 보완하면 좋을 항목</h4>
            <ul class="space-y-2">
              ${evaluation.missing_items.map(item => `
                <li class="flex items-start gap-2 text-sm text-toss-gray-700">
                  <i class="fas fa-circle text-xs text-orange-500 mt-1.5"></i>
                  <span>${escapeHtml(item)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${evaluation.suggestions && evaluation.suggestions.length > 0 ? `
          <!-- 개선 제안 -->
          <div>
            <h4 class="text-sm font-semibold text-toss-gray-900 mb-3">💡 개선 제안</h4>
            <ul class="space-y-2">
              ${evaluation.suggestions.map(suggestion => `
                <li class="flex items-start gap-2 text-sm text-toss-gray-700">
                  <i class="fas fa-check text-xs text-toss-blue mt-1.5"></i>
                  <span>${escapeHtml(suggestion)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          <!-- 진행 가능 여부 -->
          <div class="bg-${evaluation.is_ready ? 'green' : 'yellow'}-50 border border-${evaluation.is_ready ? 'green' : 'yellow'}-100 rounded-xl p-4">
            <div class="flex items-center gap-3">
              <i class="fas ${evaluation.is_ready ? 'fa-check-circle' : 'fa-exclamation-triangle'} text-${evaluation.is_ready ? 'green' : 'yellow'}-600 text-xl"></i>
              <div>
                <p class="text-sm font-semibold text-toss-gray-900">
                  ${evaluation.is_ready ? 'AI 분석을 진행할 수 있어요!' : '기획안을 보완하면 더 정확한 분석이 가능해요'}
                </p>
                <p class="text-xs text-toss-gray-600 mt-1">
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
    showToast('기획안 평가에 실패했습니다', 'error');
  }
}

async function analyzeProject() {
  if (!currentProject) return;
  
  const inputContent = currentProject.input_content;
  if (!inputContent) {
    showToast('분석할 기획안이 없습니다', 'error');
    return;
  }
  
  const loadingToast = showLoadingToast('AI가 기획안을 분석하고 있어요...');
  
  try {
    await axios.post(`${API_BASE}/projects/${currentProject.id}/analyze`, {
      project_id: currentProject.id,
      input_content: inputContent,
    });
    
    hideToast(loadingToast);
    await selectProject(currentProject.id);
    switchTab('requirements');
    showToast('분석이 완료되었습니다! 요건을 확인해보세요', 'success');
  } catch (error) {
    console.error('Failed to analyze project:', error);
    hideToast(loadingToast);
    const errorMessage = error.response?.data?.message || error.message;
    showToast(`분석에 실패했습니다: ${errorMessage}`, 'error');
  }
}

// ============ 탭 전환 ============

function switchTab(tab) {
  currentTab = tab;
  
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('text-toss-blue', 'border-toss-blue');
    btn.classList.add('text-toss-gray-600', 'border-transparent');
  });
  
  const activeTab = document.getElementById(`tab-${tab}`);
  if (activeTab) {
    activeTab.classList.remove('text-toss-gray-600', 'border-transparent');
    activeTab.classList.add('text-toss-blue', 'border-toss-blue');
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
  
  // 상태별 주요 액션 버튼 결정
  let primaryAction = '';
  let secondaryActions = '';
  
  if (currentProject.status === 'draft') {
    if (currentProject.input_content) {
      // Draft + 기획안 있음: AI 분석이 주요 액션
      primaryAction = `
        <button onclick="analyzeProject()" class="btn-large bg-toss-blue hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
          <i class="fas fa-magic"></i>
          AI 분석 시작하기
        </button>
      `;
      secondaryActions = `
        <button onclick="evaluateProject()" class="btn-medium bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all">
          <i class="fas fa-chart-line"></i>
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
          <button onclick="editProjectOverview()" class="btn-large bg-toss-blue hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-bold inline-flex items-center gap-2 transition-all">
            <i class="fas fa-edit"></i>
            기획안 작성하기
          </button>
        </div>
      `;
    }
  } else if (currentProject.status === 'in_progress') {
    // In Progress: 요건 확인이 주요 액션
    primaryAction = `
      <button onclick="switchTab('requirements')" class="btn-large bg-toss-blue hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
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
        <div class="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-5">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-chart-line text-white"></i>
            </div>
            <div class="flex-1">
              <h4 class="text-base font-bold text-toss-gray-900 mb-1">최근 평가 결과</h4>
              <p class="text-xs text-toss-gray-600">아래 내용을 참고하여 기획안을 보완해보세요</p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-purple-600">${evaluation.completeness_score}<span class="text-sm">/100</span></div>
              <div class="text-[10px] text-toss-gray-500 mt-0.5">완성도</div>
            </div>
          </div>
          
          ${evaluation.missing_items && evaluation.missing_items.length > 0 ? `
          <div class="bg-white/70 rounded-xl p-4 mb-3">
            <p class="text-xs font-bold text-orange-600 mb-2 flex items-center gap-1.5">
              <i class="fas fa-exclamation-circle"></i>
              보완하면 좋을 항목
            </p>
            <ul class="space-y-1.5">
              ${evaluation.missing_items.map(item => `
                <li class="text-xs text-toss-gray-700 flex items-start gap-2">
                  <i class="fas fa-circle text-[6px] text-orange-500 mt-1.5"></i>
                  <span>${escapeHtml(item)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${evaluation.suggestions && evaluation.suggestions.length > 0 ? `
          <div class="bg-white/70 rounded-xl p-4">
            <p class="text-xs font-bold text-toss-blue mb-2 flex items-center gap-1.5">
              <i class="fas fa-lightbulb"></i>
              개선 제안
            </p>
            <ul class="space-y-1.5">
              ${evaluation.suggestions.map(suggestion => `
                <li class="text-xs text-toss-gray-700 flex items-start gap-2">
                  <i class="fas fa-check text-[6px] text-toss-blue mt-1.5"></i>
                  <span>${escapeHtml(suggestion)}</span>
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
        await axios.put(`${API_BASE}/projects/${currentProject.id}`, {
          title,
          description,
          input_content: inputContent,
          status: currentProject.status,
        });
        
        currentProject = { ...currentProject, title, description, input_content: inputContent };
        await loadProjects();
        renderContent();
        showToast('프로젝트가 수정되었습니다', 'success');
        
        return true;
      } catch (error) {
        console.error('Failed to update project:', error);
        showToast('프로젝트 수정에 실패했습니다', 'error');
        return false;
      }
    }
  });
}

// ============ 요건 관리 탭 ============

async function renderRequirements() {
  const content = document.getElementById('content');
  
  try {
    const response = await axios.get(`${API_BASE}/projects/${currentProject.id}/requirements`);
    requirements = response.data;
    
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
            <button onclick="analyzeProject()" class="btn-primary text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg">
              <i class="fas fa-magic"></i>
              AI 분석 시작하기
            </button>
          ` : ''}
        </div>
      `;
      return;
    }
    
    const topLevelRequirements = requirements.filter(r => !r.parent_id);
    
    content.innerHTML = `
      <div>
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="text-3xl font-bold text-toss-gray-900 mb-2">요건 관리</h1>
            <p class="text-sm text-toss-gray-600">각 요건의 질문에 답변해주세요</p>
          </div>
          <div class="flex gap-3">
            <button onclick="generateAdditionalRequirements()" 
                    class="btn-medium bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                    title="기존 요건과 중복되지 않는 새로운 요건을 AI가 제안합니다">
              <i class="fas fa-plus-circle"></i>
              추가 요건 생성
            </button>
            <button onclick="generatePRD()" 
                    class="btn-medium bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
              <i class="fas fa-file-alt"></i>
              PRD 생성하기
            </button>
          </div>
        </div>
        
        <div class="space-y-4">
          ${topLevelRequirements.map(req => renderRequirementCard(req)).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Failed to load requirements:', error);
    content.innerHTML = `
      <div class="card p-8 text-center">
        <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
        <p class="text-toss-gray-700">요건을 불러오는데 실패했습니다</p>
      </div>
    `;
  }
}

function renderRequirementCard(requirement) {
  const children = requirements.filter(r => r.parent_id === requirement.id);
  const priorityStyles = {
    critical: { bg: 'bg-red-50', text: 'text-red-600', icon: 'fa-fire' },
    high: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'fa-arrow-up' },
    medium: { bg: 'bg-blue-50', text: 'text-toss-blue', icon: 'fa-equals' },
    low: { bg: 'bg-toss-gray-100', text: 'text-toss-gray-600', icon: 'fa-arrow-down' },
  };
  
  const style = priorityStyles[requirement.priority] || priorityStyles.medium;
  
  return `
    <div class="card p-6">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-3">
            <h3 class="text-lg font-bold text-toss-gray-900">${escapeHtml(requirement.title)}</h3>
            <span class="status-badge ${style.bg} ${style.text}">
              <i class="fas ${style.icon} mr-1"></i>${requirement.priority.toUpperCase()}
            </span>
            <span class="status-badge ${requirement.status === 'completed' ? 'bg-green-50 text-green-600' : requirement.status === 'in_progress' ? 'bg-blue-50 text-toss-blue' : 'bg-toss-gray-100 text-toss-gray-600'}">
              ${requirement.status === 'completed' ? '완료' : requirement.status === 'in_progress' ? '진행중' : '대기'}
            </span>
          </div>
          ${requirement.description ? `<p class="text-sm text-toss-gray-600 leading-relaxed">${escapeHtml(requirement.description)}</p>` : ''}
        </div>
        <div class="flex items-center gap-2 ml-4">
          <button onclick="editRequirement(${requirement.id})" class="btn-icon text-toss-gray-400 hover:text-toss-blue" title="편집">
            <i class="fas fa-edit text-sm"></i>
          </button>
          <button onclick="deleteRequirement(${requirement.id})" class="btn-icon text-toss-gray-400 hover:text-red-500" title="삭제">
            <i class="fas fa-trash text-sm"></i>
          </button>
          <button onclick="openRequirementDetails(${requirement.id})" class="btn-small text-toss-blue hover:text-blue-600 ml-2">
            <span>상세보기</span>
            <i class="fas fa-chevron-right text-xs ml-1"></i>
          </button>
        </div>
      </div>
      
      ${children.length > 0 ? `
        <div class="mt-4 pl-4 border-l-2 border-toss-gray-200 space-y-3">
          ${children.map(child => `
            <div class="bg-toss-gray-50 rounded-xl p-4">
              <div class="flex items-center justify-between">
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
                ${renderQuestionTree(questionTree)}
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
function renderQuestionTree(nodes, level = 0) {
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
              ${renderQuestionTree(node.children, level + 1)}
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
                ${renderQuestionTree(node.children, level + 1)}
              </div>
            ` : ''}
          </div>
        `}
      </div>
    `;
  }).join('');
}

async function submitAnswer(questionId) {
  const answerText = document.getElementById(`answer-${questionId}`).value.trim();
  
  if (!answerText) {
    showToast('답변을 입력해주세요', 'error');
    return;
  }
  
  try {
    const response = await axios.post(`${API_BASE}/questions/${questionId}/answer`, {
      question_id: questionId,
      answer_text: answerText,
    });
    
    showToast('답변이 저장되었습니다', 'success');
    
    // 파생 질문이 생성되었는지 확인
    const followUpCount = response.data.follow_up_count || 0;
    if (followUpCount > 0) {
      showToast(`${followUpCount}개의 파생 질문이 생성되었습니다`, 'info');
    }
    
    closeAllModals();
    renderRequirements();
  } catch (error) {
    console.error('Failed to submit answer:', error);
    showToast('답변 저장에 실패했습니다', 'error');
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
    
    content.innerHTML = `
      <div>
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="text-3xl font-bold text-toss-gray-900 mb-2">
              <i class="fas fa-file-alt text-toss-blue mr-2"></i>
              PRD 문서
            </h1>
            <p class="text-sm text-toss-gray-600">
              <i class="far fa-clock mr-1"></i>
              최종 작성: ${new Date(prd.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div class="flex gap-3">
            <button onclick="regeneratePRD()" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
              <i class="fas fa-sync-alt"></i>
              PRD 다시 생성
            </button>
            <button onclick="downloadPRD()" class="bg-toss-blue hover:bg-toss-blue-dark text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
              <i class="fas fa-download"></i>
              다운로드
            </button>
          </div>
        </div>
        
        ${metadata && metadata.requirements ? `
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div class="flex items-center gap-2 mb-2">
              <i class="fas fa-info-circle text-toss-blue"></i>
              <p class="text-sm font-semibold text-toss-blue">검증 모드 활성화</p>
            </div>
            <p class="text-xs text-toss-gray-700">
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
      <div class="flex flex-col items-center justify-center py-20">
        <div class="w-20 h-20 bg-toss-gray-100 rounded-full flex items-center justify-center mb-6">
          <i class="fas fa-file-alt text-4xl text-toss-gray-400"></i>
        </div>
        <h2 class="text-2xl font-bold text-toss-gray-900 mb-3">아직 PRD가 없어요</h2>
        <p class="text-toss-gray-600 text-center max-w-md mb-6">
          요건을 모두 확인한 후 PRD를 생성해보세요
        </p>
        <button onclick="generatePRD()" class="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
          <i class="fas fa-file-alt"></i>
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
  
  // 4번 섹션(요건별 상세 정책) 아래의 h2, h3 헤딩 찾기
  const headings = prdContent.querySelectorAll('h2, h3');
  const requirements = metadata.requirements || [];
  
  // 각 요건에 대한 정보 카드 추가
  headings.forEach((heading, idx) => {
    const headingText = heading.textContent.trim();
    
    // 요건 제목과 매칭
    const matchedReq = requirements.find(req => 
      headingText.includes(req.title) || req.title.includes(headingText)
    );
    
    if (matchedReq && matchedReq.questions && matchedReq.questions.length > 0) {
      // 요건 정보 뱃지 추가
      const badge = document.createElement('button');
      badge.className = 'inline-flex items-center gap-1 ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200 transition-all';
      badge.innerHTML = `
        <i class="fas fa-question-circle"></i>
        ${matchedReq.questions.length}개 질문
      `;
      badge.onclick = (e) => {
        e.preventDefault();
        showRequirementDetails(matchedReq);
      };
      heading.appendChild(badge);
    }
  });
  
  // 표의 각 셀에 근거 버튼 추가
  const tables = prdContent.querySelectorAll('table');
  tables.forEach((table) => {
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach((row, rowIdx) => {
      const cells = row.querySelectorAll('td');
      
      // 3번째 컬럼이 "근거" 컬럼이라고 가정
      if (cells.length >= 3) {
        const evidenceCell = cells[2]; // 근거 컬럼
        const originalText = evidenceCell.textContent.trim();
        
        if (originalText) {
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
          
          const matchedReq = requirements.find(req => 
            requirementTitle.includes(req.title) || req.title.includes(requirementTitle)
          );
          
          if (matchedReq && matchedReq.questions && matchedReq.questions[rowIdx]) {
            // 근거 셀에 인터랙티브 버튼 추가
            evidenceCell.innerHTML = `
              <div class="flex items-center gap-2">
                <span class="flex-1">${escapeHtml(originalText)}</span>
                <button 
                  class="evidence-btn flex-shrink-0 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-all"
                  data-requirement='${JSON.stringify(matchedReq).replace(/'/g, "&apos;")}'
                  data-question-idx="${rowIdx}"
                  title="원본 질문/답변 보기"
                >
                  <i class="fas fa-info-circle mr-1"></i>
                  원본 보기
                </button>
              </div>
            `;
          }
        }
      }
    });
  });
  
  // 근거 버튼 클릭 이벤트 등록
  prdContent.querySelectorAll('.evidence-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const requirement = JSON.parse(btn.getAttribute('data-requirement'));
      const questionIdx = parseInt(btn.getAttribute('data-question-idx'));
      showEvidenceDetails(requirement, questionIdx);
    });
  });
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
      const loadingToast = showLoadingToast('PRD 문서를 생성하고 있어요...');
      
      try {
        await axios.post(`${API_BASE}/projects/${currentProject.id}/generate-prd`);
        
        hideToast(loadingToast);
        showToast('PRD가 재생성되었습니다!', 'success');
        renderPRD(); // 화면 갱신
        return true;
      } catch (error) {
        console.error('Failed to regenerate PRD:', error);
        hideToast(loadingToast);
        showToast('PRD 재생성에 실패했습니다', 'error');
        return false;
      }
    }
  });
}

async function generatePRD() {
  showModal({
    title: 'PRD 생성',
    content: `
      <div class="text-center py-6">
        <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-file-alt text-2xl text-green-600"></i>
        </div>
        <p class="text-toss-gray-900 font-semibold mb-2">PRD 문서를 생성하시겠어요?</p>
        <p class="text-sm text-toss-gray-600">모든 요건과 답변을 종합하여 완전한 기획 문서를 만들어드려요</p>
      </div>
    `,
    confirmText: 'PRD 생성하기',
    onConfirm: async () => {
      const loadingToast = showLoadingToast('PRD 문서를 생성하고 있어요...');
      
      try {
        await axios.post(`${API_BASE}/projects/${currentProject.id}/generate-prd`);
        
        hideToast(loadingToast);
        await selectProject(currentProject.id);
        switchTab('prd');
        showToast('PRD가 생성되었습니다!', 'success');
        return true;
      } catch (error) {
        console.error('Failed to generate PRD:', error);
        hideToast(loadingToast);
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

// 토스트 알림
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toastId = 'toast-' + Date.now();
  
  const styles = {
    success: { bg: 'bg-green-600', icon: 'fa-check-circle' },
    error: { bg: 'bg-red-500', icon: 'fa-exclamation-circle' },
    info: { bg: 'bg-toss-blue', icon: 'fa-info-circle' },
    warning: { bg: 'bg-orange-500', icon: 'fa-exclamation-triangle' },
  };
  
  const style = styles[type] || styles.info;
  
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `${style.bg} text-white px-6 py-4 rounded-2xl shadow-2xl animate-slide-up flex items-center gap-3 min-w-[300px]`;
  toast.innerHTML = `
    <i class="fas ${style.icon} text-xl"></i>
    <span class="font-semibold flex-1">${message}</span>
    <button onclick="hideToast('${toastId}')" class="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center">
      <i class="fas fa-times text-sm"></i>
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
  toast.className = 'bg-toss-blue text-white px-6 py-4 rounded-2xl shadow-2xl animate-slide-up flex items-center gap-3 min-w-[300px]';
  toast.innerHTML = `
    <i class="fas fa-spinner fa-spin text-xl"></i>
    <span class="font-semibold flex-1">${message}</span>
  `;
  
  container.appendChild(toast);
  
  return toastId;
}

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

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
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
async function editAnswer(answerId, currentText, questionId) {
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
        
        // 해당 요건 상세 다시 열기
        openRequirementDetails(questionId);
        
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
  
  const loadingToast = showLoadingToast('기존 요건을 분석하고 추가 요건을 찾고 있어요...');
  
  try {
    const response = await axios.post(`${API_BASE}/projects/${currentProject.id}/generate-additional-requirements`);
    
    hideToast(loadingToast);
    
    if (response.data.success) {
      const count = response.data.added_count;
      
      if (count > 0) {
        await renderRequirements();
        showToast(`${count}개의 새로운 요건이 추가되었습니다! 🎉`, 'success');
      } else {
        showToast('기존 요건으로 충분합니다. 추가 요건이 필요 없어요', 'info');
      }
    } else {
      showToast(response.data.message || '추가 요건 생성에 실패했습니다', 'error');
    }
  } catch (error) {
    console.error('Failed to generate additional requirements:', error);
    hideToast(loadingToast);
    showToast('추가 요건 생성에 실패했습니다', 'error');
  }
}
