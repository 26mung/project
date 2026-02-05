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
        
        if (inputContent) {
          showToast('프로젝트가 생성되었습니다! 기획안을 평가합니다', 'success');
          // 먼저 기획안 평가 실행
          setTimeout(() => evaluateProject(), 500);
        } else {
          switchTab('overview');
          showToast('프로젝트가 생성되었습니다', 'success');
        }
        
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
          editProjectOverview();
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
  content.innerHTML = `
    <div class="max-w-4xl">
      <div class="mb-8">
        <div class="flex items-start justify-between mb-3">
          <h1 class="text-4xl font-bold text-toss-gray-900 flex-1">${escapeHtml(currentProject.title)}</h1>
          <button onclick="editProjectOverview()" class="text-toss-gray-500 hover:text-toss-blue transition-colors ml-4">
            <i class="fas fa-edit text-xl"></i>
          </button>
        </div>
        <div class="flex items-center gap-3 text-sm text-toss-gray-600">
          <span><i class="far fa-calendar mr-1"></i>${formatDate(currentProject.created_at)}</span>
          ${getStatusBadge(currentProject.status)}
        </div>
      </div>
      
      ${currentProject.description ? `
        <div class="card p-6 mb-6">
          <h2 class="text-lg font-bold text-toss-gray-900 mb-3 flex items-center gap-2">
            <i class="fas fa-align-left text-toss-blue"></i>
            프로젝트 설명
          </h2>
          <p class="text-toss-gray-700 leading-relaxed">${escapeHtml(currentProject.description)}</p>
        </div>
      ` : ''}
      
      ${currentProject.input_content ? `
        <div class="card p-6 mb-6">
          <h2 class="text-lg font-bold text-toss-gray-900 mb-3 flex items-center gap-2">
            <i class="fas fa-file-alt text-toss-blue"></i>
            상위 기획안
          </h2>
          <div class="text-toss-gray-700 whitespace-pre-wrap leading-relaxed">${escapeHtml(currentProject.input_content)}</div>
        </div>
      ` : ''}
      
      <div class="flex gap-3 flex-wrap">
        ${currentProject.status === 'draft' && currentProject.input_content ? `
          <button onclick="evaluateProject()" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
            <i class="fas fa-chart-line"></i>
            기획안 평가하기
          </button>
          <button onclick="analyzeProject()" class="btn-primary text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg">
            <i class="fas fa-magic"></i>
            AI 분석 시작하기
          </button>
        ` : ''}
        
        ${currentProject.status === 'in_progress' ? `
          <button onclick="switchTab('requirements')" class="btn-primary text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg">
            <i class="fas fa-list-check"></i>
            요건 확인하기
          </button>
        ` : ''}
        
        ${currentProject.status === 'completed' ? `
          <button onclick="switchTab('prd')" class="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
            <i class="fas fa-file-alt"></i>
            PRD 문서 보기
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// 프로젝트 개요 편집
function editProjectOverview() {
  if (!currentProject) return;
  
  showModal({
    title: '프로젝트 개요 편집',
    size: 'large',
    content: `
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-semibold text-toss-gray-900 mb-2">프로젝트 이름 *</label>
          <input type="text" id="edit-project-title" value="${escapeHtml(currentProject.title)}" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors">
        </div>
        <div>
          <label class="block text-sm font-semibold text-toss-gray-900 mb-2">프로젝트 설명</label>
          <textarea id="edit-project-description" rows="3" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors">${escapeHtml(currentProject.description || '')}</textarea>
        </div>
        <div>
          <label class="block text-sm font-semibold text-toss-gray-900 mb-2">상위 기획안</label>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
            <div class="flex gap-2">
              <i class="fas fa-info-circle text-amber-600 mt-0.5"></i>
              <div class="flex-1">
                <p class="text-xs text-toss-gray-700 font-semibold mb-1">기획안을 수정하면 다시 평가해보는 것을 권장해요</p>
                <p class="text-xs text-toss-gray-600">수정 후 '기획안 평가하기' 버튼을 눌러 AI의 피드백을 받아보세요.</p>
              </div>
            </div>
          </div>
          <textarea id="edit-project-input" rows="10" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors">${escapeHtml(currentProject.input_content || '')}</textarea>
        </div>
      </div>
    `,
    confirmText: '저장하기',
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
          <button onclick="generatePRD()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
            <i class="fas fa-file-alt"></i>
            PRD 생성하기
          </button>
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
        <button onclick="openRequirementDetails(${requirement.id})" class="ml-4 text-toss-blue hover:text-toss-blue-dark font-semibold text-sm flex items-center gap-1 transition-colors">
          <span>상세보기</span>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
      
      ${children.length > 0 ? `
        <div class="mt-4 pl-4 border-l-2 border-toss-gray-200 space-y-3">
          ${children.map(child => `
            <div class="bg-toss-gray-50 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-sm text-toss-gray-900">${escapeHtml(child.title)}</span>
                <button onclick="openRequirementDetails(${child.id})" class="text-toss-blue hover:text-toss-blue-dark text-xs font-semibold">
                  상세보기
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
              <div class="space-y-4">
                ${questions.map((q, index) => `
                  <div class="border-2 border-toss-gray-200 rounded-xl p-5">
                    <p class="font-semibold text-toss-gray-900 mb-3">${index + 1}. ${escapeHtml(q.question_text)}</p>
                    ${q.answer ? `
                      <div class="bg-green-50 border border-green-100 rounded-xl p-4">
                        <p class="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                          <i class="fas fa-check-circle"></i>
                          답변 완료
                        </p>
                        <p class="text-sm text-toss-gray-900">${escapeHtml(q.answer.answer_text)}</p>
                      </div>
                    ` : `
                      <textarea id="answer-${q.id}" rows="3" class="w-full bg-white border-2 border-toss-gray-200 rounded-xl px-4 py-3 text-toss-gray-900 focus:outline-none focus:border-toss-blue transition-colors mb-3" placeholder="답변을 입력해주세요..."></textarea>
                      <button onclick="submitAnswer(${q.id})" class="btn-primary text-white px-5 py-2 rounded-xl font-semibold text-sm">
                        답변 저장하기
                      </button>
                    `}
                  </div>
                `).join('')}
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
    
    content.innerHTML = `
      <div>
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="text-3xl font-bold text-toss-gray-900 mb-2">PRD 문서</h1>
            <p class="text-sm text-toss-gray-600">생성된 기획 문서를 확인해보세요</p>
          </div>
          <button onclick="downloadPRD()" class="bg-toss-blue hover:bg-toss-blue-dark text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
            <i class="fas fa-download"></i>
            다운로드
          </button>
        </div>
        
        <div class="card p-8 prose prose-lg max-w-none">
          ${marked.parse(prd.content)}
        </div>
      </div>
    `;
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

