import { db, auth, getDocSafe } from './firebase-config.js';
import { doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS } from './data.js';

// URL 처리
const fullHash = decodeURIComponent(location.hash.substring(1));
const isGalleryPage = fullHash.endsWith('/갤러리');
const charId = isGalleryPage ? fullHash.replace('/갤러리', '') : fullHash;

const contentArea = document.getElementById('wiki-content');
const infoboxArea = document.getElementById('infobox-wrap');
const tocWrapper = document.getElementById('wiki-toc');
const editBtn = document.getElementById('go-edit');
const displayNameArea = document.getElementById('display-name');

let currentGallery = [];
let currentUser = null;
let userRole = 'member';
let isUserAdmin = false;

// 권한 확인 및 마스터 관리자 예외 처리
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    userRole = 'member';
    isUserAdmin = false;
    const info = document.getElementById('user-info');

    if (user) {
        if (user.email === "hodu@youshouyan.wiki") {
            userRole = 'admin';
            isUserAdmin = true;
        }

        try {
            const userSnap = await getDocSafe(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.role === 'admin') {
                    userRole = 'admin';
                    isUserAdmin = true;
                } else if (userData.role === 'banned') {
                    alert("계정이 차단되었습니다.");
                    document.body.innerHTML = '<div style="padding:50px; text-align:center;"><h1>접근 제한됨</h1></div>';
                    return;
                }
            }
        } catch (e) { console.error("Firestore role check error:", e); }

        if (info) {
            info.innerHTML = `
                ${isUserAdmin ? `<a href="admin.html" class="nav-link" style="border:1px solid white; padding:2px 5px; border-radius:3px; margin-right:10px;">관리자</a>` : ''}
                <span style="color:white; font-size:12px;">${user.displayName || user.email.split('@')[0]}님</span>
                <a href="#" id="logout-btn" style="color:white; font-size:12px; margin-left:10px; text-decoration:none;">로그아웃</a>
            `;
            document.getElementById('logout-btn').onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) {
                    auth.signOut().then(() => location.reload());
                }
            };
        }
    } else {
        if (info) {
            info.innerHTML = `<a href="auth.html" class="nav-link" style="color:white; text-decoration:none; font-size:12px;">로그인</a>`;
        }
    }
    updateEditVisibility();
});

function updateEditVisibility() {
    if (editBtn) {
        editBtn.style.display = isUserAdmin ? 'inline-block' : 'none';
        editBtn.style.opacity = '1';
        if (isUserAdmin) {
            editBtn.href = `edit.html#${charId}`;
        } else {
            editBtn.href = '#';
        }
    }
}

if (editBtn) {
    editBtn.onclick = (e) => {
        e.preventDefault();
        if (!currentUser) { 
            alert("편집을 위해 로그인이 필요합니다."); 
            location.href = 'auth.html'; 
        } else if (!isUserAdmin) { 
            alert("🔒 관리자 권한이 필요합니다."); 
        } else { 
            location.href = `edit.html#${charId}`; 
        }
    };
}

