// 통합 검색 페이지
import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { CHARACTERS } from './data.js';

let currentFilter = 'all';
let searchResults = { characters: [], posts: [], documents: [] };

// 필터 초기화
document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        renderResults();
    });
});

// 검색 입력
const searchInput = document.getElementById('search-query');
searchInput.addEventListener('input', debounce(handleSearch, 300));

// URL에서 검색어 가져오기
const urlParams = new URLSearchParams(window.location.search);
const initialQuery = urlParams.get('q');
if (initialQuery) {
    searchInput.value = initialQuery;
    handleSearch();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        searchResults = { characters: [], posts: [], documents: [] };
        renderResults();
        return;
    }
    
    // 캐릭터 검색
    searchResults.characters = CHARACTERS.filter(char => 
        char.name.toLowerCase().includes(query) || 
        (char.korName && char.korName.toLowerCase().includes(query)) ||
        (char.description && char.description.toLowerCase().includes(query))
    );
    
    // 게시글 검색 (Firestore)
    try {
        const postsSnapshot = await getDocs(collection(db, 'posts'));
        searchResults.posts = postsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(post => 
                post.title?.toLowerCase().includes(query) || 
                post.content?.toLowerCase().includes(query) ||
                post.author?.toLowerCase().includes(query)
            )
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (err) {
        console.error('게시글 검색 오류:', err);
        searchResults.posts = [];
    }
    
    // 문서 검색 (간단한 mock - 실제로는 wiki 문서 검색)
    searchResults.documents = mockDocumentSearch(query);
    
    renderResults();
}

function mockDocumentSearch(query) {
    const mockDocs = [
        { id: 1, title: '유수언 세계관 가이드', snippet: '유수언의 세계는 고대 중국 신화를 바탕으로...', type: 'wiki' },
        { id: 2, title: '신수들의 능력 체계', snippet: '각 신수는 고유한 능력과 특성을 가지고 있으며...', type: 'wiki' },
        { id: 3, title: '등장 에피소드 정리', snippet: '시즌별 주요 에피소드와 캐릭터 등장 정보...', type: 'wiki' }
    ];
    
    return mockDocs.filter(doc => 
        doc.title.toLowerCase().includes(query) || 
        doc.snippet.toLowerCase().includes(query)
    );
}

function renderResults() {
    const container = document.getElementById('search-results-container');
    
    const totalResults = searchResults.characters.length + 
                         searchResults.posts.length + 
                         searchResults.documents.length;
    
    if (totalResults === 0) {
        container.innerHTML = `
            <div class="search-empty">
                <div class="search-empty-icon">🔍</div>
                <p>검색 결과가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // 캐릭터 결과
    if ((currentFilter === 'all' || currentFilter === 'characters') && searchResults.characters.length > 0) {
        html += `
            <div class="search-results-section">
                <div class="search-results-title">캐릭터 (${searchResults.characters.length})</div>
                ${searchResults.characters.map(char => `
                    <div class="search-result-item" onclick="location.href='detail.html?id=${char.id}'">
                        <div class="search-result-type">캐릭터</div>
                        <div class="search-result-title">${char.korName || char.name}</div>
                        <div class="search-result-snippet">${char.description || '신수들의 기록소에 등록된 캐릭터입니다.'}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 게시글 결과
    if ((currentFilter === 'all' || currentFilter === 'posts') && searchResults.posts.length > 0) {
        html += `
            <div class="search-results-section">
                <div class="search-results-title">게시글 (${searchResults.posts.length})</div>
                ${searchResults.posts.map(post => `
                    <div class="search-result-item" onclick="location.href='post.html?id=${post.id}'">
                        <div class="search-result-type">게시글</div>
                        <div class="search-result-title">${escapeHtml(post.title || '제목 없음')}</div>
                        <div class="search-result-snippet">
                            ${escapeHtml(truncate(post.content || '', 150))} 
                            <span style="color: var(--text-tertiary);">- ${post.author || '익명'}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 문서 결과
    if ((currentFilter === 'all' || currentFilter === 'documents') && searchResults.documents.length > 0) {
        html += `
            <div class="search-results-section">
                <div class="search-results-title">문서 (${searchResults.documents.length})</div>
                ${searchResults.documents.map(doc => `
                    <div class="search-result-item" onclick="alert('위키 문서 기능은 준비 중입니다!')">
                        <div class="search-result-type">문서</div>
                        <div class="search-result-title">${escapeHtml(doc.title)}</div>
                        <div class="search-result-snippet">${escapeHtml(doc.snippet)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    container.innerHTML = html;
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

console.log('통합 검색 페이지 초기화 완료');
