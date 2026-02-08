// ============ Constants ============
const API_BASE = window.location.origin + '/api';

// ============ Scroll Animations ============
const navbar = document.getElementById('navbar');
const featureSections = document.querySelectorAll('.feature-section');

// Navbar scroll effect
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Feature sections scroll reveal
const observerOptions = {
  threshold: 0.2,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

featureSections.forEach(section => {
  observer.observe(section);
});

// ============ Modal System ============
function createModal(content) {
  const existingModal = document.getElementById('auth-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    animation: fadeIn 0.3s ease;
  `;
  
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 24px;
      padding: 48px;
      max-width: 480px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    ">
      <button onclick="closeModal()" style="
        position: absolute;
        top: 24px;
        right: 24px;
        width: 32px;
        height: 32px;
        border: none;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(0, 0, 0, 0.1)'" onmouseout="this.style.background='rgba(0, 0, 0, 0.05)'">
        <i class="fas fa-times"></i>
      </button>
      ${content}
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = '';
    }, 300);
  }
}

// ============ Login Modal ============
function showLoginModal() {
  createModal(`
    <div style="position: relative;">
      <h2 style="font-size: 32px; font-weight: 800; margin-bottom: 12px; text-align: center;">로그인</h2>
      <p style="color: #6e6e73; text-align: center; margin-bottom: 32px;">다시 만나서 반가워요!</p>
      
      <form onsubmit="handleLogin(event)" style="display: flex; flex-direction: column; gap: 20px;">
        <div>
          <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px;">이메일</label>
          <input type="email" id="login-email" required style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e5ea;
            border-radius: 12px;
            font-size: 16px;
            transition: border-color 0.3s ease;
          " onfocus="this.style.borderColor='#007AFF'" onblur="this.style.borderColor='#e5e5ea'" placeholder="이메일을 입력하세요">
        </div>
        
        <div>
          <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px;">비밀번호</label>
          <input type="password" id="login-password" required style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e5ea;
            border-radius: 12px;
            font-size: 16px;
            transition: border-color 0.3s ease;
          " onfocus="this.style.borderColor='#007AFF'" onblur="this.style.borderColor='#e5e5ea'" placeholder="비밀번호를 입력하세요">
        </div>
        
        <button type="submit" style="
          width: 100%;
          padding: 16px;
          background: #007AFF;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
        " onmouseover="this.style.background='#0051D5'" onmouseout="this.style.background='#007AFF'">
          로그인
        </button>
      </form>
      
      <div style="text-align: center; margin-top: 24px;">
        <p style="color: #6e6e73; font-size: 14px;">
          계정이 없으신가요? 
          <a href="#" onclick="event.preventDefault(); showSignupModal();" style="color: #007AFF; font-weight: 600; text-decoration: none;">회원가입</a>
        </p>
      </div>
    </div>
  `);
}

// ============ Signup Modal ============
function showSignupModal() {
  createModal(`
    <div style="position: relative;">
      <h2 style="font-size: 32px; font-weight: 800; margin-bottom: 12px; text-align: center;">회원가입</h2>
      <p style="color: #6e6e73; text-align: center; margin-bottom: 32px;">10초면 시작할 수 있어요</p>
      
      <form onsubmit="handleSignup(event)" style="display: flex; flex-direction: column; gap: 20px;">
        <div>
          <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px;">이메일 *</label>
          <input type="email" id="signup-email" required style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e5ea;
            border-radius: 12px;
            font-size: 16px;
            transition: border-color 0.3s ease;
          " onfocus="this.style.borderColor='#007AFF'" onblur="this.style.borderColor='#e5e5ea'" placeholder="이메일을 입력하세요">
        </div>
        
        <div>
          <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px;">이름 *</label>
          <input type="text" id="signup-name" required style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e5ea;
            border-radius: 12px;
            font-size: 16px;
            transition: border-color 0.3s ease;
          " onfocus="this.style.borderColor='#007AFF'" onblur="this.style.borderColor='#e5e5ea'" placeholder="이름을 입력하세요">
        </div>
        
        <div>
          <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px;">생년월일 (선택)</label>
          <input type="date" id="signup-birthdate" style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e5ea;
            border-radius: 12px;
            font-size: 16px;
            transition: border-color 0.3s ease;
          " onfocus="this.style.borderColor='#007AFF'" onblur="this.style.borderColor='#e5e5ea'">
        </div>
        
        <div>
          <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px;">비밀번호 *</label>
          <input type="password" id="signup-password" required minlength="8" style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e5ea;
            border-radius: 12px;
            font-size: 16px;
            transition: border-color 0.3s ease;
          " onfocus="this.style.borderColor='#007AFF'" onblur="this.style.borderColor='#e5e5ea'" placeholder="8자 이상 입력하세요">
          <p style="font-size: 12px; color: #6e6e73; margin-top: 6px;">최소 8자 이상, 영문/숫자/특수문자 포함 권장</p>
        </div>
        
        <div>
          <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px;">비밀번호 확인 *</label>
          <input type="password" id="signup-password-confirm" required minlength="8" style="
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e5e5ea;
            border-radius: 12px;
            font-size: 16px;
            transition: border-color 0.3s ease;
          " onfocus="this.style.borderColor='#007AFF'" onblur="this.style.borderColor='#e5e5ea'" placeholder="비밀번호를 다시 입력하세요">
        </div>
        
        <button type="submit" id="signup-submit-btn" style="
          width: 100%;
          padding: 16px;
          background: #007AFF;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
        " onmouseover="this.style.background='#0051D5'" onmouseout="this.style.background='#007AFF'">
          가입하기
        </button>
      </form>
      
      <div style="text-align: center; margin-top: 24px;">
        <p style="color: #6e6e73; font-size: 14px;">
          이미 계정이 있으신가요? 
          <a href="#" onclick="event.preventDefault(); showLoginModal();" style="color: #007AFF; font-weight: 600; text-decoration: none;">로그인</a>
        </p>
      </div>
    </div>
  `);
}

// ============ Email Verification ============
let verificationTimer;
let isEmailVerified = false;

async function sendVerificationCode() {
  const email = document.getElementById('signup-email').value;
  if (!email || !email.includes('@')) {
    alert('올바른 이메일 주소를 입력해주세요.');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      document.getElementById('verification-code-section').style.display = 'block';
      startVerificationTimer();
      alert('인증코드가 발송되었습니다. 이메일을 확인해주세요.');
    } else {
      alert(data.error || '인증코드 발송에 실패했습니다.');
    }
  } catch (error) {
    console.error('Send verification error:', error);
    alert('인증코드 발송 중 오류가 발생했습니다.');
  }
}

function startVerificationTimer() {
  let timeLeft = 300; // 5분
  const timerEl = document.getElementById('verification-timer');
  
  clearInterval(verificationTimer);
  verificationTimer = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerEl.textContent = `남은 시간: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 0) {
      clearInterval(verificationTimer);
      timerEl.textContent = '인증 시간이 만료되었습니다. 다시 발송해주세요.';
    }
  }, 1000);
}