async function loadDetail() {
    if (!charId) return;
    const pageTitle = isGalleryPage ? `${charId} (갤러리)` : charId;
    if (displayNameArea) displayNameArea.textContent = pageTitle;
    document.title = `${pageTitle} - 유수언`;

    const baseData = CHARACTERS.find(c => c.id === charId) || { id: charId, name: charId };
    
    // 로컬 데이터를 이용해 화면을 즉시 렌더링
    renderPage(baseData);
    
    // D1 데이터 로드
    try {
        console.log("Loading D1 doc:", charId);
        const response = await fetch(`/api/wiki/${encodeURIComponent(charId)}`);
        
        if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const dbData = await response.json();
                console.log("D1 data received:", dbData);
                
                const dbName = dbData.name || (baseData.name !== charId ? baseData.name : "");
                let utcSeconds = null;
                if (dbData.updated_at) {
                    const utcDateStr = dbData.updated_at.replace(' ', 'T') + (dbData.updated_at.endsWith('Z') ? '' : 'Z');
                    utcSeconds = Math.floor(new Date(utcDateStr).getTime() / 1000);
                }
                const data = { 
                    ...baseData, 
                    name: dbName,
                    details: dbData.content || baseData.details,
                    author: dbData.author || baseData.author,
                    category: dbData.category || baseData.category,
                    species: dbData.species || baseData.species,
                    nation: dbData.nation || baseData.nation,
                    alias: dbData.alias || baseData.alias,
                    birthday: dbData.birthday || baseData.birthday,
                    image: dbData.image || baseData.image,
                    gallery: dbData.gallery ? (typeof dbData.gallery === 'string' ? JSON.parse(dbData.gallery) : dbData.gallery) : (baseData.gallery || []),
                    customInfo: dbData.custom_info ? (typeof dbData.custom_info === 'string' ? JSON.parse(dbData.custom_info) : dbData.custom_info) : [],
                    updatedAt: utcSeconds ? { seconds: utcSeconds } : baseData.updatedAt,
                    updatedBy: dbData.author
                };
                
                const nameToDisplay = data.name || charId;
                const finalTitle = isGalleryPage ? `${nameToDisplay} (갤러리)` : nameToDisplay;
                if (displayNameArea) displayNameArea.textContent = finalTitle;
                document.title = `${finalTitle} - 유수언`;
                renderPage(data);
            } else {
                console.warn("Expected JSON but received:", contentType);
                renderPage(baseData);
            }
        } else if (response.status === 404) {
            console.log("D1 data not found (404). Showing no-document notice.");
            renderNoDocumentNotice(charId);
        } else {
            console.log("D1 error, using base data.");
            renderPage(baseData);
        }
    } catch (err) {
        console.error("D1 loading error:", err);
    }

    renderRecentChanges();
}

function renderPage(data) {
    const lastEditEl = document.getElementById('last-edit');
    const lastEditorEl = document.getElementById('last-editor');
    
    if (data.updatedAt) {
        const date = new Date(data.updatedAt.seconds * 1000);
        if (lastEditEl) lastEditEl.textContent = date.toLocaleString('ko-KR');
    }
    if (lastEditorEl) lastEditorEl.textContent = data.updatedBy || '익명';

    if (isGalleryPage) {
        renderGalleryOnlyPage(data);
    } else {
        renderNormalDetailPage(data);
    }
}

function renderNormalDetailPage(data) {
    renderInfobox(data);
    renderContent(data.details || '문서가 비어있습니다.');
}

function renderGalleryOnlyPage(data) {
    if (infoboxArea) infoboxArea.innerHTML = '';
    if (tocWrapper) tocWrapper.style.display = 'none';
    
    const gallery = data.gallery || [];
    let html = `
        <div style="margin-bottom:20px; padding:10px; background:#f8f9fa; border-radius:4px; border:1px solid #eee;">
            <a href="#${charId}" style="color:var(--primary-color); font-weight:bold; text-decoration:none;">← ${charId} 본문으로 돌아가기</a>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:15px; margin-top:20px;">
    `;
    
    if (gallery.length > 0) {
        gallery.forEach((url) => {
            html += `
                <div style="aspect-ratio:1/1; border:1px solid #ddd; border-radius:8px; overflow:hidden; cursor:pointer;" onclick="window.showLarge('${url}')">
                    <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            `;
        });
    } else {
        html += `<p style="grid-column:1/-1; padding:50px; text-align:center; color:#999;">등록된 사진이 없습니다.</p>`;
    }
    
    html += `</div>`;
    if (contentArea) contentArea.innerHTML = html;
}

function parseBirthday(birthdayStr) {
    if (!birthdayStr) return null;
    let match = birthdayStr.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
        return { month: parseInt(match[2], 10), day: parseInt(match[3], 10) };
    }
    match = birthdayStr.match(/(\d{1,2})[-/.](\d{1,2})/);
    if (match) {
        return { month: parseInt(match[1], 10), day: parseInt(match[2], 10) };
    }
    match = birthdayStr.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (match) {
        return { month: parseInt(match[1], 10), day: parseInt(match[2], 10) };
    }
    return null;
}

