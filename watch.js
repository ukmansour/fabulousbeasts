import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { CHARACTERS } from './data.js';

const epList = document.getElementById('episode-list');
const videoFrame = document.getElementById('main-video');
const displayTitle = document.getElementById('display-title');
const displayDesc = document.getElementById('display-desc');
const seasonSelect = document.getElementById('season-select');

// 헤더 검색바
const input = document.getElementById('global-search');
const results = document.getElementById('search-results');
if (input) {
    input.oninput = () => {
        const val = input.value.trim().toLowerCase();
        if (val.length < 1) { results.classList.remove('active'); return; }
        const matches = CHARACTERS.filter(c => (c.name||'').toLowerCase().includes(val) || c.id.toLowerCase().includes(val)).slice(0, 8);
        results.innerHTML = matches.map(m => `<a href="detail.html#${m.id}" class="search-item" style="display:block; text-decoration:none; color:inherit;">${m.name}</a>`).join('');
        results.classList.add('active');
    };
}

let currentUser = null;
let userRole = 'member';
let currentEpisodeNum = null;

onAuthStateChanged(auth, async (user) => {
    const info = document.getElementById('user-info');
    if (user) {
        currentUser = user;
        // [역할 확인]
        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                userRole = userData.role || 'member';
                console.log('애니보기 userRole:', userRole, 'uid:', user.uid);
                if (userRole === 'banned') {
                    alert("⚠️ 귀하의 계정은 차단되었습니다.");
                    document.body.innerHTML = `<div style="height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; background:#f8f9fa;">
                        <h1 style="color:#dc2626;">🚫 접근 차단됨</h1>
                        <button onclick="auth.signOut().then(() => location.reload())" style="margin-top:2rem; padding:0.8rem 2rem; background:#4b5563; color:white; border:none; border-radius:4px; cursor:pointer;">로그아웃</button>
                    </div>`;
                    return;
                }
            }
        } catch (e) { console.error(e); }

        if (info) {
            info.innerHTML = `<span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName || '유저'}님</span>
                              <a href="#" class="nav-link" id="logout-btn">로그아웃</a>`;
            document.getElementById('logout-btn').onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) signOut(auth).then(() => location.href = 'index.html');
            };
        }
    } else {
        currentUser = null;
        userRole = 'guest';
        if (info) {
            info.innerHTML = `<a href="login.html" class="nav-link">로그인</a>`;
        }
    }
    updateCommentForm();
    if (currentEpisodeNum) {
        loadComments(currentEpisodeNum);
    }
});

const KNOWN_TITLES = {
    1: "비휴가 왔다", 2: "속세에 온 사불상", 3: "금각과 은각의 등장", 4: "금각과 은각의 과거",
    5: "멀리서 온 토끼", 6: "피피 쓰다듬기", 7: "혼혈 왕자", 8: "보석을 토해내는 족제비",
    9: "변화무쌍 보석", 10: "흉수의 습격", 11: "선초를 찾아서", 12: "돌아온 친구들",
    13: "동굴의 비밀", 14: "사불상의 진짜 모습", 15: "불면증에 걸린 체청", 16: "저승 여행",
    17: "은각의 가출", 18: "은각 찾기", 19: "전호가 나타났다", 20: "수박 대전",
    21: "투예의 어린 시절", 22: "건강 검진", 23: "즐거운 와묘네", 24: "녹인점 운동회",
    25: "벽사의 등장", 26: "상고편(1), 제강과의 첫 만남", 27: "상고편(2), 혼돈과의 만남", 28: "봉황의 콘서트",
    29: "사랑의 전쟁", 30: "길 잃은 이나리 후쿠", 31: "택배 왔어요", 32: "석굴 탐험기",
    33: "공항에서 배웅하기", 34: "다람쥐 가족", 35: "상고편(3), 금오가 집에 왔어요", 36: "상고편(4), 겨울이 왔어요",
    37: "기린의 알 부화", 38: "상고편(1), 사불상과의 첫 만남", 39: "상고편(2), 형제의 재회", 40: "벽사의 밤 여행기",
    41: "소루의 탄생", 42: "저승의 대위기", 43: "상고편(3), 흉수들의 횡포", 44: "상고편(4), 친구 찾기 여행",
    45: "의부로 모시기", 46: "사불상과 낚시하기", 47: "상고편(5), 옛집에서 재회", 48: "상고편(6), 친구들아, 잘 있어",
    49: "산신이 왔다", 50: "분노한 추구", 51: "영혼 교환", 52: "국제 회담",
    53: "신조의 비밀", 54: "비익조의 다툼", 55: "피피의 새로운 뿔", 56: "묘왕 쟁패", 
    57: "달나라 여행", 58: "새로 온 선생님", 59: "도망친 토루", 60: "호두의 꿈",
    61: "엄마 찾기", 62: "청매죽마", 63: "", 64: "", 65: "", 66: "",
    67: "", 68: "", 69: "", 70: "", 71: "", 72: ""
};

