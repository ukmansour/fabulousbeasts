import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { CHARACTERS } from './data.js';

// ===== 상태 =====
let currentUser = null;
let userRole = 'guest';
let currentChapter = null;    // 현재 선택된 화 번호
let chapterPages = {};        // { chapterNum: [url, url, ...] } 캐시
let uploadedChapters = new Set(); // 업로드된 화 번호 집합

const TOTAL_CHAPTERS = 1300;
const GROUP_SIZE = 100;

// ===== 헤더 검색 =====
const searchInput = document.getElementById('global-search');
const searchResults = document.getElementById('search-results');
if (searchInput) {
    searchInput.oninput = () => {
        const val = searchInput.value.trim().toLowerCase();
        if (val.length < 1) { searchResults.classList.remove('active'); return; }
        const matches = CHARACTERS.filter(c =>
            (c.name || '').toLowerCase().includes(val) || c.id.toLowerCase().includes(val)
        ).slice(0, 8);
        searchResults.innerHTML = matches.map(m =>
            `<a href="detail.html#${m.id}" class="search-item" style="display:block;text-decoration:none;color:inherit;">${m.name}</a>`
        ).join('');
        searchResults.classList.toggle('active', matches.length > 0);
    };
}

// ===== 인증 =====
onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (user) {
        currentUser = user;

        try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
                const data = snap.data();
                userRole = data.role || 'member';
                if (data.isBanned) {
                    alert('차단된 계정입니다.');
                    return;
                }
            }
        } catch (e) { /* silent */ }

        // 마스터 관리자 체크
        if (user.email === 'hodu@youshouyan.wiki') userRole = 'admin';

        const nickname = user.displayName || user.email?.split('@')[0] || '유저';
        const isAdmin = userRole === 'admin';
        info.innerHTML = `
            ${isAdmin ? `<a href="admin.html" class="nav-link" style="border:1px solid rgba(255,255,255,0.3);padding:0.2rem 0.5rem;border-radius:3px;">관리자</a>` : ''}
            <span style="color:white;font-size:0.75rem;">${nickname}님</span>
            <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', e => {
            e.preventDefault();
            if (confirm('로그아웃하시겠습니까?')) {
                import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js")
                    .then(({ signOut }) => signOut(auth).then(() => location.href = 'index.html'));
            }
        });

        // 관리자면 업로드 패널 표시
        if (isAdmin) {
            document.getElementById('upload-panel').style.display = 'block';
            setupUpload();
        }

        // 알림 벨 표시
        const bell = document.getElementById('notification-bell');
        if (bell) bell.style.display = 'block';
    } else {
        currentUser = null;
        userRole = 'guest';
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }
});

// ===== 초기화: 화 목록 그룹 셀렉터 =====
function initGroupSelector() {
    const sel = document.getElementById('chapter-group-select');
    sel.innerHTML = '';
    const groupCount = Math.ceil(TOTAL_CHAPTERS / GROUP_SIZE);
    for (let g = 0; g < groupCount; g++) {
        const start = g * GROUP_SIZE + 1;
        const end = Math.min(start + GROUP_SIZE - 1, TOTAL_CHAPTERS);
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = `${start}~${end}화`;
        sel.appendChild(opt);
    }
}

// ===== 업로드된 화 목록 조회 =====
async function loadUploadedChapters() {
    try {
        const res = await fetch('/api/manga/chapters');
        if (!res.ok) return;
        const data = await res.json();
        uploadedChapters = new Set(data.map(ch => Number(ch)));
    } catch (e) {
        console.error('챕터 목록 로드 실패:', e);
    }
}

// ===== 화 목록 렌더링 (현재 그룹) =====
function renderChapterList(groupIndex) {
    const list = document.getElementById('chapter-list');
    const start = groupIndex * GROUP_SIZE + 1;
    const end = Math.min(start + GROUP_SIZE - 1, TOTAL_CHAPTERS);

    let html = '';
    for (let ch = start; ch <= end; ch++) {
        const isUploaded = uploadedChapters.has(ch);
        const isActive = ch === currentChapter;
        html += `
            <div class="ch-item ${isActive ? 'active' : ''}" onclick="selectChapter(${ch})">
                <span class="ch-num">${ch}화</span>
                <span style="flex:1; font-size:0.85rem; color:#333;">제${ch}화</span>
                <span class="ch-status ${isUploaded ? 'uploaded' : 'empty'}">
                    ${isUploaded ? '완료' : '미등록'}
                </span>
            </div>
        `;
    }
    list.innerHTML = html;
}

// ===== 그룹 변경 =====
window.onGroupChange = function () {
    const g = parseInt(document.getElementById('chapter-group-select').value);
    renderChapterList(g);
};

// ===== 화 선택 =====
window.selectChapter = async function (chapterNum) {
    currentChapter = chapterNum;

    // 사이드바 활성 상태 갱신
    document.querySelectorAll('.ch-item').forEach(el => el.classList.remove('active'));
    const items = document.querySelectorAll('.ch-item');
    items.forEach(el => {
        if (el.textContent.includes(`제${chapterNum}화`)) el.classList.add('active');
    });

    // 뷰어 UI 갱신
    document.getElementById('manga-placeholder').style.display = 'none';
    document.getElementById('manga-pages').style.display = 'block';
    document.getElementById('manga-nav-bar').style.display = 'flex';
    document.getElementById('manga-info').style.display = 'block';
    document.getElementById('manga-chapter-title').textContent = `제${chapterNum}화`;
    document.getElementById('page-indicator').textContent = `${chapterNum}화`;

    // 관리자 업로드 패널 제목 갱신
    if (userRole === 'admin') {
        document.getElementById('upload-panel-title').textContent = `${chapterNum}화 이미지 업로드`;
    }

    // 이전/다음 버튼 상태
    document.getElementById('btn-prev-ch').disabled = chapterNum <= 1;
    document.getElementById('btn-next-ch').disabled = chapterNum >= TOTAL_CHAPTERS;

    // 이미 캐시된 경우 바로 렌더
    if (chapterPages[chapterNum]) {
        renderPages(chapterPages[chapterNum]);
        return;
    }

    // 없으면 API 조회
    document.getElementById('manga-pages').innerHTML =
        `<div style="color:#888; padding:3rem; text-align:center;">이미지를 불러오는 중...</div>`;
    try {
        const res = await fetch(`/api/manga/pages?chapter=${chapterNum}`);
        if (!res.ok) throw new Error('조회 실패');
        const pages = await res.json(); // string[]
        chapterPages[chapterNum] = pages;
        renderPages(pages);
    } catch (e) {
        document.getElementById('manga-pages').innerHTML =
            `<div style="color:#e03131; padding:3rem; text-align:center;">이미지를 불러올 수 없습니다.<br>아직 업로드되지 않은 화입니다.</div>`;
    }
};

// ===== 이미지 렌더링 =====
function renderPages(pages) {
    const wrap = document.getElementById('manga-pages');
    if (!pages || pages.length === 0) {
        wrap.innerHTML = `<div style="color:#888; padding:3rem; text-align:center;">아직 업로드된 이미지가 없습니다.</div>`;
        return;
    }
    // 세로 스크롤 방식으로 모든 페이지 표시
    wrap.innerHTML = pages.map((url, i) =>
        `<img src="${url}" alt="${currentChapter}화 ${i + 1}페이지"
             loading="lazy"
             style="width:100%; display:block; max-width:800px; margin:0 auto;"
             onerror="this.style.display='none'">`
    ).join('');
    // 맨 위로 스크롤
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 이전/다음 화 =====
window.changeChapter = function (delta) {
    const next = currentChapter + delta;
    if (next < 1 || next > TOTAL_CHAPTERS) return;
    // 현재 그룹과 다른 그룹이면 셀렉터도 변경
    const targetGroup = Math.floor((next - 1) / GROUP_SIZE);
    const sel = document.getElementById('chapter-group-select');
    if (parseInt(sel.value) !== targetGroup) {
        sel.value = targetGroup;
        renderChapterList(targetGroup);
    }
    selectChapter(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ===== 관리자 업로드 =====
function setupUpload() {
    const fileInput = document.getElementById('manga-file-input');
    const dropZone = document.getElementById('upload-drop-zone');

    // 드래그앤드롭
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.background = 'var(--primary-light)'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.background = ''; });
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.style.background = '';
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length) uploadFiles(files);
    });

    fileInput.addEventListener('change', e => {
        const files = Array.from(e.target.files);
        if (files.length) uploadFiles(files);
        fileInput.value = '';
    });
}

async function uploadFiles(files) {
    if (!currentChapter) {
        alert('먼저 화를 선택해주세요.');
        return;
    }

    // 파일명 기준 정렬 (0001.jpg, 0002.jpg, ...)
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const progressWrap = document.getElementById('upload-progress');
    const progressText = document.getElementById('upload-progress-text');
    const progressFill = document.getElementById('upload-progress-fill');
    progressWrap.style.display = 'block';

    const uploadedUrls = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        progressText.textContent = `업로드 중... (${i + 1}/${files.length}) ${file.name}`;
        progressFill.style.width = `${Math.round(((i) / files.length) * 100)}%`;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', `manga/${currentChapter}`);

            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error(await res.text());
            const { url } = await res.json();
            uploadedUrls.push({ page: i + 1, url });
        } catch (e) {
            alert(`${file.name} 업로드 실패: ${e.message}`);
        }
    }

    progressFill.style.width = '100%';
    progressText.textContent = `저장 중...`;

    // D1에 URL 목록 저장
    try {
        const res = await fetch('/api/manga/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chapter: currentChapter,
                pages: uploadedUrls,
                secret: '9889'
            })
        });
        if (!res.ok) throw new Error('저장 실패');

        progressText.textContent = `✅ ${files.length}개 업로드 완료!`;

        // 캐시 무효화 후 다시 로드
        delete chapterPages[currentChapter];
        uploadedChapters.add(currentChapter);
        renderChapterList(parseInt(document.getElementById('chapter-group-select').value));
        await selectChapter(currentChapter);
    } catch (e) {
        progressText.textContent = `❌ 저장 실패: ${e.message}`;
    }

    setTimeout(() => { progressWrap.style.display = 'none'; }, 3000);
}

// ===== 알림 (notifications.js 없이 간단 구현) =====
window.toggleNotificationDropdown = function () {
    const dd = document.getElementById('notification-dropdown');
    if (!dd) return;
    const visible = dd.style.display === 'block';
    dd.style.display = visible ? 'none' : 'block';
};
window.markAllAsRead = async function () {
    if (!currentUser) return;
    await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUser.uid })
    });
};
document.addEventListener('click', e => {
    const bell = document.getElementById('notification-bell');
    const dd = document.getElementById('notification-dropdown');
    if (bell && dd && !bell.contains(e.target)) dd.style.display = 'none';
});

// ===== 시작 =====
(async () => {
    initGroupSelector();
    await loadUploadedChapters();
    renderChapterList(0);

    // URL 파라미터로 화 번호 지정 가능 (?chapter=5)
    const params = new URLSearchParams(location.search);
    const ch = parseInt(params.get('chapter'));
    if (ch && ch >= 1 && ch <= TOTAL_CHAPTERS) {
        const g = Math.floor((ch - 1) / GROUP_SIZE);
        document.getElementById('chapter-group-select').value = g;
        renderChapterList(g);
        selectChapter(ch);
    }
})();