function getNextBirthdayInfo(month, day) {
    const today = new Date();
    const currentYear = today.getFullYear();
    let bday = new Date(currentYear, month - 1, day);
    
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const bdayZero = new Date(bday.getFullYear(), bday.getMonth(), bday.getDate());
    
    if (bdayZero < todayZero) {
        bday = new Date(currentYear + 1, month - 1, day);
    }
    
    const diffTime = bday.getTime() - todayZero.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
        nextDate: bday,
        daysLeft: diffDays,
        isToday: diffDays === 0
    };
}

function renderInfobox(data) {
    if (!infoboxArea || isGalleryPage) return;
    const gallery = data.gallery || [];
    
    const galleryHTML = gallery.length > 0 ? `
        <div class="wiki-gallery-wrap" style="margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <strong style="font-size:12px; color:#555;">갤러리 (${gallery.length}장)</strong>
                <a href="#${charId}/갤러리" style="font-size:11px; color:var(--primary-color); text-decoration:none;">전체보기 ></a>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:5px;">
                ${gallery.slice(0, 4).map(url => `
                    <div style="aspect-ratio:1/1; border-radius:4px; overflow:hidden; cursor:pointer;" onclick="window.showLarge('${url}')">
                        <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    infoboxArea.innerHTML = `
        <div class="infobox" style="position:relative; z-index:10;">
            <div style="background:var(--primary-color); color:white; padding:8px; text-align:center; font-weight:800; font-size:1rem;">${data.name || charId}</div>
            <div style="padding:10px; text-align:center; border-bottom:1px solid #eee;" onclick="window.showLarge('${data.image}')">
                <img src="${data.image || 'https://via.placeholder.com/300x400?text=No+Image'}" style="max-width:100%; cursor:zoom-in;">
            </div>
            <div style="padding:10px;">
                <table style="width:100%; font-size:13px; border-collapse:collapse;">
                    ${data.alias ? `<tr><th style="background:#f4f4f4; width:35%; padding:5px; border:1px solid #eee; text-align:left;">별명</th><td style="padding:5px; border:1px solid #eee;">${data.alias}</td></tr>` : ''}
                    ${data.species ? `<tr><th style="background:#f4f4f4; padding:5px; border:1px solid #eee; text-align:left;">종족</th><td style="padding:5px; border:1px solid #eee;">${data.species}</td></tr>` : ''}
                    ${data.nation ? `<tr><th style="background:#f4f4f4; padding:5px; border:1px solid #eee; text-align:left;">국적</th><td style="padding:5px; border:1px solid #eee;">${data.nation}</td></tr>` : ''}
                    ${(() => {
                        if (!data.birthday) return '';
                        const parsed = parseBirthday(data.birthday);
                        let birthdayHtml = `<tr><th style="background:#f4f4f4; padding:5px; border:1px solid #eee; text-align:left;">생일</th><td style="padding:5px; border:1px solid #eee;">${data.birthday}`;
                        if (parsed) {
                            const info = getNextBirthdayInfo(parsed.month, parsed.day);
                            const nextDateStr = `${info.nextDate.getFullYear()}년 ${info.nextDate.getMonth() + 1}월 ${info.nextDate.getDate()}일`;
                            if (info.isToday) {
                                birthdayHtml += `<br><span style="color:#d6336c; font-weight:bold; font-size:12px; display:inline-block; margin-top:4px; animation: pulse 1.5s infinite;">🎂 오늘 생일입니다! 🎉 (D-Day)</span>`;
                            } else {
                                birthdayHtml += `<br><span style="color:#666; font-size:11px; display:inline-block; margin-top:4px;">다음 생일: ${nextDateStr}<br>(D-${info.daysLeft})</span>`;
                            }
                        }
                        birthdayHtml += `</td></tr>`;
                        return birthdayHtml;
                    })()}
                    ${data.customInfo && Array.isArray(data.customInfo) ? data.customInfo.map(field => `<tr><th style="background:#f4f4f4; padding:5px; border:1px solid #eee; text-align:left;">${field.key.replace(/</g, '&lt;')}</th><td style="padding:5px; border:1px solid #eee;">${applyInline(field.value)}</td></tr>`).join('') : ''}
                </table>
                ${galleryHTML}
            </div>
        </div>
    `;
}

