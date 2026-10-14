// 캐릭터 관계도
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let allRelationships = [];
let currentFilter = 'all';

// 사용자 인증 상태
onAuthStateChanged(auth, (user) => {
    const info = document.getElementById('user-info');
    if (!info) return;

    if (user) {
        const nickname = user.displayName || user.email?.split('@')[0] || '익명';
        info.innerHTML = `
            <span style="color:white;font-size:0.75rem;">${nickname}님</span>
            <a href="#" class="nav-link" id="logout-btn">로그아웃</a>
        `;

        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('로그아웃하시겠습니까?')) {
                signOut(auth).then(() => location.reload());
            }
        });
    } else {
        info.innerHTML = `<a href="auth.html" class="nav-link">로그인</a>`;
    }
});

// 관계 데이터 (예시 - 실제로는 D1이나 Firestore에서 가져올 수 있음)
const SAMPLE_RELATIONSHIPS = {
    "천록": {
        id: "천록",
        name: "천록",
        image: "https://via.placeholder.com/60",
        relationships: [
            { type: "friend", target: "백택", targetName: "백택" },
            { type: "ally", target: "화류", targetName: "화류" },
            { type: "mentor", target: "기린", targetName: "기린" }
        ]
    },
    "백택": {
        id: "백택",
        name: "백택",
        image: "https://via.placeholder.com/60",
        relationships: [
            { type: "friend", target: "천록", targetName: "천록" },
            { type: "family", target: "맥", targetName: "맥" }
        ]
    },
    "화류": {
        id: "화류",
        name: "화류",
        image: "https://via.placeholder.com/60",
        relationships: [
            { type: "ally", target: "천록", targetName: "천록" },
            { type: "friend", target: "이어", targetName: "이어" }
        ]
    }
};

// 페이지 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await loadRelationships();
    initFilters();
    renderRelationships();
});

// 관계 데이터 로드
async function loadRelationships() {
    try {
        // 실제 구현에서는 API에서 가져오기
        // const response = await fetch('/api/relationships');
        // allRelationships = await response.json();
        
        // 샘플 데이터 사용
        allRelationships = Object.values(SAMPLE_RELATIONSHIPS);
        
        console.log('관계도 로드 완료:', allRelationships.length, '개');
    } catch (error) {
        console.error('관계도 로드 실패:', error);
        allRelationships = Object.values(SAMPLE_RELATIONSHIPS);
    }
}

// 필터 초기화
function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderRelationships();
        });
    });
}

// 관계도 렌더링
function renderRelationships() {
    const grid = document.getElementById('relationships-grid');
    if (!grid) return;

    // 필터 적용
    let filtered = allRelationships;
    if (currentFilter !== 'all') {
        filtered = allRelationships.filter(char => 
            char.relationships.some(rel => rel.type === currentFilter)
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="relationship-empty">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                <p>해당 조건의 관계가 없습니다.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(char => {
        const relationships = currentFilter === 'all' 
            ? char.relationships 
            : char.relationships.filter(rel => rel.type === currentFilter);

        return `
            <div class="relationship-card">
                <div class="relationship-header">
                    <img src="${char.image}" alt="${char.name}" class="relationship-avatar">
                    <div class="relationship-name" onclick="location.href='detail.html#${char.id}'">
                        ${char.name}
                    </div>
                </div>
                <div class="relationship-list">
                    ${relationships.map(rel => `
                        <div class="relationship-item" onclick="location.href='detail.html#${rel.target}'">
                            <span class="relationship-type rel-${rel.type}">
                                ${getRelationshipLabel(rel.type)}
                            </span>
                            <span class="relationship-target">${rel.targetName}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// 관계 유형 레이블
function getRelationshipLabel(type) {
    const labels = {
        friend: '친구',
        family: '가족',
        rival: '라이벌',
        mentor: '스승',
        ally: '동료'
    };
    return labels[type] || type;
}

console.log('관계도 시스템 초기화 완료');