const EPISODES = {};
// 한 시즌당 12화씩, 총 6개 시즌(72화) 생성
for (let s = 1; s <= 6; s++) {
    EPISODES[s.toString()] = [];
    for (let e = 1; e <= 12; e++) {
        const globalNum = (s - 1) * 12 + e;
        const subTitle = KNOWN_TITLES[globalNum] || `에피소드 ${e}`;
        const title = `제${globalNum}화: ${subTitle}`;
        EPISODES[s.toString()].push({ num: globalNum, title: title });
    }
}

function renderEpisodes(season, autoPlayFirst = false) {
    epList.innerHTML = '';
    const eps = EPISODES[season] || [];
    eps.forEach((ep, index) => {
        const item = document.createElement('div');
        item.className = 'ep-item';
        // 첫 번째 에피소드 기본 선택 처리
        if (index === 0) item.classList.add('active');
        item.innerHTML = `<span class="ep-num">${ep.num}화</span><span class="ep-title">${ep.title}</span>`;
        item.onclick = () => {
            document.querySelectorAll('.ep-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            playVideo(ep, true); // 클릭 시에는 재생
        };
        epList.appendChild(item);
    });

    // 목록이 렌더링될 때 첫 번째 에피소드를 로드만 하고 재생은 하지 않음
    if (eps.length > 0) {
        playVideo(eps[0], autoPlayFirst);
    }
}

function playVideo(ep, shouldPlay = false) {
    // 사용자가 지정한 정확한 인코딩 형식 적용: 번호 + %ED%99%94 + .mp4
    const videoUrl = `https://media.fabulousbeasts.kr/${ep.num}%ED%99%94.mp4`;
    
    console.log("비디오 로드 URL:", videoUrl);
    
    videoFrame.src = videoUrl;
    videoFrame.load();
    
    // shouldPlay가 true일 때만(사용자 클릭 등) 재생 시도
    if (shouldPlay) {
        videoFrame.play().catch(err => {
            console.error("재생 실패:", err);
        });
    }

    if (displayTitle) {
        displayTitle.textContent = ep.title;
    }
    if (displayDesc) {
        displayDesc.textContent = '';
    }
    
    currentEpisodeNum = ep.num;
    updateCommentForm(); // 에피소드 변경 시 댓글 입력창도 업데이트
    loadComments(ep.num);
}

async function loadComments(episodeNum) {
    if (!episodeNum) return;
    
    // 댓글 목록 조회
    try {
        const res = await fetch(`/api/comments?episode=${episodeNum}`);
        if (res.ok) {
            const comments = await res.json();
            document.getElementById('comments-count').textContent = comments.length;
            const commentsList = document.getElementById('comments-list');
            
            if (comments.length === 0) {
                commentsList.innerHTML = `<div style="padding: 2rem; text-align: center; color: #888; font-size: 0.95rem; background: #fafafa; border-radius: 8px; border: 1px dashed #eee;">첫 번째 댓글을 남겨보세요!</div>`;
                return;
            }

            commentsList.innerHTML = comments.map(c => {
                const date = new Date(c.created_at);
                const localDateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                
                const canDelete = currentUser && (c.uid === currentUser.uid || userRole === 'admin');
                
                return `
                    <div class="comment-item" style="padding: 1.2rem; border: 1px solid #f1f1f1; border-radius: 8px; background: white; display: flex; gap: 1rem; position: relative;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-light); color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem; flex-shrink: 0; border: 1.5px solid var(--border-color);">
                            ${(c.author || '유').substring(0, 1).toUpperCase()}
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem;">
                                <strong style="font-size: 0.9rem; color: #212529;">${c.author}</strong>
                                <span style="font-size: 0.75rem; color: #868e96;">${localDateStr}</span>
                            </div>
                            <p style="margin: 0; font-size: 0.9rem; color: #495057; line-height: 1.6; white-space: pre-wrap;">${c.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                        </div>
                        ${canDelete ? `
                            <button class="delete-comment-btn" data-id="${c.id}" style="align-self: flex-start; background: none; border: none; color: #e03131; cursor: pointer; font-size: 0.8rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: 4px; transition: background 0.2s;">삭제</button>
                        ` : ''}
                    </div>
                `;
            }).join('');

            // 삭제 버튼 이벤트 바인딩
            commentsList.querySelectorAll('.delete-comment-btn').forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm("정말 이 댓글을 삭제하시겠습니까?")) {
                        try {
                            const dres = await fetch('/api/comments/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: parseInt(id, 10), uid: currentUser.uid, role: userRole })
                            });
                            if (dres.ok) {
                                loadComments(episodeNum);
                            } else {
                                const err = await dres.json();
                                alert(`삭제 실패: ${err.error}`);
                            }
                        } catch (e) {
                            console.error(e);
                            alert("댓글 삭제 도중 오류가 발생했습니다.");
                        }
                    }
                };
            });
        }
    } catch (e) {
        console.error("댓글 조회 실패:", e);
    }
}

