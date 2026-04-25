import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const epList = document.getElementById('episode-list');
const videoFrame = document.getElementById('main-video');
const displayTitle = document.getElementById('display-title');
const displayDesc = document.getElementById('display-desc');
const seasonSelect = document.getElementById('season-select');

// 유저 상태 관리
onAuthStateChanged(auth, (user) => {
    const info = document.getElementById('user-info');
    if (user && info) {
        info.innerHTML = `<span style="color:white; font-size:0.75rem; margin-right:0.4rem;">${user.displayName || '유저'}님</span>
                          <a href="#" class="nav-link" id="logout-btn">로그아웃</a>`;
        document.getElementById('logout-btn').onclick = (e) => {
            e.preventDefault();
            if (confirm("로그아웃하시겠습니까?")) signOut(auth).then(() => location.reload());
        };
    }
});

const EPISODES = {
    "1": Array.from({length: 12}, (_, i) => ({ num: i + 1, title: `시즌 1 - 제 ${i+1}화`, vid: "bS6q_WlW_Y8" })), // 실제 유튜브 ID로 교체 필요
    "2": Array.from({length: 12}, (_, i) => ({ num: i + 13, title: `시즌 2 - 제 ${i+1}화`, vid: "bS6q_WlW_Y8" })),
    "3": Array.from({length: 12}, (_, i) => ({ num: i + 25, title: `시즌 3 - 제 ${i+1}화`, vid: "bS6q_WlW_Y8" }))
};

function renderEpisodes(season) {
    epList.innerHTML = '';
    const eps = EPISODES[season];
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
    displayDesc.textContent = `${ep.num}화 에피소드입니다. 즐겁게 감상하세요!`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

seasonSelect.onchange = (e) => renderEpisodes(e.target.value);

// 초기화
renderEpisodes("1");
