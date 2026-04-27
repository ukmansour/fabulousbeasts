import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
        results.innerHTML = matches.map(m => `<div class="search-item" onclick="location.href='detail.html#${m.id}'">${m.name}</div>`).join('');
        results.classList.add('active');
    };
}

onAuthStateChanged(auth, (user) => {
    const info = document.getElementById('user-info');
    if (user && info) {
        info.innerHTML = `<span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName || '유저'}님</span>
                          <a href="#" class="nav-link" id="logout-btn">로그아웃</a>`;
        document.getElementById('logout-btn').onclick = (e) => {
            e.preventDefault();
            if (confirm("로그아웃하시겠습니까?")) signOut(auth).then(() => location.href = 'index.html');
        };
    }
});

const KNOWN_TITLES = {
    1: "비휴가 왔다", 2: "속세에 온 사불상", 3: "금각과 은각의 등장", 4: "금각과 은각의 과거",
    5: "멀리서 온 토끼", 6: "피피 쓰다듬기", 7: "혼혈 왕자", 8: "보석을 토해내는 토끼",
    9: "변화무쌍 보석", 10: "흉수의 습격", 11: "선초를 찾아서", 12: "돌아온 친구들",
    13: "동굴의 비밀", 14: "사불상의 진짜 모습", 15: "불면증에 걸린 체청", 16: "저승 여행",
    17: "은각의 가출", 18: "은각 찾아 삼만리", 19: "전호가 나타났다", 20: "수박 대전",
    21: "토야의 어린 시절", 22: "친구들의 건강 검진", 23: "즐거운 와묘네", 24: "녹인점 운동회",
    25: "벽사의 등장", 26: "상고편(1), 제강과의 첫 만남", 27: "상고편(2), 혼돈과의 만남", 28: "봉황의 콘서트",
    29: "사랑의 전쟁", 30: "길 잃은 이나리 후쿠", 31: "택배 왔어요", 32: "석굴 탐험기",
    33: "공항에서 배웅하기", 34: "다람쥐 가족", 35: "상고편(3), 금오가 집에 왔어요", 36: "상고편(4), 겨울이 왔어요",
    37: "기린의 알 부화", 38: "상고편(1), 사불상과의 첫 만남", 39: "상고편(2), 형제의 재회", 40: "벽사의 밤 여행기",
    41: "소루의 탄생", 42: "저승의 대위기", 43: "상고편(3), 흉수들의 횡포", 44: "상고편(4), 친구 찾기 여행",
    45: "의부로 모시기", 46: "사불상과 낚시하기", 47: "상고편(5), 옛집에서 재회", 48: "상고편(6), 친구들아, 잘 있어",
    49: "산신이 왔다", 50: "분노한 추구", 51: "영혼 체인지", 52: "국제 회담",
    53: "신조의 비밀", 54: "비익조의 다툼", 55: "피피의 새로운 뿔", 56: "묘왕 쟁패", 57: "달나라 여행"
};

const EPISODES = {};
for (let s = 1; s <= 6; s++) {
    EPISODES[s.toString()] = [];
    for (let e = 1; e <= 12; e++) {
        const globalNum = (s - 1) * 12 + e;
        const subTitle = KNOWN_TITLES[globalNum] || `에피소드 ${e}`;
        const title = `제${globalNum}화: ${subTitle}`;
        EPISODES[s.toString()].push({ num: globalNum, title: title });
    }
}

function renderEpisodes(season) {
    epList.innerHTML = '';
    const eps = EPISODES[season] || [];
    eps.forEach(ep => {
        const item = document.createElement('div');
        item.className = 'ep-item';
        item.innerHTML = `<span class="ep-num">${ep.num}화</span><span class="ep-title">${ep.title}</span>`;
        item.onclick = () => {
            document.querySelectorAll('.ep-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            playVideo(ep);
        };
        epList.appendChild(item);
    });
}

function playVideo(ep) {
    // 사용자가 지정한 정확한 인코딩 형식 적용: 번호 + %ED%99%94 + .mp4
    const videoUrl = `https://media.fabulousbeasts.kr/${ep.num}%ED%99%94.mp4`;
    
    console.log("재생 요청 URL:", videoUrl);
    
    videoFrame.src = videoUrl;
    videoFrame.load();
    
    // 재생 시도 (사용자 클릭 이벤트 안이므로 자동 재생 차단에 걸리지 않음)
    videoFrame.play().catch(err => {
        console.error("재생 실패:", err);
    });

    displayTitle.textContent = ep.title;
    displayDesc.textContent = `${ep.num}화 에피소드입니다. 즐겁게 감상하세요.`;
}

seasonSelect.onchange = (e) => renderEpisodes(e.target.value);
renderEpisodes("1");
