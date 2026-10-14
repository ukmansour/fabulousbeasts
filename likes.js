// 게시글 좋아요 관리 (localStorage 기반)
const LIKES_KEY = 'post_likes';

// 좋아요 목록 가져오기
export function getLikes() {
    try {
        const stored = localStorage.getItem(LIKES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('좋아요 로드 실패:', e);
        return [];
    }
}

// 좋아요 추가
export function addLike(postId) {
    const likes = getLikes();
    
    if (likes.includes(postId)) {
        return false; // 이미 좋아요함
    }
    
    likes.push(postId);
    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
    
    // 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('likesChanged', { detail: { postId, action: 'add' } }));
    
    return true;
}

// 좋아요 제거
export function removeLike(postId) {
    let likes = getLikes();
    likes = likes.filter(id => id !== postId);
    
    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
    
    // 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('likesChanged', { detail: { postId, action: 'remove' } }));
    
    return true;
}

// 좋아요 여부 확인
export function isLiked(postId) {
    const likes = getLikes();
    return likes.includes(postId);
}

// 좋아요 토글
export function toggleLike(postId) {
    if (isLiked(postId)) {
        removeLike(postId);
        return false;
    } else {
        addLike(postId);
        return true;
    }
}

// 좋아요 수 가져오기 (가상 - 실제로는 로컬 데이터만 사용)
export function getLikeCount(postId) {
    // 실제 구현에서는 서버에서 가져와야 하지만,
    // 간단한 프로토타입으로 localStorage에서만 계산
    const likes = getLikes();
    return likes.includes(postId) ? 1 : 0;
}

// 전역 함수로 등록
window.handleLikeClick = function(postId) {
    const isNowLiked = toggleLike(postId);
    
    // 버튼 업데이트
    updateLikeButtons(postId, isNowLiked);
    
    // 토스트 메시지
    const message = isNowLiked ? '❤️ 게시글을 추천했습니다' : '추천을 취소했습니다';
    showToast(message);
};

// 좋아요 버튼 업데이트
function updateLikeButtons(postId, isLiked) {
    const buttons = document.querySelectorAll(`[data-post-id="${postId}"].like-btn`);
    buttons.forEach(btn => {
        btn.classList.toggle('liked', isLiked);
        const icon = btn.querySelector('.like-icon');
        if (icon) {
            icon.textContent = isLiked ? '❤️' : '🤍';
        }
    });
}

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
    }, 2500);
}

console.log('좋아요 시스템 초기화 완료');
