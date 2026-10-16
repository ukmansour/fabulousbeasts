import { auth, onAuthStateChanged } from './firebase-config.js';

// GitHub repo 정보
const GITHUB_OWNER = 'ukmansour';
const GITHUB_REPO = 'fabulousbeasts';
const GITHUB_BRANCH = 'main';

// 자막 파일 목록을 GitHub API로 가져오기
async function fetchSubtitles() {
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`);
        const data = await response.json();
        
        if (!data.tree) {
            throw new Error('GitHub API 응답 오류');
        }
        
        // .ass 파일만 필터링
        const allAssFiles = data.tree.filter(item => item.path.endsWith('.ass'));
        console.log('모든 .ass 파일:', allAssFiles.map(f => f.path));
        
        // "유수언" 또는 "시즌"이 포함되고 숫자가 있는 .ass 파일 찾기
        const subtitleFiles = allAssFiles
            .filter(item => {
                const path = item.path;
                // "유수언" 포함하고 "화.ass"로 끝나는 파일
                return /유수언/i.test(path) && /\d+화\.ass$/i.test(path);
            })
            .map(item => {
                const fileName = item.path.split('/').pop();
                // 파일명에서 숫자 추출 (n화.ass 형식)
                const match = fileName.match(/(\d+)화\.ass$/i);
                const episodeNum = match ? parseInt(match[1]) : 0;
                const season = Math.ceil(episodeNum / 12); // 12화마다 시즌 구분
                
                return {
                    name: fileName,
                    path: item.path,
                    url: `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${encodeURIComponent(item.path)}`,
                    episode: episodeNum,
                    season: season
                };
            })
            .sort((a, b) => a.episode - b.episode); // 오름차순 정렬
        
        console.log('필터링된 자막 파일:', subtitleFiles);
        renderSubtitles(subtitleFiles);
    } catch (error) {
        console.error('자막 파일 로드 실패:', error);
        document.getElementById('subtitles-list').innerHTML = `
            <div style="text-align: center; padding: 4rem; color: #e74c3c;">
                <h3 style="font-size: 1.3rem; margin-bottom: 1rem;">자막 파일을 불러올 수 없습니다</h3>
                <p style="color: #666;">오류: ${error.message}</p>
                <p style="color: #999; font-size: 0.9rem; margin-top: 1rem;">브라우저 콘솔을 확인해주세요.</p>
            </div>
        `;
    }
}

// 자막 파일 목록 렌더링
function renderSubtitles(files) {
    const container = document.getElementById('subtitles-list');
    
    if (files.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem; color: #999;">
                <h3 style="font-size: 1.3rem; margin-bottom: 1rem;">자막 파일이 없습니다</h3>
                <p>아직 업로드된 자막 파일이 없습니다.</p>
            </div>
        `;
        return;
    }
    
    // 시즌별로 그룹화
    const seasons = {};
    files.forEach(file => {
        if (!seasons[file.season]) {
            seasons[file.season] = [];
        }
        seasons[file.season].push(file);
    });
    
    // 시즌 오름차순으로 렌더링
    const sortedSeasons = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));
    
    let html = '';
    sortedSeasons.forEach(seasonNum => {
        const seasonFiles = seasons[seasonNum];
        html += `
            <div class="season-section">
                <div class="season-title">
                    시즌 ${seasonNum} (${seasonFiles.length}개 파일)
                </div>
                <div class="subtitle-grid">
                    ${seasonFiles.map(file => `
                        <div class="subtitle-item">
                            <span class="subtitle-name">${file.name}</span>
                            <button onclick="downloadFile('${file.url}', '${file.name}')" class="download-btn">다운로드</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 파일 다운로드 함수
async function downloadFile(url, fileName) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('다운로드 실패:', error);
        alert('다운로드 실패: ' + error.message);
    }
}

// 전역으로 노출
window.downloadFile = downloadFile;

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    fetchSubtitles();
    
    // 사용자 인증 상태 확인
    onAuthStateChanged(auth, (user) => {
        const userInfo = document.getElementById('user-info');
        if (user) {
            const nickname = user.displayName || user.email?.split('@')[0] || '사용자';
            userInfo.innerHTML = `
                <span style="font-weight:700;color:var(--primary-color);">${nickname}</span>
                <button onclick="firebase.auth().signOut(); location.reload();" 
                    style="padding:0.3rem 0.8rem;background:white;color:var(--primary-color);border:2px solid var(--primary-color);border-radius:6px;font-weight:700;cursor:pointer;font-size:0.85rem;">
                    로그아웃
                </button>
            `;
        } else {
            userInfo.innerHTML = `
                <a href="auth.html" style="padding:0.4rem 1rem;background:var(--primary-color);color:white;border-radius:6px;font-weight:700;text-decoration:none;font-size:0.85rem;">
                    로그인
                </a>
            `;
        }
    });
});
