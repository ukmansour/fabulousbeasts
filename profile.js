// 유저 프로필 페이지
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getFavorites } from './favorites.js';
import { CHARACTERS } from './data.js';

let currentUser = null;
let userPosts = [];
let userComments = [];

// 탭 전환
document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.profile-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`content-${tabName}`).classList.add('active');
    });
});

// 인증 상태 감지
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert('로그인이 필요합니다.');
        window.location.href = 'auth.html';
        return;
    }
    
    currentUser = user;
    loadUserProfile();
});

async function loadUserProfile() {
    const nickname = currentUser.displayName || currentUser.email?.split('@')[0] || '익명';
    const email = currentUser.email || '';
    
    // 프로필 헤더 표시
    document.getElementById('profile-name').textContent = nickname;
    document.getElementById('profile-email').textContent = email;
    document.getElementById('profile-avatar').textContent = nickname.charAt(0).toUpperCase();
    
    // 사용자 활동 로드
    await loadUserPosts();
    await loadUserComments();
    loadUserFavorites();
    
    // 통계 업데이트
    document.getElementById('posts-count').textContent = userPosts.length;
    document.getElementById('comments-count').textContent = userComments.length;
    
    // 좋아요 받은 수 (간단히 localStorage에서 계산)
    const likesReceived = calculateLikesReceived();
    document.getElementById('likes-count').textContent = likesReceived;
}

async function loadUserPosts() {
    try {
        const postsRef = collection(db, 'posts');
        const q = query(
            postsRef,
            where('author_uid', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        userPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderPosts();
    } catch (err) {
        console.error('게시글 로드 오류:', err);
        document.getElementById('posts-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">!</div>
                <p>게시글을 불러오지 못했습니다.</p>
            </div>
        `;
    }
}

async function loadUserComments() {
    try {
        const commentsRef = collection(db, 'comments');
        const q = query(
            commentsRef,
            where('author_uid', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        userComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderComments();
    } catch (err) {
        console.error('댓글 로드 오류:', err);
        document.getElementById('comments-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">!</div>
                <p>댓글을 불러오지 못했습니다.</p>
            </div>
        `;
    }
}

function loadUserFavorites() {
    const favorites = getFavorites();
    renderFavorites(favorites);
}

function renderPosts() {
    const container = document.getElementById('posts-list');
    
    if (userPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">-</div>
                <p>작성한 게시글이 없습니다.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userPosts.map(post => `
        <div class="activity-item" onclick="location.href='post.html?id=${post.id}'">
            <div class="activity-title">${escapeHtml(post.title || '제목 없음')}</div>
            <div class="activity-meta">
                ${formatDate(post.createdAt)} · 조회 ${post.views || 0} · 댓글 ${post.commentCount || 0}
            </div>
            <div class="activity-preview">${escapeHtml(truncate(post.content || '', 100))}</div>
        </div>
    `).join('');
}

function renderComments() {
    const container = document.getElementById('comments-list');
    
    if (userComments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">-</div>
                <p>작성한 댓글이 없습니다.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userComments.map(comment => `
        <div class="activity-item" onclick="location.href='post.html?id=${comment.post_id}'">
            <div class="activity-title">댓글 · ${comment.post_title || '게시글'}</div>
            <div class="activity-meta">${formatDate(comment.createdAt)}</div>
            <div class="activity-preview">${escapeHtml(comment.content || '')}</div>
        </div>
    `).join('');
}

function renderFavorites(favorites) {
    const container = document.getElementById('favorites-list');
    
    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">★</div>
                <p>즐겨찾기한 캐릭터가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = favorites.map(fav => {
        const char = CHARACTERS.find(c => c.id === fav.id);
        if (!char) return '';
        
        return `
            <div class="activity-item" onclick="location.href='detail.html?id=${char.id}'">
                <div class="activity-title">★ ${char.korName || char.name}</div>
                <div class="activity-meta">즐겨찾기 추가: ${new Date(fav.timestamp).toLocaleDateString()}</div>
            </div>
        `;
    }).join('');
}

function calculateLikesReceived() {
    // localStorage에서 좋아요 데이터 가져와서 현재 사용자 게시글의 좋아요 수 계산
    const likesData = JSON.parse(localStorage.getItem('post_likes') || '{}');
    let totalLikes = 0;
    
    userPosts.forEach(post => {
        const postLikes = likesData[post.id] || [];
        totalLikes += postLikes.length;
    });
    
    return totalLikes;
}

function formatDate(timestamp) {
    if (!timestamp) return '날짜 없음';
    
    const date = timestamp.seconds 
        ? new Date(timestamp.seconds * 1000) 
        : new Date(timestamp);
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

console.log('프로필 페이지 초기화 완료');
