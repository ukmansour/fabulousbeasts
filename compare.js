// 문서 비교 기능 (간소화 버전)
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let documentId = null;
let versions = [];

// URL에서 문서 ID 가져오기
const urlParams = new URLSearchParams(window.location.search);
documentId = urlParams.get('id');

if (documentId) {
    loadVersions();
} else {
    // 샘플 버전 데이터 (데모용)
    loadSampleVersions();
}

// 버전 선택 이벤트
document.getElementById('version-old').addEventListener('change', loadOldVersion);
document.getElementById('version-new').addEventListener('change', loadNewVersion);

async function loadVersions() {
    try {
        // Firestore에서 문서 버전 히스토리 로드
        const historyRef = collection(db, 'document_history');
        const q = query(
            historyRef,
            where('document_id', '==', documentId),
            orderBy('timestamp', 'desc')
        );
        
        const snapshot = await getDocs(q);
        versions = snapshot.docs.map((doc, index) => ({
            id: doc.id,
            version: snapshot.docs.length - index,
            ...doc.data()
        }));
        
        populateVersionSelects();
    } catch (err) {
        console.error('버전 로드 오류:', err);
        loadSampleVersions();
    }
}

function loadSampleVersions() {
    // 샘플 버전 데이터 (실제 환경에서는 Firestore에서 로드)
    versions = [
        {
            id: '1',
            version: 3,
            content: '# 천록 (Pixiu)\n\n천록은 중국 신화에 등장하는 상상의 동물로, 용의 아들 중 하나입니다.\n\n## 특징\n- 날개가 있는 사자 형태\n- 재물을 지키는 수호신\n- 악귀를 쫓아내는 능력\n\n## 유수언에서\n천록은 주인공 팀의 중요한 조력자로 등장합니다.',
            author: '편집자1',
            timestamp: new Date('2024-01-15'),
            summary: '내용 추가 및 수정'
        },
        {
            id: '2',
            version: 2,
            content: '# 천록 (Pixiu)\n\n천록은 중국 신화에 등장하는 상상의 동물입니다.\n\n## 특징\n- 날개가 있는 사자\n- 재물을 지킴\n- 악귀를 쫓아냄\n\n## 유수언에서\n조력자로 등장합니다.',
            author: '편집자2',
            timestamp: new Date('2024-01-10'),
            summary: '구조 개선'
        },
        {
            id: '3',
            version: 1,
            content: '# 천록\n\n천록은 신화 속 동물입니다.\n\n특징:\n- 날개 있음\n- 재물 지킴',
            author: '편집자1',
            timestamp: new Date('2024-01-05'),
            summary: '최초 작성'
        }
    ];
    
    populateVersionSelects();
}

function populateVersionSelects() {
    const oldSelect = document.getElementById('version-old');
    const newSelect = document.getElementById('version-new');
    
    const options = versions.map(v => 
        `<option value="${v.id}">버전 ${v.version} - ${formatDate(v.timestamp)} (${v.author})</option>`
    ).join('');
    
    oldSelect.innerHTML = '<option value="">버전을 선택하세요</option>' + options;
    newSelect.innerHTML = '<option value="">버전을 선택하세요</option>' + options;
    
    // 기본 선택 (마지막 2개 버전)
    if (versions.length >= 2) {
        oldSelect.value = versions[1].id;
        newSelect.value = versions[0].id;
        loadOldVersion();
        loadNewVersion();
    }
}

function loadOldVersion() {
    const versionId = document.getElementById('version-old').value;
    const version = versions.find(v => v.id === versionId);
    
    const container = document.getElementById('content-old');
    if (version) {
        container.innerHTML = `<pre style="margin: 0;">${escapeHtml(version.content)}</pre>`;
    } else {
        container.innerHTML = '<div class="compare-empty"><p>버전을 선택하세요.</p></div>';
    }
}

function loadNewVersion() {
    const versionId = document.getElementById('version-new').value;
    const version = versions.find(v => v.id === versionId);
    
    const container = document.getElementById('content-new');
    if (version) {
        container.innerHTML = `<pre style="margin: 0;">${escapeHtml(version.content)}</pre>`;
    } else {
        container.innerHTML = '<div class="compare-empty"><p>버전을 선택하세요.</p></div>';
    }
}

window.showDiff = function() {
    const oldId = document.getElementById('version-old').value;
    const newId = document.getElementById('version-new').value;
    
    if (!oldId || !newId) {
        alert('비교할 두 버전을 모두 선택해주세요.');
        return;
    }
    
    const oldVersion = versions.find(v => v.id === oldId);
    const newVersion = versions.find(v => v.id === newId);
    
    if (!oldVersion || !newVersion) return;
    
    // 간단한 라인별 diff
    const oldLines = oldVersion.content.split('\n');
    const newLines = newVersion.content.split('\n');
    
    const diff = simpleDiff(oldLines, newLines);
    
    // 결과 표시
    document.getElementById('content-old').innerHTML = diff.old;
    document.getElementById('content-new').innerHTML = diff.new;
};

function simpleDiff(oldLines, newLines) {
    let oldHtml = '';
    let newHtml = '';
    
    const maxLen = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLen; i++) {
        const oldLine = oldLines[i] || '';
        const newLine = newLines[i] || '';
        
        if (oldLine === newLine) {
            oldHtml += `<div class="diff-line diff-unchanged">${escapeHtml(oldLine) || '&nbsp;'}</div>`;
            newHtml += `<div class="diff-line diff-unchanged">${escapeHtml(newLine) || '&nbsp;'}</div>`;
        } else {
            if (oldLine) {
                oldHtml += `<div class="diff-line diff-removed">- ${escapeHtml(oldLine)}</div>`;
            } else {
                oldHtml += `<div class="diff-line">&nbsp;</div>`;
            }
            
            if (newLine) {
                newHtml += `<div class="diff-line diff-added">+ ${escapeHtml(newLine)}</div>`;
            } else {
                newHtml += `<div class="diff-line">&nbsp;</div>`;
            }
        }
    }
    
    return { old: oldHtml, new: newHtml };
}

function formatDate(date) {
    if (!(date instanceof Date)) {
        date = date.toDate ? date.toDate() : new Date(date);
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('문서 비교 페이지 초기화 완료');
