import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let currentUser = null;
let userRole = 'member';
let allDocuments = [];
let categoryOrders = {};
let characterOrders = {};

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const info = document.getElementById('user-info');
    
    if (user) {
        if (info) {
            info.innerHTML = `
                <span style="color:white; font-size:12px; margin-right:10px;">${user.displayName || user.email.split('@')[0]}님</span>
                <a href="#" id="logout-btn" style="color:white; font-size:12px; text-decoration:none; border:1px solid rgba(255,255,255,0.3); padding:2px 5px; border-radius:3px;">로그아웃</a>
            `;
            document.getElementById('logout-btn').onclick = (e) => {
                e.preventDefault();
                if (confirm("로그아웃하시겠습니까?")) {
                    auth.signOut().then(() => location.href = 'index.html');
                }
            };
        }

        // 관리자 권한 확인
        if (user.email === "hodu@youshouyan.wiki") {
            userRole = 'admin';
        }
        
        try {
            const userRes = await fetch(`/api/user/${user.uid}`);
            const userData = await userRes.json();
            if (userData.role === 'admin') userRole = 'admin';
        } catch (e) {
            console.error('권한 확인 오류:', e);
        }

        if (userRole !== 'admin') {
            document.body.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; text-align: center;">
                    <h1 style="font-size: 3rem; font-weight: 900; color: #dc2626;">403</h1>
                    <h2 style="margin-top: 1rem;">관리자 권한이 필요합니다</h2>
                    <p style="color: #666; margin-top: 0.5rem;">이 페이지는 관리자만 접근할 수 있습니다.</p>
                    <a href="index.html" style="margin-top: 2rem; padding: 0.8rem 2rem; background: var(--primary-color); color: white; text-decoration: none; border-radius: 6px; font-weight: 700;">홈으로 돌아가기</a>
                </div>
            `;
            return;
        }

        // 관리자인 경우 데이터 로드
        await loadData();
    } else {
        if (info) {
            info.innerHTML = `<a href="auth.html" class="nav-link" style="color:white; text-decoration:none; font-size:12px; border:1px solid rgba(255,255,255,0.3); padding:2px 5px; border-radius:3px;">로그인</a>`;
        }
        location.href = 'auth.html';
    }
});

async function loadData() {
    try {
        // 모든 문서 로드
        const response = await fetch('/api/images');
        allDocuments = await response.json();
        
        // 순서 정보 로드
        const orderResponse = await fetch('/api/order');
        if (orderResponse.ok) {
            const orderData = await orderResponse.json();
            categoryOrders = orderData.categoryOrders || {};
            characterOrders = orderData.characterOrders || {};
        }
        
        renderCategoryList();
        setupCategorySelector();
    } catch (e) {
        console.error('데이터 로드 실패:', e);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

function renderCategoryList() {
    const categoryList = document.getElementById('category-list');
    
    // 모든 카테고리 추출 및 중복 제거
    const categories = [...new Set(allDocuments.map(doc => doc.category).filter(c => c))];
    
    // 순서 정보가 있으면 그에 따라 정렬, 없으면 기본 순서
    const sortedCategories = categories.sort((a, b) => {
        const orderA = categoryOrders[a] !== undefined ? categoryOrders[a] : 999;
        const orderB = categoryOrders[b] !== undefined ? categoryOrders[b] : 999;
        return orderA - orderB;
    });
    
    categoryList.innerHTML = sortedCategories.map((category, index) => {
        const count = allDocuments.filter(doc => doc.category === category).length;
        return `
            <li class="draggable-item" data-category="${category}" draggable="true">
                <div class="item-info">
                    <span class="drag-handle">☰</span>
                    <span class="item-order">${index + 1}</span>
                    <span class="item-name">${category}</span>
                    <span class="item-count">(${count}개)</span>
                </div>
            </li>
        `;
    }).join('');
    
    setupDragAndDrop('category-list');
}

function setupCategorySelector() {
    const selector = document.getElementById('category-selector');
    const categories = [...new Set(allDocuments.map(doc => doc.category).filter(c => c))];
    
    // 순서대로 정렬
    const sortedCategories = categories.sort((a, b) => {
        const orderA = categoryOrders[a] !== undefined ? categoryOrders[a] : 999;
        const orderB = categoryOrders[b] !== undefined ? categoryOrders[b] : 999;
        return orderA - orderB;
    });
    
    selector.innerHTML = '<option value="">선택...</option>' + 
        sortedCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    
    selector.addEventListener('change', (e) => {
        if (e.target.value) {
            renderCharacterList(e.target.value);
        } else {
            document.getElementById('character-list').innerHTML = '<li style="text-align: center; color: #868e96; padding: 2rem;">카테고리를 선택하세요</li>';
            document.getElementById('save-character-order').style.display = 'none';
        }
    });
}

function renderCharacterList(category) {
    const characterList = document.getElementById('character-list');
    const saveBtn = document.getElementById('save-character-order');
    
    // 해당 카테고리의 캐릭터 필터링
    const characters = allDocuments.filter(doc => doc.category === category);
    
    if (characters.length === 0) {
        characterList.innerHTML = '<li style="text-align: center; color: #868e96; padding: 2rem;">이 카테고리에 캐릭터가 없습니다</li>';
        saveBtn.style.display = 'none';
        return;
    }
    
    // 순서 정보가 있으면 그에 따라 정렬
    const orders = characterOrders[category] || {};
    const sortedCharacters = characters.sort((a, b) => {
        const orderA = orders[a.title] !== undefined ? orders[a.title] : 999;
        const orderB = orders[b.title] !== undefined ? orders[b.title] : 999;
        return orderA - orderB;
    });
    
    characterList.innerHTML = sortedCharacters.map((char, index) => `
        <li class="draggable-item" data-title="${char.title}" data-category="${category}" draggable="true">
            <div class="item-info">
                <span class="drag-handle">☰</span>
                <span class="item-order">${index + 1}</span>
                <span class="item-name">${char.name || char.title}</span>
            </div>
        </li>
    `).join('');
    
    saveBtn.style.display = 'block';
    setupDragAndDrop('character-list');
}

function setupDragAndDrop(listId) {
    const list = document.getElementById(listId);
    const items = list.querySelectorAll('.draggable-item');
    
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            items.forEach(i => i.classList.remove('drag-over'));
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = list.querySelector('.dragging');
            const siblings = [...list.querySelectorAll('.draggable-item:not(.dragging)')];
            
            const nextSibling = siblings.find(sibling => {
                const box = sibling.getBoundingClientRect();
                return e.clientY < box.top + box.height / 2;
            });
            
            if (nextSibling) {
                list.insertBefore(dragging, nextSibling);
            } else {
                list.appendChild(dragging);
            }
        });
    });
    
    // 순서 번호 업데이트
    updateOrderNumbers(listId);
}

function updateOrderNumbers(listId) {
    const items = document.querySelectorAll(`#${listId} .draggable-item`);
    items.forEach((item, index) => {
        const orderSpan = item.querySelector('.item-order');
        if (orderSpan) orderSpan.textContent = index + 1;
    });
}

// 카테고리 순서 저장
document.getElementById('save-category-order').addEventListener('click', async () => {
    const items = document.querySelectorAll('#category-list .draggable-item');
    const newOrders = {};
    
    items.forEach((item, index) => {
        const category = item.dataset.category;
        newOrders[category] = index;
    });
    
    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'category',
                orders: newOrders,
                secret: '9889'
            })
        });
        
        if (response.ok) {
            categoryOrders = newOrders;
            showStatus('category-status', '카테고리 순서가 저장되었습니다!', 'success');
            setupCategorySelector(); // 셀렉터 업데이트
        } else {
            throw new Error('저장 실패');
        }
    } catch (e) {
        console.error('저장 오류:', e);
        showStatus('category-status', '저장에 실패했습니다.', 'error');
    }
});

// 캐릭터 순서 저장
document.getElementById('save-character-order').addEventListener('click', async () => {
    const categorySelector = document.getElementById('category-selector');
    const category = categorySelector.value;
    
    if (!category) return;
    
    const items = document.querySelectorAll('#character-list .draggable-item');
    const newOrders = {};
    
    items.forEach((item, index) => {
        const title = item.dataset.title;
        newOrders[title] = index;
    });
    
    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'character',
                category: category,
                orders: newOrders,
                secret: '9889'
            })
        });
        
        if (response.ok) {
            if (!characterOrders[category]) characterOrders[category] = {};
            characterOrders[category] = newOrders;
            showStatus('character-status', `"${category}" 카테고리의 캐릭터 순서가 저장되었습니다!`, 'success');
        } else {
            throw new Error('저장 실패');
        }
    } catch (e) {
        console.error('저장 오류:', e);
        showStatus('character-status', '저장에 실패했습니다.', 'error');
    }
});

function showStatus(elementId, message, type) {
    const statusEl = document.getElementById(elementId);
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    
    setTimeout(() => {
        statusEl.className = 'status-message';
    }, 3000);
}
