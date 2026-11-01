// 알림 시스템
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;
let notificationInterval = null;

// Firebase Auth 상태 감시
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    
    if (user) {
        const notificationBell = document.getElementById('notification-bell');
        if (notificationBell) notificationBell.style.display = 'block';
        
        loadNotifications();
        startNotificationPolling();
    } else {
        const notificationBell = document.getElementById('notification-bell');
        if (notificationBell) notificationBell.style.display = 'none';
        
        stopNotificationPolling();
    }
});

// 알림 주기적 확인 (30초)
function startNotificationPolling() {
    if (notificationInterval) return;
    notificationInterval = setInterval(loadNotifications, 30000);
}

function stopNotificationPolling() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

// 알림 로드
async function loadNotifications() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/notifications?uid=${currentUser.uid}`);
        
        if (!response.ok) {
            renderNotifications([]);
            updateUnreadCount([]);
            return;
        }
        
        const notifications = await response.json();
        renderNotifications(notifications);
        updateUnreadCount(notifications);
    } catch (error) {
        console.error('알림 로드 오류:', error);
        renderNotifications([]);
        updateUnreadCount([]);
    }
}

// 알림 렌더링
function renderNotifications(notifications) {
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;
    
    if (!notifications.length) {
        notificationList.innerHTML = '<div style="padding: 2rem; text-align: center; color: #999;">알림이 없습니다</div>';
        return;
    }
    
    notificationList.innerHTML = notifications.map(notif => {
        const timeAgo = getTimeAgo(notif.created_at);
        const unreadClass = notif.is_read ? '' : 'unread';
        const unreadDot = notif.is_read ? '' : '<span class="notification-dot"></span>';
        // API의 필드명: content (18번 API), message (이전 방식) 둘 다 지원
        const text = notif.content || notif.message || '';
        
        return `
            <div class="notification-item ${unreadClass}" onclick="handleNotificationClick(${notif.id}, '${notif.link || ''}')">
                <div class="notification-content">
                    <div class="notification-text">${escapeHtml(text)}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                ${unreadDot}
            </div>
        `;
    }).join('');
}

// 읽지 않은 알림 수 업데이트
function updateUnreadCount(notifications) {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;
    
    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// 알림 드롭다운 토글
window.toggleNotificationDropdown = function() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;
    
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) loadNotifications();
};

// 알림 클릭 처리
window.handleNotificationClick = async function(notificationId, link) {
    if (!currentUser) return;
    
    try {
        // 읽음 처리 (19번 API: { id, uid })
        await fetch('/api/notifications/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: notificationId, uid: currentUser.uid })
        });
        
        await loadNotifications();
        
        if (link) window.location.href = link;
    } catch (error) {
        console.error('알림 읽음 처리 오류:', error);
    }
};

// 모두 읽음 처리
window.markAllAsRead = async function() {
    if (!currentUser) return;
    
    try {
        // 20번 API: { uid }
        await fetch('/api/notifications/read-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: currentUser.uid })
        });
        
        await loadNotifications();
    } catch (error) {
        console.error('모두 읽음 처리 오류:', error);
    }
};

// 관리자 문의 모달 열기
window.openContactModal = function() {
    const modal = document.getElementById('contact-modal');
    if (modal) modal.style.display = 'flex';
    
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.style.display = 'none';
};

// 관리자 문의 모달 닫기
window.closeContactModal = function() {
    const modal = document.getElementById('contact-modal');
    if (modal) modal.style.display = 'none';
    
    const textarea = document.getElementById('contact-message');
    if (textarea) textarea.value = '';
};

// 관리자 문의 제출 (22번 API: { uid, author, message })
window.submitContact = async function() {
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    const textarea = document.getElementById('contact-message');
    const message = textarea.value.trim();
    
    if (!message) {
        alert('메시지를 입력해주세요.');
        return;
    }
    
    try {
        const nickname = currentUser.displayName || currentUser.email?.split('@')[0] || '익명';
        
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: currentUser.uid,
                author: nickname,
                message
            })
        });
        
        if (!response.ok) throw new Error('문의 전송 실패');
        
        alert('관리자에게 메시지가 전송되었습니다.');
        closeContactModal();
    } catch (error) {
        console.error('문의 전송 오류:', error);
        alert('문의 전송 중 오류가 발생했습니다.');
    }
};

// 시간 경과 표시
function getTimeAgo(timestamp) {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return created.toLocaleDateString('ko-KR');
}

// HTML 이스케이프
function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// 외부 클릭 시 드롭다운 닫기
document.addEventListener('click', (e) => {
    const notificationBell = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notification-dropdown');
    if (notificationBell && dropdown && !notificationBell.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

// 모달 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
    const modal = document.getElementById('contact-modal');
    if (modal && e.target === modal) closeContactModal();
});

console.log('알림 시스템 초기화 완료');