function updateCommentForm() {
    const wrap = document.getElementById('comment-form-wrap');
    if (!wrap) return;

    if (!currentUser) {
        wrap.innerHTML = `
            <div style="padding: 1.5rem; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; text-align: center; font-size: 0.9rem; color: #495057;">
                댓글은 <a href="auth.html" style="color: var(--primary-color); font-weight: 800; text-decoration: underline;">로그인</a> 후 이용하실 수 있습니다.
            </div>
        `;
        return;
    }

    wrap.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.8rem;">
            <textarea id="comment-input" placeholder="이 회차에 대한 따뜻한 댓글을 남겨보세요..." style="width: 100%; min-height: 80px; padding: 0.8rem; border: 1.5px solid #dee2e6; border-radius: 8px; font-family: inherit; font-size: 0.9rem; resize: vertical; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--primary-color)'" onblur="this.style.borderColor='#dee2e6'"></textarea>
            <div style="display: flex; justify-content: flex-end;">
                <button id="submit-comment-btn" style="background: var(--primary-color); color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 6px; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: background 0.2s;">등록</button>
            </div>
        </div>
    `;

    document.getElementById('submit-comment-btn').onclick = async () => {
        const textInput = document.getElementById('comment-input');
        const content = textInput.value.trim();
        if (!content) {
            alert("댓글 내용을 입력해 주세요.");
            return;
        }

        console.log('=== 댓글 제출 시작 ===');
        console.log('currentEpisodeNum:', currentEpisodeNum);
        console.log('currentUser:', currentUser);
        console.log('content:', content);

        if (!currentEpisodeNum) {
            alert("에피소드를 먼저 선택해 주세요.");
            return;
        }

        const payload = {
            episode_num: currentEpisodeNum,
            content: content,
            author: currentUser.displayName || currentUser.email?.split('@')[0] || '익명 유저',
            uid: currentUser.uid
        };

        console.log('전송 데이터:', payload);

        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('API 응답 상태:', res.status);

            if (res.ok) {
                textInput.value = '';
                loadComments(currentEpisodeNum);
            } else {
                const err = await res.json();
                console.error('댓글 등록 실패:', err);
                alert(`댓글 등록 실패: ${err.error}`);
            }
        } catch (e) {
            console.error('댓글 등록 오류:', e);
            alert("댓글 등록에 실패했습니다.");
        }
    };
}



seasonSelect.onchange = (e) => renderEpisodes(e.target.value, true); // 시즌 변경 시에는 첫 화 자동 재생
renderEpisodes("1", false); // 초기 로드 시에는 재생하지 않음
