// 다크모드 테마 관리
const THEME_KEY = 'site_theme';

// 현재 테마 가져오기
export function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
}

// 테마 설정
export function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
}

// 테마 토글
export function toggleTheme() {
    const current = getTheme();
    const newTheme = current === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    return newTheme;
}

// 테마 적용
export function applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'dark') {
        root.classList.add('dark-mode');
        root.classList.remove('light-mode');
    } else {
        root.classList.add('light-mode');
        root.classList.remove('dark-mode');
    }
    
    // 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
    
    // 토글 버튼 업데이트
    updateThemeToggleButtons(theme);
}

// 테마 토글 버튼 업데이트
function updateThemeToggleButtons(theme) {
    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(btn => {
        btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
        btn.title = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
    });
}

// 테마 토글 버튼 생성
export function createThemeToggleButton() {
    const theme = getTheme();
    return `
        <button 
            class="theme-toggle-btn" 
            onclick="window.toggleThemeGlobal()"
            title="${theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}"
        >
            ${theme === 'dark' ? '☀️' : '🌙'}
        </button>
    `;
}

// 전역 토글 함수
window.toggleThemeGlobal = function() {
    const newTheme = toggleTheme();
    
    // 토스트 메시지
    const message = newTheme === 'dark' ? '🌙 다크 모드 활성화' : '☀️ 라이트 모드 활성화';
    showToast(message);
};

// 토스트 메시지
function showToast(message) {
    const existing = document.querySelector('.toast-message');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// 초기화
export function initTheme() {
    const savedTheme = getTheme();
    applyTheme(savedTheme);
    console.log('테마 시스템 초기화:', savedTheme);
}

// 페이지 로드 시 자동 초기화
initTheme();
