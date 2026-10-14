// 캐릭터 즐겨찾기 관리
const FAVORITES_KEY = 'character_favorites';

// 즐겨찾기 목록 가져오기
export function getFavorites() {
    try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('즐겨찾기 로드 실패:', e);
        return [];
    }
}

// 즐겨찾기 추가
export function addFavorite(characterId, characterName) {
    const favorites = getFavorites();
    
    // 중복 체크
    if (favorites.some(f => f.id === characterId)) {
        return false;
    }
    
    favorites.push({
        id: characterId,
        name: characterName,
        addedAt: new Date().toISOString()
    });
    
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    
    // 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: favorites }));
    
    return true;
}

// 즐겨찾기 제거
export function removeFavorite(characterId) {
    let favorites = getFavorites();
    favorites = favorites.filter(f => f.id !== characterId);
    
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    
    // 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: favorites }));
    
    return true;
}

// 즐겨찾기 여부 확인
export function isFavorite(characterId) {
    const favorites = getFavorites();
    return favorites.some(f => f.id === characterId);
}

// 즐겨찾기 토글
export function toggleFavorite(characterId, characterName) {
    if (isFavorite(characterId)) {
        removeFavorite(characterId);
        return false;
    } else {
        addFavorite(characterId, characterName);
        return true;
    }
}

// 즐겨찾기 버튼 HTML 생성
export function createFavoriteButton(characterId, characterName) {
    const isFav = isFavorite(characterId);
    
    return `
        <button 
            class="favorite-btn ${isFav ? 'active' : ''}" 
            onclick="handleFavoriteClick('${characterId}', '${characterName}')"
            title="${isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}"
        >
            ${isFav ? '★' : '☆'}
        </button>
    `;
}

// 전역 함수로 등록 (HTML에서 호출 가능)
window.handleFavoriteClick = function(characterId, characterName) {
    const isNowFavorite = toggleFavorite(characterId, characterName);
    
    // 버튼 업데이트
    const buttons = document.querySelectorAll(`[onclick*="${characterId}"]`);
    buttons.forEach(btn => {
        if (btn.classList.contains('favorite-btn')) {
            btn.classList.toggle('active', isNowFavorite);
            btn.textContent = isNowFavorite ? '★' : '☆';
            btn.title = isNowFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가';
        }
    });
    
    // 알림 표시
    const message = isNowFavorite 
        ? `${characterName}을(를) 즐겨찾기에 추가했습니다.`
        : `${characterName}을(를) 즐겨찾기에서 제거했습니다.`;
    
    showToast(message);
};

// 토스트 메시지 표시
function showToast(message) {
    // 기존 토스트 제거
    const existing = document.querySelector('.toast-message');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 애니메이션
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 3초 후 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

console.log('즐겨찾기 시스템 초기화 완료');