function applyInline(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<u>$1</u>')
        .replace(/~~(.*?)~~/g, '<s>$1</s>')
        .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        .replace(/\[color=(.*?)\](.*?)\[\/color\]/g, '<span style="color:$1">$2</span>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:500px; border-radius:8px; display:block; margin:20px auto;">')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
        .replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
            const parts = p1.split('/');
            if (parts.length > 1) {
                // [변경] [[문서제목/표시이름]] -> parts[0]이 제목, parts[1]이 표시이름
                return `<a href="detail.html#${encodeURIComponent(parts[0].trim())}">${parts[1].trim()}</a>`;
            }
            return `<a href="detail.html#${encodeURIComponent(p1.trim())}">${p1.trim()}</a>`;
        });
}

function renderContent(details) {
    if (!contentArea || isGalleryPage) return;

    const lines = details.replace(/\r\n/g, '\n').split('\n');
    let html = '', inP = false, inUl = false, inTable = false, inBq = false;
    const closeP   = () => { if (inP)     { html += '</p>';              inP     = false; } };
    const closeUl  = () => { if (inUl)    { html += '</ul>';             inUl    = false; } };
    const closeTbl = () => { if (inTable) { html += '</tbody></table>';  inTable = false; } };
    const closeBq  = () => { if (inBq)    { html += '</blockquote>';     inBq    = false; } };
    const closeAll = () => { closeP(); closeUl(); closeTbl(); closeBq(); };

    for (const line of lines) {
        // 블록 태그 처리
        if (/^\[spoiler\]$/i.test(line.trim())) { closeAll(); html += '<details class="wiki-spoiler"><summary>스포일러 (클릭하여 펼치기)</summary><div class="spoiler-content">'; continue; }
        if (/^\[\/spoiler\]$/i.test(line.trim())) { closeAll(); html += '</div></details>'; continue; }
        if (/^\[center\]$/i.test(line.trim())) { closeAll(); html += '<div style="text-align:center">'; continue; }
        if (/^\[\/center\]$/i.test(line.trim())) { closeAll(); html += '</div>'; continue; }
        if (/^\[note\]$/i.test(line.trim())) { closeAll(); html += '<div class="wiki-callout wiki-callout-note">📌 <div>'; continue; }
        if (/^\[\/note\]$/i.test(line.trim())) { closeAll(); html += '</div></div>'; continue; }
        if (/^\[warn\]$/i.test(line.trim())) { closeAll(); html += '<div class="wiki-callout wiki-callout-warn">⚠️ <div>'; continue; }
        if (/^\[\/warn\]$/i.test(line.trim())) { closeAll(); html += '</div></div>'; continue; }

        // 빈 줄 → 단락 종료
        if (line.trim() === '') { closeAll(); continue; }

        // 제목
        if (line.startsWith('## '))  { closeAll(); html += `<h2>${applyInline(line.slice(3))}</h2>`; continue; }
        if (line.startsWith('### ')) { closeAll(); html += `<h3>${applyInline(line.slice(4))}</h3>`; continue; }

        // 구분선
        if (line === '---') { closeAll(); html += '<hr>'; continue; }

        // 인용구
        if (line.startsWith('> ')) {
            closeP(); closeUl(); closeTbl();
            if (!inBq) { html += '<blockquote class="wiki-quote">'; inBq = true; } else html += '<br>';
            html += applyInline(line.slice(2));
            continue;
        }

        // 표
        if (line.startsWith('|') && line.endsWith('|')) {
            closeP(); closeUl(); closeBq();
            const cells = line.slice(1, -1).split('|');
            if (cells.every(c => /^[-:]+$/.test(c.trim()))) continue; // 구분 행 무시
            if (!inTable) {
                html += '<table class="wiki-table"><thead><tr>';
                cells.forEach(c => { html += `<th>${applyInline(c.trim())}</th>`; });
                html += '</tr></thead><tbody>';
                inTable = true;
            } else {
                html += '<tr>';
                cells.forEach(c => { html += `<td>${applyInline(c.trim())}</td>`; });
                html += '</tr>';
            }
            continue;
        }

        // 리스트
        if (line.startsWith('* ')) {
            closeP(); closeTbl(); closeBq();
            if (!inUl) { html += '<ul>'; inUl = true; }
            html += `<li>${applyInline(line.slice(2))}</li>`;
            continue;
        }

        // 일반 텍스트
        closeUl(); closeTbl(); closeBq();
        if (!inP) { html += '<p>'; inP = true; html += applyInline(line); }
        else { html += '<br>' + applyInline(line); }
    }

    closeP(); closeUl(); closeTbl(); closeBq();
    contentArea.innerHTML = html;
    generateTOC();

}