async function verifyCode() {
  const email = document.getElementById('signup-email').value;
  const code = document.getElementById('verification-code').value;
  
  if (!code || code.length !== 6) {
    alert('6자리 인증코드를 입력해주세요.');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      isEmailVerified = true;
      clearInterval(verificationTimer);
      document.getElementById('verification-timer').textContent = '✓ 인증 완료';
      document.getElementById('verification-timer').style.color = '#34C759';
      
      const submitBtn = document.getElementById('signup-submit-btn');
      submitBtn.disabled = false;
      submitBtn.style.background = '#007AFF';
      submitBtn.style.cursor = 'pointer';
      submitBtn.textContent = '회원가입 완료';
      
      alert('이메일 인증이 완료되었습니다!');
    } else {
      alert(data.error || '인증코드가 올바르지 않습니다.');
    }
  } catch (error) {
    console.error('Verify code error:', error);
    alert('인증 확인 중 오류가 발생했습니다.');
  }
}

// ============ Auth Handlers ============
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('로그인 성공!');
      closeModal();
      // Redirect to main app
      window.location.href = '/app';
    } else {
      alert(data.error || '로그인에 실패했습니다.');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('로그인 중 오류가 발생했습니다.');
  }
}

async function handleSignup(event) {
  event.preventDefault();
  
  const email = document.getElementById('signup-email').value;
  const name = document.getElementById('signup-name').value;
  const birthDate = document.getElementById('signup-birthdate').value || null;
  const password = document.getElementById('signup-password').value;
  const passwordConfirm = document.getElementById('signup-password-confirm').value;
  
  if (password !== passwordConfirm) {
    alert('비밀번호가 일치하지 않습니다.');
    return;
  }
  
  if (password.length < 8) {
    alert('비밀번호는 최소 8자 이상이어야 합니다.');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, birth_date: birthDate, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
      showLoginModal();
    } else {
      alert(data.error || '회원가입에 실패했습니다.');
    }
  } catch (error) {
    console.error('Signup error:', error);
    alert('회원가입 중 오류가 발생했습니다.');
  }
}

// ============ Animations ============
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes scaleIn {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
`;
document.head.appendChild(style);
