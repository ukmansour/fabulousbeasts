// 게시글 태그 시스템
export const TAG_PRESETS = {
    'discussion': { label: '토론', class: 'tag-discussion' },
    'question': { label: '질문', class: 'tag-question' },
    'fanart': { label: '팬아트', class: 'tag-fanart' },
    'notice': { label: '공지', class: 'tag-notice' },
    'episode': { label: '에피소드', class: 'tag-episode' }
};

// 태그 HTML 생성
export function renderTags(tags) {
    if (!tags || tags.length === 0) return '';
    
    return `
        <div class="post-tags">
            ${tags.map(tag => {
                const preset = TAG_PRESETS[tag] || { label: tag, class: '' };
                return `<span class="post-tag ${preset.class}" data-tag="${tag}">${preset.label}</span>`;
            }).join('')}
        </div>
    `;
}

// 제목에서 태그 추출 (예: "[토론] 제목" => ["discussion"])
export function extractTagsFromTitle(title) {
    const tags = [];
    const match = title.match(/^\[(.*?)\]/);
    
    if (match) {
        const tagText = match[1].toLowerCase();
        
        if (tagText.includes('토론') || tagText.includes('discussion')) tags.push('discussion');
        if (tagText.includes('질문') || tagText.includes('question')) tags.push('question');
        if (tagText.includes('팬아트') || tagText.includes('fanart')) tags.push('fanart');
        if (tagText.includes('공지') || tagText.includes('notice')) tags.push('notice');
        if (tagText.includes('에피소드') || tagText.includes('episode')) tags.push('episode');
    }
    
    return tags;
}

// 태그를 이용한 게시글 필터링
export function filterPostsByTag(posts, tag) {
    if (!tag || tag === 'all') return posts;
    
    return posts.filter(post => {
        if (post.tags && post.tags.includes(tag)) return true;
        
        // 제목에서 태그 추출
        const extractedTags = extractTagsFromTitle(post.title);
        return extractedTags.includes(tag);
    });
}

console.log('태그 시스템 초기화 완료');