function generateTOC() {
    if (!contentArea || !tocWrapper) return;
    const headers = contentArea.querySelectorAll('h2, h3');
    if (headers.length === 0) { tocWrapper.style.display = 'none'; return; }
    tocWrapper.style.display = 'block';
    const tocList = document.getElementById('toc-content');
    if (tocList) {
        tocList.innerHTML = '';
        headers.forEach((h, i) => {
            const id = `sec-${i}`;
            h.id = id;
            const li = document.createElement('div');
            li.style.paddingLeft = h.tagName === 'H3' ? '20px' : '0';
            li.innerHTML = `<a href="#${id}" style="text-decoration:none; color:var(--text-link); font-size:14px;">${h.textContent}</a>`;
            li.onclick = (e) => {
                e.preventDefault();
                window.scrollTo({ top: h.getBoundingClientRect().top + window.pageYOffset - 70, behavior: 'smooth' });
            };
            tocList.appendChild(li);
        });
    }
}

window.showLarge = (url) => {
    if (!url || url.includes('placeholder')) return;
    const overlay = document.createElement('div');
    overlay.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:zoom-out;';
    overlay.innerHTML = `<img src="${url}" style="max-width:95%; max-height:95%; object-fit:contain; border:2px solid white; box-shadow:0 0 20px rgba(0,0,0,0.5);">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
};

async function renderRecentChanges() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;
    try {
        const response = await fetch('/api/recent');
        if (!response.ok) return;
        const results = await response.json();
        
        list.innerHTML = results.map(d => {
            const date = d.updated_at ? new Date(d.updated_at.replace(' ', 'T') + (d.updated_at.endsWith('Z') ? '' : 'Z')).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
            return `
                <div style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #f0f0f0;">
                    <a href="detail.html#${d.title}" style="font-size:13px; color:var(--text-link); text-decoration:none; font-weight:700;">${d.title}</a>
                    <div style="font-size:11px; color:#999; margin-top:2px;">
                        <span>${d.author || '익명'}</span> | <span>${date}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch(e) {
        console.error("Recent changes load error:", e);
    }
}

function renderNoDocumentNotice(title) {
    if (infoboxArea) infoboxArea.innerHTML = '';
    if (tocWrapper) tocWrapper.style.display = 'none';
    if (contentArea) {
        contentArea.innerHTML = `
            <div style="text-align:center; padding:80px 20px; background:white; border-radius:16px; border:1px solid #eee; box-shadow:0 10px 30px rgba(0,0,0,0.03); margin-top:20px;">
                <div style="font-size:4rem; margin-bottom:20px;">📜</div>
                <h2 style="font-size:1.5rem; color:#333; margin-bottom:12px; font-weight:800;">"${title}" 문서가 아직 없습니다.</h2>
                <p style="color:#666; margin-bottom:30px; line-height:1.6;">
                    이 문서는 아직 작성되지 않았습니다.<br>
                    여러분의 지식으로 위키를 채워주세요!
                </p>
                <a href="edit.html#${encodeURIComponent(title)}" style="display:inline-block; padding:12px 30px; background:var(--primary-color); color:white; border-radius:8px; text-decoration:none; font-weight:bold; transition:transform 0.2s; box-shadow:0 4px 15px rgba(33, 150, 243, 0.3);">
                    새 문서 작성하기
                </a>
            </div>
        `;
    }
}

window.onhashchange = () => {
    // 무한 루프 방지: 현재 hash가 이전과 다를 때만 리로드
    location.reload();
};
loadDetail();
