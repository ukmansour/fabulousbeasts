import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { CHARACTERS } from './data.js';

const epList = document.getElementById('episode-list');
const videoFrame = document.getElementById('main-video');
const displayTitle = document.getElementById('display-title');
const displayDesc = document.getElementById('display-desc');
const seasonSelect = document.getElementById('season-select');

// 헤더 검색바 작동을 위해 추가
const input = document.getElementById('global-search');
const results = document.getElementById('search-results');
if (input) {
    input.oninput = () => {
        const val = input.value.trim().toLowerCase();
        if (val.length < 1) { results.classList.remove('active'); return; }
        const matches = CHARACTERS.filter(c => c.name.toLowerCase().includes(val) || c.id.toLowerCase().includes(val)).slice(0, 8);
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

const EPISODES = {
    "1": [
        { num: 1, title: "제1화: 비휴 강림", vid: "bS6q_WlW_Y8" },
        { num: 2, title: "제2화: 달토끼와의 만남", vid: "bS6q_WlW_Y8" },
        { num: 3, title: "제3화: 녹인점의 하루", vid: "bS6q_WlW_Y8" },
        { num: 4, title: "제4화: 기억의 파편", vid: "bS6q_WlW_Y8" },
        { num: 5, title: "제5화: 새로운 신수", vid: "bS6q_WlW_Y8" },
        { num: 6, title: "제6화: 운남산의 비밀", vid: "bS6q_WlW_Y8" }
    ],
    "2": [
        { num: 13, title: "제13화: 벽사의 등장", vid: "bS6q_WlW_Y8" },
        { num: 14, title: "제14화: 형제 싸움", vid: "bS6q_WlW_Y8" }
    ],
    "3": [
        { num: 25, title: "제25화: 천상의 부름", vid: "bS6q_WlW_Y8" }
    ]
};

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
    videoFrame.src = `https://www.youtube.com/embed/${ep.vid}?autoplay=1`;
    displayTitle.textContent = ep.title;
    displayDesc.textContent = `${ep.num}화 에피소드입니다. 유수언의 세계를 감상하세요.`;
}

seasonSelect.onchange = (e) => renderEpisodes(e.target.value);
renderEpisodes("1");
